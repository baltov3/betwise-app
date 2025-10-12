import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Helper for country code
function getCountryCode(userCountry) {
  if (typeof userCountry === 'string' && userCountry.trim().length === 2) {
    return userCountry.trim().toUpperCase();
  }
  return 'BG';
}

/**
 * Create Stripe Express account for current user (if missing)
 */
// Create Stripe Express account
router.post('/create-account', authenticate, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Server misconfigured: STRIPE_SECRET_KEY missing' });
    }

    let user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.stripeAccountId) {
      return res.json({ success: true, data: { stripeAccountId: user.stripeAccountId } });
    }

    const countryCode = getCountryCode(user.country);
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      country: countryCode,
      capabilities: { transfers: { requested: true } },
      business_type: 'individual',
      individual: {
        first_name: user.firstName || undefined,
        last_name: user.lastName || undefined,
        email: user.email,
        address: {
          line1: user.addressLine1 || undefined,
          line2: user.addressLine2 || undefined,
          city: user.city || undefined,
          state: user.state || undefined,
          postal_code: user.postalCode || undefined,
          country: countryCode,
        },
      },
      settings: { payouts: { schedule: { interval: 'manual' } } },
    });

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountId: account.id,
        stripeOnboardingComplete: Boolean(account.details_submitted),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripeRequirementsDue: account.requirements?.currently_due || null,
      },
      select: {
        id: true, email: true, stripeAccountId: true,
        stripeOnboardingComplete: true, stripePayoutsEnabled: true, stripeChargesEnabled: true,
        stripeRequirementsDue: true,
      }
    });

    return res.json({ success: true, data: user });
  } catch (e) {
    console.error('Create Stripe account error:', e?.type || e?.name, e?.code, e?.message);
    return res.status(500).json({
      success: false,
      message: e?.message || 'Failed to create Stripe account',
      code: e?.code || e?.type || 'stripe_error'
    });
  }
});

// OAuth authorize URL
router.get('/connect/authorize', authenticate, async (req, res) => {
  try {
    if (!process.env.STRIPE_CONNECT_CLIENT_ID || !process.env.BACKEND_URL) {
      return res.status(500).json({ success: false, message: 'Missing STRIPE_CONNECT_CLIENT_ID or BACKEND_URL in env' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Missing JWT_SECRET in env' });
    }

    const state = jwt.sign(
      { userId: req.user.id, ts: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: `${process.env.BACKEND_URL}/api/payouts/connect/callback`,
      state,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
    return res.json({ success: true, data: { url } });
  } catch (e) {
    console.error('Connect authorize error:', e?.message || e);
    return res.status(500).json({ success: false, message: e?.message || 'Failed to build authorize URL' });
  }
});

/**
 * Generate Stripe onboarding/update link
 */
router.get('/account-link', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Stripe account not found. Create it first.' });
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const link = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?refresh=1`,
      return_url: `${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?done=1`,
      type: account.details_submitted ? 'account_update' : 'account_onboarding',
    });

    return res.json({ success: true, data: { url: link.url, type: account.details_submitted ? 'update' : 'onboarding' } });
  } catch (e) {
    console.error('Create account link error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create account link' });
  }
});

/**
 * Create login link to Stripe Express Dashboard (to manage bank account, payouts, etc.)
 */
router.get('/login-link', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Stripe account not found' });
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId, {
      redirect_url: `${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?dashboard=1`
    });

    return res.json({ success: true, data: { url: loginLink.url } });
  } catch (e) {
    console.error('Create login link error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create login link' });
  }
});

/**
 * Connect existing Stripe Standard account via OAuth (authorize URL)
 */
router.get('/connect/authorize', authenticate, async (req, res) => {
  try {
    if (!process.env.STRIPE_CONNECT_CLIENT_ID || !process.env.BACKEND_URL) {
      return res.status(500).json({ success: false, message: 'Missing STRIPE_CONNECT_CLIENT_ID or BACKEND_URL in env' });
    }
    const state = jwt.sign(
      { userId: req.user.id, ts: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: `${process.env.BACKEND_URL}/api/payouts/connect/callback`,
      state,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
    return res.json({ success: true, data: { url } });
  } catch (e) {
    console.error('Connect authorize error:', e);
    return res.status(500).json({ success: false, message: 'Failed to build authorize URL' });
  }
});

/**
 * OAuth callback: exchange code for stripe_user_id and link to user
 */
router.get('/connect/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Stripe OAuth error:', error, error_description);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?oauth=error`);
    }
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?oauth=missing`);
    }

    let decoded;
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET);
    } catch (e) {
      console.error('Invalid OAuth state:', e);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?oauth=state_invalid`);
    }

    const tokenResp = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: String(code),
    });

    const connectedAccountId = tokenResp.stripe_user_id;
    if (!connectedAccountId) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?oauth=no_account`);
    }

    // Retrieve account to sync flags
    const account = await stripe.accounts.retrieve(connectedAccountId);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        stripeAccountId: connectedAccountId,
        stripeOnboardingComplete: Boolean(account.details_submitted),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripeRequirementsDue: account.requirements?.currently_due || null,
      }
    });

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?connected=1`);
  } catch (e) {
    console.error('Connect callback error:', e);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?oauth=failed`);
  }
});

/**
 * Update local profile info used for Stripe onboarding
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      birthDate, // 'YYYY-MM-DD'
    } = req.body || {};

    const data = {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      addressLine1: addressLine1 ?? undefined,
      addressLine2: addressLine2 ?? undefined,
      city: city ?? undefined,
      state: state ?? undefined,
      postalCode: postalCode ?? undefined,
      country: country ?? undefined,
      birthDate: birthDate ? new Date(birthDate) : undefined,
    };

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        addressLine1: true, addressLine2: true, city: true, state: true,
        postalCode: true, country: true, birthDate: true,
        stripeAccountId: true, stripePayoutsEnabled: true, stripeOnboardingComplete: true,
      }
    });

    return res.json({ success: true, data: updated });
  } catch (e) {
    console.error('Update payout profile error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

/**
 * Sync payouts/charges status from Stripe
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeAccountId) {
      return res.status(200).json({
        success: true,
        data: {
          id: user?.id,
          email: user?.email,
          stripeAccountId: null,
          stripeOnboardingComplete: false,
          stripePayoutsEnabled: false,
          stripeChargesEnabled: false,
          stripeRequirementsDue: [],
        },
      });
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

/**
 * Create payout request (user)
 */
router.post('/request', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Stripe account not found' });
    }
    if (!user.stripePayoutsEnabled) {
      return res.status(400).json({ success: false, message: 'Stripe payouts are not enabled for your account' });
    }

    const referrals = await prisma.referral.findMany({ where: { referrerId: userId } });
    const totalEarnings = referrals.reduce((sum, r) => sum + (r.earnedAmount || 0), 0);

    const minPayout = 10;
    if (totalEarnings < minPayout) {
      return res.status(400).json({ success: false, message: `Minimum payout amount is $${minPayout}` });
    }

    const request = await prisma.payoutRequest.create({
      data: {
        userId,
        amount: totalEarnings,
        currency: 'usd',
        status: 'REQUESTED',
        reason: req.body?.reason || null,
      }
    });

    return res.json({ success: true, data: { request } });
  } catch (e) {
    console.error('Create payout request error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * Get my payout requests (user)
 */
router.get('/my-requests', authenticate, async (req, res) => {
  try {
    const list = await prisma.payoutRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: { requests: list } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * List payout requests (admin)
 */
router.get('/requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = status ? { status: String(status) } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } }
      }),
      prisma.payoutRequest.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        requests: items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * Reject payout request (admin)
 */
router.post('/requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const request = await prisma.payoutRequest.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: note || null, processedAt: new Date() }
    });

    return res.json({ success: true, data: { request } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * Approve and process payout (admin)
 */
router.post('/requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }
    if (!['REQUESTED', 'APPROVED', 'FAILED'].includes(request.status)) {
      return res.status(400).json({ success: false, message: `Cannot approve request in status ${request.status}` });
    }

    const user = request.user;
    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'User does not have a Stripe account' });
    }

    // Mark as PROCESSING
    await prisma.payoutRequest.update({
      where: { id: request.id },
      data: { status: 'PROCESSING' }
    });

    const amountInCents = Math.round(request.amount * 100);

    // 1) Transfer: platform -> connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: request.currency || 'usd',
      destination: user.stripeAccountId,
      metadata: { payoutRequestId: request.id, userId: user.id }
    });

    // 2) Payout: connected account -> external bank/card
    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: request.currency || 'usd',
        statement_descriptor: 'Betwise Payout',
        metadata: { payoutRequestId: request.id, userId: user.id }
      },
      { stripeAccount: user.stripeAccountId }
    );

    const updated = await prisma.payoutRequest.update({
      where: { id: request.id },
      data: {
        status: 'PAID',
        stripeTransferId: transfer.id,
        stripePayoutId: payout.id,
        processedAt: new Date()
      }
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: -request.amount,
        currency: request.currency || 'usd',
        method: 'stripe_payout',
        status: 'COMPLETED',
        stripeId: payout.id
      }
    });

    await prisma.referral.updateMany({
      where: { referrerId: user.id },
      data: { earnedAmount: 0 }
    });

    return res.json({ success: true, data: { request: updated } });
  } catch (e) {
    console.error('Approve/process payout error:', e);
    const id = req.params?.id;
    if (id) {
      try {
        await prisma.payoutRequest.update({
          where: { id },
          data: {
            status: 'FAILED',
            adminNote: e?.message?.slice(0, 500) || 'Stripe payout failed'
          }
        });
      } catch { /* noop */ }
    }
    return res.status(500).json({ success: false, message: 'Failed to process payout' });
  }
});

export default router;