import express from 'express';
import prisma from '../../../backend/prisma/db/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalSubscriptions, totalPredictions, totalPayments] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.prediction.count(),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
    ]);

    const totalRevenue = await prisma.payment.aggregate({
      where: { 
        status: 'COMPLETED',
        amount: { gt: 0 }
      },
      _sum: { amount: true }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSubscriptions,
        totalPredictions,
        totalPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all users
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const where = search ? {
      email: {
        contains: search,
        mode: 'insensitive'
      }
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              endDate: true,
            }
          },
          _count: {
            select: {
              referrals: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user subscription
router.put('/users/:id/subscription', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, status, endDate } = req.body;

    const subscription = await prisma.subscription.upsert({
      where: { userId: id },
      update: {
        plan: plan || undefined,
        status: status || undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      create: {
        userId: id,
        plan: plan || 'BASIC',
        status: status || 'ACTIVE',
        startDate: new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    res.json({
      success: true,
      message: 'User subscription updated successfully',
      data: { subscription }
    });
  } catch (error) {
    console.error('Update user subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all subscriptions
router.get('/subscriptions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          user: {
            select: {
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.subscription.count()
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;