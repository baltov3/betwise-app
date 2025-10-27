import express from 'express';
import Stripe from 'stripe';
import prisma from '../../../backend/prisma/db/prisma.js';

// Създаваме самостоятелен router за Stripe webhook-и.
// ВАЖНО: Този router трябва да е монтиран ПРЕДИ express.json() в index.js:
// app.use('/api/stripe', stripeWebhookRoutes);

const router = express.Router();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    const err = new Error(`Missing required env: ${name}`);
    err.status = 500;
    throw err;
  }
  return val;
}

function s(value) {
  return typeof value === 'string' ? value : undefined;
}

// Подгответе Stripe клиента. Ако ключът е грешен/липсва, ще хвърли при първа употреба.
function getStripe() {
  const key = requireEnv('STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// Помощни обработчици. Важно: зависят от schema.prisma. Ако имената на модели/полета се различават,
// адаптираме.
// В subscriptions.js Checkout Session се създава с metadata: { userId, plan }

async function handleCheckoutCompleted(session) {
  // session.mode == 'subscription'
  const userId = s(session?.metadata?.userId);
  const plan = s(session?.metadata?.plan);
  const stripeSubscriptionId = s(session?.subscription);

  if (!userId) {
    console.warn('checkout.session.completed without metadata.userId, session.id=', session?.id);
    return;
  }

  // Активиране/създаване на абонамент
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: 'ACTIVE',
      plan: plan || undefined,
      stripeId: stripeSubscriptionId || undefined,
      startDate: new Date(),
      // endDate се определя от Stripe цикъла – може да се актуализира при invoice.payment_succeeded
    },
    create: {
      userId,
      status: 'ACTIVE',
      plan: plan || 'BASIC',
      stripeId: stripeSubscriptionId || null,
      startDate: new Date(),
    },
  });

  // По желание: запис на плащане/сесия.
  if (session?.payment_intent) {
    const amountTotal = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;
    await prisma.payment.create({
      data: {
        userId,
        provider: 'STRIPE',
        status: 'COMPLETED',
        amount: amountTotal || 0,
        currency: session.currency?.toUpperCase() || 'USD',
        externalId: String(session.id),
        meta: JSON.stringify({
          type: 'checkout.session.completed',
          payment_intent: session.payment_intent,
          subscription: stripeSubscriptionId,
        }),
      },
    }).catch(() => {});
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  // Полезно за продължаващи таксувания (recurring)
  const stripeSubscriptionId = s(invoice?.subscription);
  const customerId = s(invoice?.customer);

  // Ако имаме mapping от Stripe subscription към локален subscription:
  if (stripeSubscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeId: stripeSubscriptionId },
      data: {
        status: 'ACTIVE',
        // lastPaidAt: ново поле по желание в schema; ако го имате — разкоментирайте:
        // lastPaidAt: new Date(),
      },
    });
  }

  // По желание: запис на плащане в нашата таблица
  const amountPaid = typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : 0;
  const userIdFromLines = s(invoice?.metadata?.userId); // ако изпращате userId по метаданни
  await prisma.payment.create({
    data: {
      userId: userIdFromLines || null,
      provider: 'STRIPE',
      status: 'COMPLETED',
      amount: amountPaid,
      currency: (invoice.currency || 'usd').toUpperCase(),
      externalId: String(invoice.id),
      meta: JSON.stringify({
        type: 'invoice.payment_succeeded',
        customer: customerId,
        subscription: stripeSubscriptionId,
      }),
    },
  }).catch(() => {});
}

async function handleSubscriptionUpdated(subscription) {
  const stripeSubscriptionId = s(subscription?.id);
  if (!stripeSubscriptionId) return;

  const statusMap = {
    active: 'ACTIVE',
    trialing: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'PAST_DUE',
    incomplete: 'PENDING',
    incomplete_expired: 'CANCELED',
    paused: 'PAUSED',
  };

  const mapped = statusMap[subscription.status] || 'ACTIVE';

  await prisma.subscription.updateMany({
    where: { stripeId: stripeSubscriptionId },
    data: {
      status: mapped,
      // Ако пазите крайни дати — може да извлечете от subscription.current_period_end
      // endDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined,
    },
  });
}

async function handleSubscriptionDeleted(subscription) {
  const stripeSubscriptionId = s(subscription?.id);
  if (!stripeSubscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeId: stripeSubscriptionId },
    data: {
      status: 'CANCELED',
      // endDate: new Date(),
    },
  });
}

async function handlePayoutPaid(payoutObject, account) {
  // Ако имате таблица payoutRequest или payout, можете да я обновите тук по външен ID:
  // Пример:
  // await prisma.payoutRequest.updateMany({
  //   where: { externalId: payoutObject.id },
  //   data: { status: 'PAID' },
  // });
  console.log('payout.paid', { id: payoutObject?.id, account });
}

async function handlePayoutFailed(payoutObject, account) {
  // Примерно отбелязване за неуспешно плащане:
  // await prisma.payoutRequest.updateMany({
  //   where: { externalId: payoutObject.id },
  //   data: { status: 'FAILED', failureReason: payoutObject.failure_message || null },
  // });
  console.warn('payout.failed', { id: payoutObject?.id, account, reason: payoutObject?.failure_message });
}

// Тук използваме express.raw, за да не „сготвим“ тялото преди проверката на подписа
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    const secret = requireEnv('STRIPE_WEBHOOK_SECRET');
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Stripe webhook verification failed:', err?.message || err);
    return res.status(400).send(`Webhook Error: ${err.message || 'Invalid signature'}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
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

    // Stripe очаква 2xx за успешно приемане
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // 500 казва на Stripe да опита отново (което е желано при временни проблеми)
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;