import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, requireSubscription } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all predictions with enhanced filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      category, 
      status, 
      from, 
      to 
    } = req.query;
    
    const skip = (page - 1) * pageSize;
    const where = {};

    // Filter by category slug
    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: category }
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by date range
    if (from || to) {
      where.scheduledAt = {};
      if (from) {
        where.scheduledAt.gte = new Date(from);
      }
      if (to) {
        where.scheduledAt.lte = new Date(to);
      }
    }

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(pageSize),
        orderBy: { scheduledAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          creator: {
            select: {
              email: true,
            }
          }
        }
      }),
      prisma.prediction.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        predictions,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          pages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single prediction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        creator: {
          select: {
            email: true,
          }
        }
      }
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.json({
      success: true,
      data: { prediction }
    });
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create prediction (admin only)
router.post('/', authenticate, requireAdmin, [
  body('categoryId').notEmpty(),
  body('title').notEmpty(),
  body('pick').notEmpty(),
  body('odds').isFloat({ min: 1.01 }),
  body('scheduledAt').isISO8601(),
  body('league').optional(),
  body('homeTeam').optional(),
  body('awayTeam').optional(),
  body('status').optional().isIn(['UPCOMING', 'WON', 'LOST', 'VOID', 'EXPIRED']),
  body('resultNote').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { 
      categoryId, 
      title, 
      league, 
      homeTeam, 
      awayTeam, 
      pick, 
      odds, 
      scheduledAt,
      status,
      resultNote
    } = req.body;

    const prediction = await prisma.prediction.create({
      data: {
        categoryId,
        title,
        league,
        homeTeam,
        awayTeam,
        pick,
        odds: parseFloat(odds),
        scheduledAt: new Date(scheduledAt),
        status: status || 'UPCOMING',
        resultNote,
        createdBy: req.user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        creator: {
          select: {
            email: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Prediction created successfully',
      data: { prediction }
    });
  } catch (error) {
    console.error('Create prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update prediction (admin only)
router.put('/:id', authenticate, requireAdmin, [
  body('categoryId').optional().notEmpty(),
  body('title').optional().notEmpty(),
  body('pick').optional().notEmpty(),
  body('odds').optional().isFloat({ min: 1.01 }),
  body('scheduledAt').optional().isISO8601(),
  body('league').optional(),
  body('homeTeam').optional(),
  body('awayTeam').optional(),
  body('status').optional().isIn(['UPCOMING', 'WON', 'LOST', 'VOID', 'EXPIRED']),
  body('resultNote').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = {};

    // Only include provided fields
    if (req.body.categoryId) updateData.categoryId = req.body.categoryId;
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.league !== undefined) updateData.league = req.body.league;
    if (req.body.homeTeam !== undefined) updateData.homeTeam = req.body.homeTeam;
    if (req.body.awayTeam !== undefined) updateData.awayTeam = req.body.awayTeam;
    if (req.body.pick) updateData.pick = req.body.pick;
    if (req.body.odds) updateData.odds = parseFloat(req.body.odds);
    if (req.body.scheduledAt) updateData.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.resultNote !== undefined) updateData.resultNote = req.body.resultNote;

    const prediction = await prisma.prediction.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        creator: {
          select: {
            email: true,
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Prediction updated successfully',
      data: { prediction }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }
    console.error('Update prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete prediction (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.prediction.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Prediction deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }
    console.error('Delete prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Maintenance endpoint to expire old predictions (admin only)
router.post('/maintenance/run', authenticate, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    const result = await prisma.prediction.updateMany({
      where: {
        scheduledAt: {
          lt: now
        },
        status: 'UPCOMING'
      },
      data: {
        status: 'EXPIRED'
      }
    });

    res.json({
      success: true,
      message: `Expired ${result.count} predictions`,
      data: { count: result.count }
    });
  } catch (error) {
    console.error('Maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;