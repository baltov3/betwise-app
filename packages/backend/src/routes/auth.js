import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Helper: country normalization
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

// Helper: derive age safely from birthDate string
function calcAgeFromDOB(birthDateStr) {
  const d = new Date(birthDateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  const m = today.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

// Record user legal consents
async function recordUserConsents(userId, consents, req) {
  const required = ['TERMS','PRIVACY','AGE','REFERRAL','COOKIES','REFUND'];
  for (const key of required) {
    if (!consents?.[key]) {
      const err = new Error(`Липсва съгласие за ${key}`);
      err.status = 400;
      throw err;
    }
  }
  const active = await prisma.legalDocument.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { effectiveAt: 'desc' }],
  });
  const latestByType = active.reduce((acc, d) => (acc[d.type] ??= d, acc), {});
  for (const key of required) {
    const doc = latestByType[key];
    if (!doc) {
      const err = new Error(`Няма активен документ за ${key}`);
      err.status = 500;
      throw err;
    }
    if (doc.version !== consents[key]) {
      const err = new Error(`Некоректна версия за ${key}`);
      err.status = 400;
      throw err;
    }
    await prisma.userAgreement.create({
      data: {
        userId,
        documentId: doc.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });
  }
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),

    // LEGAL: изискваме приемане и версии
    body('ageConfirmed').isBoolean().custom(v => v === true),
    body('consents').isObject(),

    body('referralCode').isString().notEmpty().withMessage('Referral code is required'),

    body('firstName').isString().isLength({ min: 2 }),
    body('lastName').isString().isLength({ min: 2 }),
    body('birthDate').isISO8601(),
    body('age').optional().isInt({ min: 0 }),

    body('addressLine1').isString().notEmpty(),
    body('city').isString().notEmpty(),
    body('postalCode').isString().notEmpty(),

    body('country')
      .isString()
      .notEmpty()
      .custom((val) => {
        const code = normalizeCountry(val);
        if (!code) throw new Error('Country must be ISO 3166-1 alpha-2 (e.g. BG) or a known country name');
        return true;
      }),
    body('state').optional().isString(),
    body('addressLine2').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
      }

      const {
        email,
        password,
        referralCode,
        firstName,
        lastName,
        birthDate,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,

        // NEW: бяха липсващи — без тях consents щеше да е undefined
        ageConfirmed,
        consents,
      } = req.body;

      // derive and enforce min age BEFORE Stripe
      const derivedAge = calcAgeFromDOB(birthDate);
      if (derivedAge == null) {
        return res.status(400).json({ success: false, message: 'Invalid birth date' });
      }
      if (!ageConfirmed || derivedAge < 18) {
        return res.status(400).json({
          success: false,
          message: 'You must be at least 18 years old and confirm age to register.',
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User already exists' });
      }

      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (!referrer) {
        return res.status(400).json({ success: false, message: 'Invalid referral code' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user in DB regardless of Stripe result
      let user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          referredBy: referrer.id,
          firstName,
          lastName,
          birthDate: new Date(birthDate),
          age: derivedAge,
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state: state || null,
          postalCode,
          country, // store as entered
        },
        select: {
          id: true, email: true, role: true, referralCode: true, createdAt: true,
          firstName: true, lastName: true, birthDate: true, age: true, city: true, country: true,
          stripeAccountId: true, stripeOnboardingComplete: true, stripePayoutsEnabled: true, stripeChargesEnabled: true,
        },
      });

      // Record legal consents (throws 4xx/5xx with status)
      await recordUserConsents(user.id, consents, req);

      await prisma.referral.create({
        data: { referrerId: referrer.id, referredUserId: user.id, commissionRate: 0.1 },
      });

      // Try to create Stripe account, but DO NOT fail registration if it errors
      let stripeOnboardingUrl;
      try {
        const countryCode = normalizeCountry(country) || 'BG';
        const account = await stripe.accounts.create({
          type: 'express',
          email,
          country: countryCode,
          capabilities: { transfers: { requested: true } },
          business_type: 'individual',
          individual: {
            first_name: firstName,
            last_name: lastName,
            dob: (() => {
              const d = new Date(birthDate);
              return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
            })(),
            address: {
              line1: addressLine1,
              line2: addressLine2 || undefined,
              city,
              state: state || undefined,
              postal_code: postalCode,
              country: countryCode,
            },
            email,
          },
          settings: { payouts: { schedule: { interval: 'manual' } } },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeAccountId: account.id,
            stripeOnboardingComplete: Boolean(account.details_submitted),
            stripePayoutsEnabled: Boolean(account.payouts_enabled),
            stripeChargesEnabled: Boolean(account.charges_enabled),
            // Json поле – присвояване директно
            stripeRequirementsDue: account.requirements?.currently_due || null,
          },
        });

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?refresh=1`,
          return_url: `${process.env.FRONTEND_URL}/dashboard?onboarding=done`,
          type: 'account_onboarding',
        });

        stripeOnboardingUrl = accountLink.url;

        // refresh user select (optional)
        user = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true, email: true, role: true, referralCode: true, createdAt: true,
            firstName: true, lastName: true, birthDate: true, age: true, city: true, country: true,
            stripeAccountId: true, stripeOnboardingComplete: true, stripePayoutsEnabled: true, stripeChargesEnabled: true,
          },
        });
      } catch (stripeErr) {
        console.error('Stripe account create/onboarding error:', stripeErr);
        // Keep registration successful; user can onboard later from dashboard
      }

      // IMPORTANT: keep JWT payload consistent with /login and authenticate middleware
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, referralCode: user.referralCode },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user, token, stripeOnboardingUrl },
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, referralCode: user.referralCode },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const { password: _pw, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: { user: userWithoutPassword, token },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        referralCode: true,
        createdAt: true,
        subscription: true,
      },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;