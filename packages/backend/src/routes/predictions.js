import express from 'express';
import prisma from '../../../backend/prisma/db/prisma.js';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Конфигурация на live прозорци по спорт (в минути)
const SPORT_LIVE_DURATION_MIN = {
  Football: 105,
  Soccer: 105,
  Basketball: 150,
  Tennis: 180,
  Baseball: 240,
  // по подразбиране, ако спортът не е изброен
  __default: 120,
};

function getLiveDurationMs(sport) {
  const min = SPORT_LIVE_DURATION_MIN[sport] ?? SPORT_LIVE_DURATION_MIN.__default;
  return min * 60 * 1000;
}

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

// Обновен: Active predictions включва SCHEDULED + LIVE
// GET /api/predictions/active?page=1&limit=10&sport=Football
router.get('/active', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport } = req.query;
    const pageN = parseInt(String(page), 10);
    const limitN = parseInt(String(limit), 10);
    const skip = (pageN - 1) * limitN;
    const now = new Date();
    const nowMs = now.getTime();

    // Ако е зададен sport -> точен live прозорец; иначе използваме по-широк прозорец, за да обхванем потенциални LIVE
    const durationMs = getLiveDurationMs(sport || '__default');
    const pastWindowStart = new Date(nowMs - durationMs);

    // Вземаме:
    // - бъдещи (SCHEDULED) => matchDate >= now
    // - и започнали в рамките на live прозореца => matchDate в [pastWindowStart, now)
    // - само неуредени
    const where = {
      OR: [
        { matchDate: { gte: now } },
        { matchDate: { gte: pastWindowStart, lt: now } },
      ],
      result: 'PENDING',
      settledAt: null,
      ...(sport ? { sport } : {}),
    };

    const [rawPredictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limitN,
        // Първо сортираме приблизително по matchDate, а после ще редим LIVE най-отгоре
        orderBy: { matchDate: 'asc' },
        include: {
          creator: { select: { email: true } },
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    // Изчисляваме статуса и liveUntil и филтрираме мачовете, които вече са извън live прозореца
    const enriched = rawPredictions
      .map((p) => {
        const startMs = new Date(p.matchDate).getTime();
        const liveUntilMs = startMs + getLiveDurationMs(p.sport);
        const statusComputed =
          nowMs < startMs ? 'SCHEDULED' :
          nowMs <= liveUntilMs ? 'LIVE' :
          'FINISHED';

        return {
          ...p,
          statusComputed,
          liveUntil: new Date(liveUntilMs).toISOString(),
        };
      })
      // Премахваме "преминалите" от активния списък
      .filter((p) => p.statusComputed === 'SCHEDULED' || p.statusComputed === 'LIVE');

    // LIVE нагоре, после по време
    enriched.sort((a, b) => {
      if (a.statusComputed === 'LIVE' && b.statusComputed !== 'LIVE') return -1;
      if (a.statusComputed !== 'LIVE' && b.statusComputed === 'LIVE') return 1;
      return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
    });

    res.json({
      success: true,
      data: {
        predictions: enriched,
        pagination: {
          page: pageN,
          limit: limitN,
          total, // заб.: total е приблизително спрямо where; списъкът е обогатен и филтриран
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