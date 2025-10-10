import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's referrals
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            subscription: {
              select: {
                plan: true,
                status: true,
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: { referrals }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get referral stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total referrals count
    const totalReferrals = await prisma.referral.count({
      where: { referrerId: userId }
    });

    // Get total earnings
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId }
    });

    const totalEarnings = referrals.reduce((sum, referral) => sum + referral.earnedAmount, 0);

    // Get active referrals (with active subscriptions)
    const activeReferrals = await prisma.referral.count({
      where: {
        referrerId: userId,
        referred: {
          subscription: {
            status: 'ACTIVE'
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalReferrals,
        activeReferrals,
        totalEarnings: totalEarnings.toFixed(2),
        referralLink: `${process.env.FRONTEND_URL}/register?ref=${req.user.referralCode}`
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get referral summary (new endpoint)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get referred users count
    const referredUsersCount = await prisma.referral.count({
      where: { referrerId: userId }
    });

    // Get total earned from commission logs
    const commissions = await prisma.commissionLog.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5, // Last 5 commissions
    });

    const totalEarned = await prisma.commissionLog.aggregate({
      where: { referrerId: userId },
      _sum: {
        amount: true,
      }
    });

    res.json({
      success: true,
      data: {
        referredUsersCount,
        totalEarned: totalEarned._sum.amount ? parseFloat(totalEarned._sum.amount) : 0,
        lastCommissions: commissions.map(c => ({
          id: c.id,
          amount: parseFloat(c.amount),
          rateApplied: parseFloat(c.rateApplied),
          month: c.month,
          createdAt: c.createdAt,
        })),
        referralLink: `${process.env.FRONTEND_URL}/register?ref=${req.user.referralCode}`
      }
    });
  } catch (error) {
    console.error('Get referral summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get commission logs
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Admin can see all, users see only their own
    const where = req.user.role === 'ADMIN' 
      ? {} 
      : { referrerId: req.user.id };

    const [logs, total] = await Promise.all([
      prisma.commissionLog.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: {
            select: {
              id: true,
              email: true,
            }
          },
          referred: {
            select: {
              id: true,
              email: true,
            }
          },
          fromPayment: {
            select: {
              id: true,
              amount: true,
              createdAt: true,
            }
          }
        }
      }),
      prisma.commissionLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          referrer: log.referrer,
          referred: log.referred,
          amount: parseFloat(log.amount),
          rateApplied: parseFloat(log.rateApplied),
          month: log.month,
          createdAt: log.createdAt,
          payment: log.fromPayment,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get commission logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;