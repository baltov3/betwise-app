import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Create or update subscription
  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: 'ACTIVE',
      stripeId: session.subscription,
      startDate: now,
      endDate: periodEnd,
    },
    create: {
      userId,
      plan,
      status: 'ACTIVE',
      stripeId: session.subscription,
      startDate: now,
      endDate: periodEnd,
    }
  });

  // Create payment record with period info
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      method: 'stripe',
      status: 'COMPLETED',
      stripeId: session.payment_intent,
      periodStart: now,
      periodEnd: periodEnd,
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
      // Check if this is the first payment (50% commission) or renewal (20% commission)
      const previousPayments = await prisma.payment.count({
        where: {
          userId,
          status: 'COMPLETED',
          id: { not: payment.id }
        }
      });

      const isFirstPayment = previousPayments === 0;
      const commissionRate = isFirstPayment ? 0.5 : 0.2; // 50% first month, 20% subsequent
      const paymentAmount = parseFloat(payment.amount);
      const commissionAmount = paymentAmount * commissionRate;
      
      // Update referral earned amount
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          earnedAmount: {
            increment: commissionAmount
          }
        }
      });

      // Create commission log
      const month = now.toISOString().substring(0, 7); // YYYY-MM format
      await prisma.commissionLog.create({
        data: {
          referrerId: user.referredBy,
          referredUserId: userId,
          fromPaymentId: payment.id,
          amount: commissionAmount,
          rateApplied: commissionRate,
          month: month,
        }
      });
    }
  }
}

async function handlePaymentSucceeded(invoice) {
  if (invoice.subscription) {
    // Find subscription and user
    const subscription = await prisma.subscription.findFirst({
      where: { stripeId: invoice.subscription },
      include: { user: true }
    });

    if (!subscription) return;

    const periodStart = new Date(invoice.period_start * 1000);
    const periodEnd = new Date(invoice.period_end * 1000);

    // Update subscription end date for renewal
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        endDate: periodEnd,
        status: 'ACTIVE',
      }
    });

    // Create payment record for renewal
    const payment = await prisma.payment.create({
      data: {
        userId: subscription.userId,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        method: 'stripe',
        status: 'COMPLETED',
        stripeId: invoice.id,
        periodStart: periodStart,
        periodEnd: periodEnd,
      }
    });

    // Handle referral commission for renewal
    const user = subscription.user;
    if (user.referredBy) {
      const referral = await prisma.referral.findUnique({
        where: {
          referrerId_referredUserId: {
            referrerId: user.referredBy,
            referredUserId: user.id,
          }
        }
      });

      if (referral) {
        // Renewal gets 20% commission
        const commissionRate = 0.2;
        const paymentAmount = parseFloat(payment.amount);
        const commissionAmount = paymentAmount * commissionRate;
        
        // Update referral earned amount
        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            earnedAmount: {
              increment: commissionAmount
            }
          }
        });

        // Create commission log
        const month = periodStart.toISOString().substring(0, 7); // YYYY-MM format
        await prisma.commissionLog.create({
          data: {
            referrerId: user.referredBy,
            referredUserId: user.id,
            fromPaymentId: payment.id,
            amount: commissionAmount,
            rateApplied: commissionRate,
            month: month,
          }
        });
      }
    }
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