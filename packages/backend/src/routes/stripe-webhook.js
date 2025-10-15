import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// IMPORTANT: Stripe webhooks need raw body
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
      case 'payout.paid':
        await handlePayoutPaid(event.data.object, event.account);
        break;
      case 'payout.failed':
        await handlePayoutFailed(event.data.object, event.account);
        break;
      // Add other events if you need them (e.g., checkout.session.completed, etc.)
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
    // Find payout request by stored stripePayoutId
    const reqRecord = await prisma.payoutRequest.findFirst({
      where: { stripePayoutId: payout.id }
    });
    if (!reqRecord) return;

    await prisma.payoutRequest.update({
      where: { id: reqRecord.id },
      data: { status: 'PAID', processedAt: new Date() }
    });
  } catch (e) {
    console.error('handlePayoutPaid error:', e);
  }
}

async function handlePayoutFailed(payout, accountId) {
  try {
    const reqRecord = await prisma.payoutRequest.findFirst({
      where: { stripePayoutId: payout.id }
    });
    if (!reqRecord) return;

    await prisma.payoutRequest.update({
      where: { id: reqRecord.id },
      data: { status: 'FAILED', adminNote: payout.failure_message || 'Payout failed' }
    });
  } catch (e) {
    console.error('handlePayoutFailed error:', e);
  }
}

export default router;