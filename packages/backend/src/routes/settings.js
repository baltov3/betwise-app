import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Нормализация на държава (подобно на auth.js)
const COUNTRY_NAME_TO_ISO2 = {
  bulgaria: 'BG',
  romania: 'RO',
  greece: 'GR',
  germany: 'DE',
  france: 'FR',
  italy: 'IT',
  spain: 'ES',
  'united kingdom': 'GB',
  'great britain': 'GB',
  'united states': 'US',
  usa: 'US',
};
function normalizeCountry(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (raw.length === 2 && /^[a-zA-Z]{2}$/.test(raw)) return raw.toUpperCase();
  const mapped = COUNTRY_NAME_TO_ISO2[raw.toLowerCase()];
  return mapped || null;
}
const sanitizeStr = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);

// GET /api/settings – профил + preferences за текущия user
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        age: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        preferences: true,
        subscription: { select: { plan: true, status: true, endDate: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (e) {
    console.error('GET /settings error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/settings – частични ъпдейти + безопасно merge на preferences
router.patch(
  '/',
  authenticate,
  [
    // Важно: checkFalsy позволява "" да се игнорира при optional
    body('firstName').optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 100 }),
    body('lastName').optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 100 }),
    body('birthDate').optional({ checkFalsy: true }).isISO8601(),
    body('addressLine1').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
    body('addressLine2').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
    body('city').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('state').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('postalCode').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
    // приемаме и имена (Bulgaria), ще нормализираме
    body('country').optional({ checkFalsy: true }).isString().isLength({ min: 2 }),

    body('preferences').optional().isObject(),
    body('preferences.oddsFormat').optional({ checkFalsy: true }).isIn(['decimal', 'fractional', 'american']),
    body('preferences.defaultStake').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('preferences.favoriteSports').optional().isArray(),
    body('preferences.notifications').optional().isObject(),
    body('preferences.notifications.email').optional().isBoolean(),
    body('preferences.notifications.push').optional().isBoolean(),
    body('preferences.notifications.dailySummary').optional().isBoolean(),
    body('preferences.notifications.marketing').optional().isBoolean(),
     body('preferences.theme').optional({ checkFalsy: true }).isIn([ 'light', 'dark']),
    body('preferences.language').optional({ checkFalsy: true }).isString().isLength({ min: 2, max: 5 }),
    body('preferences.timeZone').optional({ checkFalsy: true }).isString(),
    body('preferences.currency').optional({ checkFalsy: true }).isIn(['EUR', 'USD', 'BGN']),
    body('preferences.publicProfile').optional().isBoolean(),
    body('preferences.showReferralPublic').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.warn('PATCH /settings validation errors:', errors.array());
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
      }

      let {
        firstName, lastName, birthDate,
        addressLine1, addressLine2, city, state, postalCode, country,
        preferences,
      } = req.body;

      // Санитизация на празни низове
      firstName = sanitizeStr(firstName);
      lastName = sanitizeStr(lastName);
      addressLine1 = sanitizeStr(addressLine1);
      addressLine2 = sanitizeStr(addressLine2);
      city = sanitizeStr(city);
      state = sanitizeStr(state);
      postalCode = sanitizeStr(postalCode);
      country = sanitizeStr(country);

      // Нормализираме държавата (BG/US/...)
      if (country) {
        const norm = normalizeCountry(country);
        country = norm || undefined;
      }

      const current = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { preferences: true },
      });
      if (!current) return res.status(404).json({ success: false, message: 'User not found' });

      // derive age ако birthDate е подаден
      let derivedAge = undefined;
      if (birthDate) {
        const d = new Date(birthDate);
        if (!Number.isNaN(d.getTime())) {
          const now = new Date();
          let age = now.getUTCFullYear() - d.getUTCFullYear();
          const m = now.getUTCMonth() - d.getUTCMonth();
          if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
          derivedAge = age;
        } else {
          birthDate = undefined;
        }
      }

      // Почистване на preferences от невалидни стойности (NaN, празни)
      if (preferences && typeof preferences === 'object') {
        const p = { ...preferences };
        if ('defaultStake' in p && !isFiniteNum(p.defaultStake)) delete p.defaultStake;
        if ('favoriteSports' in p && Array.isArray(p.favoriteSports)) {
          p.favoriteSports = p.favoriteSports.filter((s) => typeof s === 'string' && s.trim() !== '');
          if (p.favoriteSports.length === 0) delete p.favoriteSports;
        }
        if ('notifications' in p && typeof p.notifications === 'object' && p.notifications != null) {
          const n = p.notifications;
          const keys = ['email', 'push', 'dailySummary', 'marketing'];
          const hasAny = keys.some((k) => typeof n[k] === 'boolean');
          if (!hasAny) delete p.notifications;
        }
        preferences = p;
      }

      const newPreferences = preferences
        ? { ...(current.preferences || {}), ...preferences }
        : undefined;

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          firstName,
          lastName,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          age: derivedAge,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
          preferences: newPreferences,
        },
        select: {
          id: true, email: true, firstName: true, lastName: true, birthDate: true, age: true,
          addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, country: true,
          preferences: true,
        },
      });

      res.json({ success: true, data: updated });
    } catch (e) {
      console.error('PATCH /settings error:', e);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router