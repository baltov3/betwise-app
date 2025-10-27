import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/settings – текущ потребител
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
        stripeOnboardingComplete: true,
        stripePayoutsEnabled: true,
        stripeChargesEnabled: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (e) {
    console.error('GET /settings error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/settings – частичен ъпдейт
router.patch(
  '/',
  authenticate,
  [
    body('firstName').optional().isString().isLength({ min: 1, max: 100 }),
    body('lastName').optional().isString().isLength({ min: 1, max: 100 }),
    body('birthDate').optional().isISO8601(),
    body('addressLine1').optional().isString().isLength({ max: 200 }),
    body('addressLine2').optional().isString().isLength({ max: 200 }),
    body('city').optional().isString().isLength({ max: 100 }),
    body('state').optional().isString().isLength({ max: 100 }),
    body('postalCode').optional().isString().isLength({ max: 20 }),
    body('country').optional().isString().isLength({ max: 2 }), // ISO-2
    body('preferences').optional().isObject(),
    body('preferences.oddsFormat').optional().isIn(['decimal', 'fractional', 'american']),
    body('preferences.defaultStake').optional().isFloat({ min: 0 }),
    body('preferences.favoriteSports').optional().isArray(),
    body('preferences.notifications').optional().isObject(),
    body('preferences.notifications.email').optional().isBoolean(),
    body('preferences.notifications.push').optional().isBoolean(),
    body('preferences.notifications.dailySummary').optional().isBoolean(),
    body('preferences.notifications.marketing').optional().isBoolean(),
    body('preferences.theme').optional().isIn(['system', 'light', 'dark']),
    body('preferences.language').optional().isString().isLength({ min: 2, max: 5 }),
    body('preferences.timeZone').optional().isString(),
    body('preferences.currency').optional().isIn(['EUR', 'USD', 'BGN']),
    body('preferences.publicProfile').optional().isBoolean(),
    body('preferences.showReferralPublic').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
      }

      const {
        firstName, lastName, birthDate,
        addressLine1, addressLine2, city, state, postalCode, country,
        preferences,
      } = req.body;

      const current = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { preferences: true },
      });
      if (!current) return res.status(404).json({ success: false, message: 'User not found' });

      // derive age ако birthDate е подаден
      let derivedAge = undefined;
      if (birthDate) {
        const d = new Date(birthDate);
        const now = new Date();
        let age = now.getUTCFullYear() - d.getUTCFullYear();
        const m = now.getUTCMonth() - d.getUTCMonth();
        if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
        derivedAge = age;
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

      return res.json({ success: true, data: updated });
    } catch (e) {
      console.error('PATCH /settings error:', e);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;