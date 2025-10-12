import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook (raw body needed)
// ... горната част и съществуващите handlers остават

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  // ... constructEvent и switch
  try {
    switch (event.type) {
      // ... вашите съществуващи cases
      case 'payout.paid':
        await handlePayoutPaid(event.data.object, event.account);
        break;
      case 'payout.failed':
        await handlePayoutFailed(event.data.object, event.account);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

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
        endDate: new Date(invoice.period_end * 1000),
        status: 'ACTIVE',
      }
    });
  }
}

async function handleSubscriptionUpdated(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: {
      status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
    }
  });
}

async function handleSubscriptionDeleted(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: {
      status: 'CANCELLED',
    }
  });
}

export default router;