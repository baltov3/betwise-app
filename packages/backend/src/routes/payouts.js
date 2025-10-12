import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Генерира Stripe onboarding/update линк
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

// Синк на статуса от Stripe (charges/payouts capability)
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

// Създаване на заявка за изплащане (потребител)
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

// Моите заявки (потребител)
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

// Списък заявки (админ)
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

// Отказ на заявка (админ)
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

// Одобрение и изплащане (админ)
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

    // Маркираме като PROCESSING
    await prisma.payoutRequest.update({
      where: { id: request.id },
      data: { status: 'PROCESSING' }
    });

    const amountInCents = Math.round(request.amount * 100);

    // 1) Transfer: платформа -> connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: request.currency || 'usd',
      destination: user.stripeAccountId,
      metadata: { payoutRequestId: request.id, userId: user.id }
    });

    // 2) Payout: connected account -> банкова сметка/карта
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

    // Леджър запис
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

    // Зануляваме referral earnedAmount след успешно изплащане
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