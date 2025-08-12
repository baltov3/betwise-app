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

export default router;