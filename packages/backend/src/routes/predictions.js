import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, requireSubscription } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all predictions (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport } = req.query;
    const skip = (page - 1) * limit;

    const where = sport ? { sport } : {};

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { matchDate: 'asc' },
        include: {
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
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
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
  body('sport').notEmpty(),
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('odds').isFloat({ min: 1.01 }),
  body('matchDate').isISO8601(),
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

    const { sport, title, description, odds, matchDate } = req.body;

    const prediction = await prisma.prediction.create({
      data: {
        sport,
        title,
        description,
        odds: parseFloat(odds),
        matchDate: new Date(matchDate),
        createdBy: req.user.id,
      },
      include: {
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
  body('sport').optional().notEmpty(),
  body('title').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('odds').optional().isFloat({ min: 1.01 }),
  body('matchDate').optional().isISO8601(),
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
    if (req.body.sport) updateData.sport = req.body.sport;
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.odds) updateData.odds = parseFloat(req.body.odds);
    if (req.body.matchDate) updateData.matchDate = new Date(req.body.matchDate);

    const prediction = await prisma.prediction.update({
      where: { id },
      data: updateData,
      include: {
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

export default router;