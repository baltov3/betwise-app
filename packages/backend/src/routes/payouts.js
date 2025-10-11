import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Generate Stripe onboarding/account update link
router.get('/account-link', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Stripe account not found' });
    }

    const link = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?refresh=1`,
      return_url: `${process.env.FRONTEND_URL}/dashboard?onboarding=done`,
      type: 'account_onboarding',
    });

    return res.json({ success: true, data: { url: link.url } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to create account link' });
  }
});

// Sync payouts/charges status from Stripe
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Stripe account not found' });
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeOnboardingComplete: Boolean(account.details_submitted),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripeRequirementsDue: account.requirements?.currently_due ? { set: account.requirements.currently_due } : undefined,
      },
      select: {
        id: true, email: true, stripeAccountId: true,
        stripeOnboardingComplete: true, stripePayoutsEnabled: true, stripeChargesEnabled: true,
        stripeRequirementsDue: true,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
});

export default router;