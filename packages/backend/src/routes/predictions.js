import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';

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

    // NEW: Block editing if past or settled
    const current = await prisma.prediction.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }
    const now = new Date();
    const isPast = current.matchDate < now;
    const isSettled = Boolean(current.settledAt) || current.result !== 'PENDING' || current.status === 'FINISHED';

    if (isPast || isSettled) {
      return res.status(400).json({ success: false, message: 'Cannot edit a prediction after the match has passed or the prediction is settled' });
    }

    const updateData = {};
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
    if (error?.code === 'P2025') {
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

// ...
// NEW: Active predictions
// GET /api/predictions/active?page=1&limit=10&sport=Football
router.get('/active', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport } = req.query;
    const pageN = parseInt(String(page), 10);
    const limitN = parseInt(String(limit), 10);
    const skip = (pageN - 1) * limitN;
    const now = new Date();

    const where = {
      matchDate: { gte: now },
      ...(sport ? { sport } : {}),
    };

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limitN,
        orderBy: { matchDate: 'asc' },
        include: {
          creator: { select: { email: true } },
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        predictions,
        pagination: {
          page: pageN,
          limit: limitN,
          total,
          pages: Math.ceil(total / limitN) || 1,
        },
      },
    });
  } catch (err) {
    console.error('Active predictions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Delete prediction (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // NEW: Block deletion if past or settled
    const current = await prisma.prediction.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }
    const now = new Date();
    const isPast = current.matchDate < now;
    const isSettled = Boolean(current.settledAt) || current.result !== 'PENDING' || current.status === 'FINISHED';

    if (isPast || isSettled) {
      return res.status(400).json({ success: false, message: 'Cannot delete a prediction after the match has passed or the prediction is settled' });
    }

    await prisma.prediction.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Prediction deleted successfully'
    });
  } catch (error) {
    if (error?.code === 'P2025') {
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