import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get payment history for current user
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.payment.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Request payout (for referral earnings)
router.post('/payout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Calculate total available earnings
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId }
    });

    const totalEarnings = referrals.reduce((sum, referral) => sum + referral.earnedAmount, 0);

    if (totalEarnings < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payout amount is $10'
      });
    }

    // Create payout request (would integrate with payment processor)
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: -totalEarnings, // Negative for payout
        currency: 'usd',
        method: 'payout',
        status: 'PENDING',
      }
    });

    // Reset earnings (in real app, would do this after successful payout)
    await prisma.referral.updateMany({
      where: { referrerId: userId },
      data: { earnedAmount: 0 }
    });

    res.json({
      success: true,
      message: 'Payout request submitted successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all payments (admin only)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            }
          }
        }
      }),
      prisma.payment.count()
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;