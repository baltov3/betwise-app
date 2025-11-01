import express from 'express';
import prisma from '../../../backend/prisma/db/prisma.js';
import Stripe from 'stripe';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { PLATFORM_CURRENCY } from '../config/currency.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

function getCountryCode(userCountry) {
  if (typeof userCountry === 'string' && userCountry.trim().length === 2) {
    return userCountry.trim().toUpperCase();
  }
  return 'BG';
}

// Helper: compute user's available balance for withdrawal
async function computeAvailableBalance(userId) {
  // Sum earned referral amounts (adjust to your earning model)
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: { earnedAmount: true }
  });
  const earned = referrals.reduce((sum, r) => sum + (r.earnedAmount || 0), 0);

  // Sum already requested/paid amounts
  const paidOrProcessing = await prisma.payoutRequest.findMany({
    where: { userId, status: { in: ['PROCESSING', 'PAID'] } },
    select: { amount: true }
  });
  const locked = paidOrProcessing.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Sum rejected do not count; REQUESTED not yet approved still should be blocked from double-request
  const requested = await prisma.payoutRequest.findMany({
    where: { userId, status: 'REQUESTED' },
    select: { amount: true }
  });
  const pending = requested.reduce((sum, r) => sum + (r.amount || 0), 0);

  const available = Math.max(0, earned - locked - pending);
  return { earned, locked, pending, available };
}

/**
 * Create Stripe Express account for current user (if missing)
 */
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
      settings: { payouts: { schedule: { interval: 'manual' } } }, // manual payouts on connected account
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

/**
 * Create an account link for onboarding or updating details
 */
router.post('/account-link', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Ensure account exists
    let accountId = user.stripeAccountId;
    if (!accountId) {
      const countryCode = getCountryCode(user.country);
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        country: countryCode,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        settings: { payouts: { schedule: { interval: 'manual' } } },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: account.id }
      });
      accountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/payouts/onboarding?refresh=1`,
      return_url: `${process.env.FRONTEND_URL}/dashboard/payouts?onboarding=done`,
      type: 'account_onboarding',
    });

    res.json({ success: true, data: { url: accountLink.url } });
  } catch (e) {
    console.error('Create account link error:', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed to create account link' });
  }
});

/**
 * Get Stripe status and available balance for current user
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let payoutsEnabled = user.stripePayoutsEnabled;
    let chargesEnabled = user.stripeChargesEnabled;
    let requirements = user.stripeRequirementsDue;

    if (user.stripeAccountId) {
      // Refresh from Stripe (optional but useful)
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      payoutsEnabled = Boolean(account.payouts_enabled);
      chargesEnabled = Boolean(account.charges_enabled);
      requirements = account.requirements?.currently_due || null;

      // Persist latest flags
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeOnboardingComplete: Boolean(account.details_submitted),
          stripePayoutsEnabled: payoutsEnabled,
          stripeChargesEnabled: chargesEnabled,
          stripeRequirementsDue: requirements
        }
      });
    }

    const { earned, locked, pending, available } = await computeAvailableBalance(req.user.id);

    res.json({
      success: true,
      data: {
        stripeAccountId: user.stripeAccountId || null,
        stripePayoutsEnabled: payoutsEnabled,
        stripeChargesEnabled: chargesEnabled,
        stripeRequirementsDue: requirements,
        balance: { earned, locked, pending, available },
      }
    });
  } catch (e) {
    console.error('Status error:', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed to load status' });
  }
});

/**
 * List payout requests for current user
 */
router.get('/my-requests', authenticate, async (req, res) => {
  try {
    const requests = await prisma.payoutRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, currency: true, status: true, createdAt: true }
    });
    res.json({ success: true, data: { requests } });
  } catch (e) {
    console.error('My requests error:', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed to load requests' });
  }
});

/**
 * Create payout request for current user
 */
router.post('/request', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Connect your Stripe account first' });
    }

    const { available } = await computeAvailableBalance(userId);
    if (available <= 0) {
      return res.status(400).json({ success: false, message: 'No available balance for payout' });
    }

    // Optionally allow custom amount (<= available)
    const requestedAmount = Number(req.body?.amount || available);
    if (requestedAmount <= 0 || requestedAmount > available) {
      return res.status(400).json({ success: false, message: 'Invalid amount requested' });
    }

    const request = await prisma.payoutRequest.create({
      data: {
        userId,
        amount: requestedAmount,
        currency: PLATFORM_CURRENCY,
        status: 'REQUESTED',
        reason: req.body?.reason || null,
      }
    });

    res.json({ success: true, message: 'Payout request submitted', data: { request } });
  } catch (e) {
    console.error('Request payout error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * Admin: approve payout request -> transfer funds + trigger payout
 */
router.post('/admin/approve/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const payoutReq = await prisma.payoutRequest.findUnique({ where: { id: req.params.id } });
    if (!payoutReq) return res.status(404).json({ success: false, message: 'Payout request not found' });
    if (payoutReq.status !== 'REQUESTED') return res.status(400).json({ success: false, message: 'Request not in REQUESTED state' });

    const user = await prisma.user.findUnique({ where: { id: payoutReq.userId } });
    if (!user?.stripeAccountId) return res.status(400).json({ success: false, message: 'User has no connected Stripe account' });

    // Optional: verify payouts enabled
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({ success: false, message: 'User payouts not enabled in Stripe' });
    }

    const amountCents = Math.round(payoutReq.amount * 100);
    const currency = PLATFORM_CURRENCY;

    // 1) Transfer funds from platform to connected account balance
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency,
      destination: user.stripeAccountId,
      metadata: { payoutRequestId: payoutReq.id, userId: user.id }
    });

    // 2) Immediately create a payout from the connected account balance to their bank/card
    const payout = await stripe.payouts.create(
      { amount: amountCents, currency, metadata: { payoutRequestId: payoutReq.id, userId: user.id } },
      { stripeAccount: user.stripeAccountId }
    );

    // Mark as PROCESSING, store Stripe IDs
    const updated = await prisma.payoutRequest.update({
      where: { id: payoutReq.id },
      data: {
        status: 'PROCESSING',
        stripeTransferId: transfer.id,
        stripePayoutId: payout.id,
        processedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Payout approved and processing', data: { request: updated, transferId: transfer.id, payoutId: payout.id } });
  } catch (e) {
    console.error('Approve payout error:', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed to approve payout' });
  }
});

/**
 * Admin: list payout requests
 * По подразбиране връща само активни заявки (REQUESTED и FAILED).
 * За да върне всички записи (вкл. PAID и REJECTED): GET /api/payouts/requests?showAll=true
 */
router.get('/requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const showAll = String(req.query.showAll || '').toLowerCase() === 'true';

    // Активни за обработка: REQUESTED и FAILED
    const where = showAll ? {} : { status: { in: ['REQUESTED'] } };

    const requests = await prisma.payoutRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });

    return res.json({ success: true, data: { requests } });
  } catch (e) {
    console.error('Admin list payout requests error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load payout requests' });
  }
});
/**
 * Admin: list payout requests
 * По подразбиране връща само активни заявки (REQUESTED и FAILED).
 * За да върне всички записи (вкл. PAID и REJECTED): GET /api/payouts/requests?showAll=true
 */
router.get('/requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const showAll = String(req.query.showAll || '').toLowerCase() === 'true';

    // Активни за обработка: REQUESTED и FAILED
    const where = showAll ? {} : { status: { in: ['REQUESTED', 'FAILED'] } };

    const requests = await prisma.payoutRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });

    return res.json({ success: true, data: { requests } });
  } catch (e) {
    console.error('Admin list payout requests error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load payout requests' });
  }
});


// ... останалите маршрути и помощни функции надолу

/**
 * Create payout request for current user
 * Приема custom amount в тялото
 * Минимална сума: $20
 * Сума <= available
 */
router.post('/request', authenticate, async (req, res) => {
  try {
    const MIN_PAYOUT = 20;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Connect your Stripe account first' });
    }

    const { available } = await computeAvailableBalance(userId);
    if (available <= 0) {
      return res.status(400).json({ success: false, message: 'No available balance for payout' });
    }

    const requestedAmount = Number(req.body?.amount ?? NaN);

    if (!Number.isFinite(requestedAmount)) {
      return res.status(400).json({ success: false, message: 'Invalid amount requested' });
    }

    if (requestedAmount < MIN_PAYOUT) {
      return res.status(400).json({ success: false, message: `Minimum payout amount is $${MIN_PAYOUT}` });
    }

    if (requestedAmount > available) {
      return res.status(400).json({ success: false, message: 'Invalid amount requested' });
    }

    const request = await prisma.payoutRequest.create({
      data: {
        userId,
        amount: Number(requestedAmount.toFixed(2)),
        currency: PLATFORM_CURRENCY,
        status: 'REQUESTED',
        reason: req.body?.reason || null,
      }
    });

    return res.json({ success: true, data: { request } });
  } catch (e) {
    console.error('Request payout error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ... останалият код по-долу, export default router и т.н.

// ALIAS към съществуващия админски approve, за да съвпада с фронтенда:
// POST /api/payouts/requests/:id/approve
router.post('/requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const payoutReq = await prisma.payoutRequest.findUnique({ where: { id: req.params.id } });
    if (!payoutReq) return res.status(404).json({ success: false, message: 'Payout request not found' });
    if (!['REQUESTED', 'FAILED'].includes(payoutReq.status)) {
      return res.status(400).json({ success: false, message: 'Request not in REQUESTED/FAILED state' });
    }

    const user = await prisma.user.findUnique({ where: { id: payoutReq.userId } });
    if (!user?.stripeAccountId) return res.status(400).json({ success: false, message: 'User has no connected Stripe account' });

    // Проверка: payouts enabled
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({ success: false, message: 'User payouts not enabled in Stripe' });
    }

    const amountCents = Math.round(payoutReq.amount * 100);
    const currency = PLATFORM_CURRENCY;

    // Маркираме като PROCESSING
    await prisma.payoutRequest.update({ where: { id: payoutReq.id }, data: { status: 'PROCESSING' } });

    // 1) Transfer: платформа -> свързан акаунт
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency,
      destination: user.stripeAccountId,
      metadata: { payoutRequestId: payoutReq.id, userId: user.id }
    });

    // 2) Payout: свързан акаунт -> банка/карта
    const payout = await stripe.payouts.create(
      { amount: amountCents, currency, metadata: { payoutRequestId: payoutReq.id, userId: user.id } },
      { stripeAccount: user.stripeAccountId }
    );

    const updated = await prisma.payoutRequest.update({
      where: { id: payoutReq.id },
      data: {
        status: 'PAID',
        stripeTransferId: transfer.id,
        stripePayoutId: payout.id,
        processedAt: new Date()
      }
    });

    // Запис в Payments (отрицателна сума – извеждане)
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: -payoutReq.amount,
        currency,
        method: 'stripe_payout',
        status: 'COMPLETED',
        stripeId: payout.id
      }
    });

    // Нулиране на рефъръл печалбите след изплащане
    await prisma.referral.updateMany({
      where: { referrerId: user.id },
      data: { earnedAmount: 0 }
    });

    return res.json({ success: true, data: { request: updated } });
  } catch (e) {
    console.error('Approve/process payout error:', e);
    try {
      await prisma.payoutRequest.update({
        where: { id: req.params.id },
        data: { status: 'FAILED', adminNote: e?.message?.slice(0, 500) || 'Stripe payout failed' }
      });
    } catch {}
    return res.status(500).json({ success: false, message: 'Failed to process payout' });
  }
});
/**
 * Admin: reject payout request
 * Matches frontend: POST /api/payouts/requests/:id/reject
 */
router.post('/requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const note = req.body?.note || null;

    const request = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }
    if (request.status !== 'REQUESTED') {
      return res.status(400).json({ success: false, message: `Cannot reject request in status ${request.status}` });
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: note, processedAt: new Date() },
    });

    return res.json({ success: true, data: { request: updated } });
  } catch (e) {
    console.error('Admin reject payout request error:', e);
    return res.status(500).json({ success: false, message: 'Failed to reject payout request' });
  }
});
/**
 * Admin: reject payout request
 */
router.post('/admin/reject/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const payoutReq = await prisma.payoutRequest.findUnique({ where: { id: req.params.id } });
    if (!payoutReq) return res.status(404).json({ success: false, message: 'Payout request not found' });
    if (payoutReq.status !== 'REQUESTED') return res.status(400).json({ success: false, message: 'Request not in REQUESTED state' });

    const updated = await prisma.payoutRequest.update({
      where: { id: payoutReq.id },
      data: { status: 'REJECTED', adminNote: req.body?.note || null }
    });

    res.json({ success: true, message: 'Payout request rejected', data: { request: updated } });
  } catch (e) {
    console.error('Reject payout error:', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed to reject payout' });
  }
});

export default router;