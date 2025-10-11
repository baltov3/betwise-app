import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js'; // <-- ТУК!


const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SUBSCRIPTION_PLANS = {
  BASIC: { price: 9.99, priceId: 'price_basic' },
  PREMIUM: { price: 19.99, priceId: 'price_premium' },
  VIP: { price: 39.99, priceId: 'price_vip' },
};

// Get all subscriptions (admin only)
router. get('/all', authenticate, async (req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        user: { select: { email: true } }
      }
    });
    res.json({ success: true, data: { subscriptions: subs } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Create subscription
router.post('/create', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      return res.status(409).json({
        success: false,
        message: 'User already has active subscription'
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Betwise ${plan} Plan`,
            },
            unit_amount: Math.round(SUBSCRIPTION_PLANS[plan].price * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?cancelled=true`,
      metadata: {
        userId,
        plan,
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    if (subscription.stripeId) {
      // Cancel Stripe subscription
      await stripe.subscriptions.update(subscription.stripeId, {
        cancel_at_period_end: true
      });
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED' }
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get subscription status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    res.json({
      success: true,
      data: { subscription }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;