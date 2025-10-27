import express from 'express';
import Stripe from 'stripe';
import prisma from '../../../backend/prisma/db/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// ... горните импорти и /history остават същите

// Request payout (legacy endpoint -> създава PayoutRequest)
router.post('/payout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const referrals = await prisma.referral.findMany({ where: { referrerId: userId } });
    const totalEarnings = referrals.reduce((sum, r) => sum + (r.earnedAmount || 0), 0);

    const minPayout = 10;
    if (totalEarnings < minPayout) {
      return res.status(400).json({ success: false, message: `Minimum payout amount is $${minPayout}` });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeAccountId) {
      return res.status(400).json({ success: false, message: 'Stripe account not found' });
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

    return res.json({
      success: true,
      message: 'Payout request submitted successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ... /all остава същият
// Stripe webhook (raw body needed)
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'payout.paid':
        await handlePayoutPaid(event.data.object, event.account);
        break;
      case 'payout.failed':
        await handlePayoutFailed(event.data.object, event.account);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({error: 'Webhook handler failed'});
  }
});

async function handleCheckoutCompleted(session) {
  const { userId, plan } = session.metadata;

  // Create or update subscription
  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: 'ACTIVE',
      stripeId: session.subscription,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    create: {
      userId,
      plan,
      status: 'ACTIVE',
      stripeId: session.subscription,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      method: 'stripe',
      status: 'COMPLETED',
      stripeId: session.payment_intent,
    }
  });

  // Handle referral commission
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (user && user.referredBy) {
    const referral = await prisma.referral.findUnique({
      where: {
        referrerId_referredUserId: {
          referrerId: user.referredBy,
          referredUserId: userId,
        }
      }
    });

    if (referral) {
      const commissionAmount = (session.amount_total / 100) * referral.commissionRate;
      
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          earnedAmount: {
            increment: commissionAmount
          }
        }
      });
    }
  }
}

async function handlePaymentSucceeded(invoice) {
  if (invoice.subscription) {
    // Update subscription end date for renewal
    await prisma.subscription.updateMany({
      where: { stripeId: invoice.subscription },
      data: {
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE'
      }
    });
  }
}

async function handleSubscriptionUpdated(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: {
      status: subscription.status === 'active' ? 'ACTIVE' : 'PENDING',
      endDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined
    }
  });
}

async function handleSubscriptionDeleted(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: { status: 'CANCELLED' }
  });
}

// Connected account payout status updates
async function handlePayoutPaid(payout, accountId) {
  try {
    const req = await prisma.payoutRequest.findFirst({
      where: { stripePayoutId: payout.id }
    });
    if (!req) return;

    await prisma.payoutRequest.update({
      where: { id: req.id },
      data: { status: 'PAID', processedAt: new Date() }
    });
  } catch (e) {
    console.error('handlePayoutPaid error:', e);
  }
}

async function handlePayoutFailed(payout, accountId) {
  try {
    const req = await prisma.payoutRequest.findFirst({
      where: { stripePayoutId: payout.id }
    });
    if (!req) return;

    await prisma.payoutRequest.update({
      where: { id: req.id },
      data: { status: 'FAILED', adminNote: payout.failure_message || 'Payout failed' }
    });
  } catch (e) {
    console.error('handlePayoutFailed error:', e);
  }
}

export default router;