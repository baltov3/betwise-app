import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/predictions/active
// Показва активни прогнози: предстоящи (matchDate >= now) и все още не сетълнати (result = PENDING)
router.get('/active', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();

    const where = {
      matchDate: { gte: now },
      OR: [{ result: 'PENDING' }, { result: null }],
      ...(sport ? { sport } : {}),
    };

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: Number(limit),
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
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)) || 1,
        },
      },
    });
  } catch (err) {
    console.error('Active predictions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/predictions/results
// Списък с резултати (settled), с филтър по период (days) и спорт.
// По подразбиране: последни 90 дни.
router.get('/results', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport, days = 90 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const to = new Date();
    const from = new Date(to.getTime() - Number(days) * 24 * 60 * 60 * 1000);

    const where = {
      settledAt: { gte: from, lte: to },
      result: { in: ['WIN', 'LOSS', 'VOID', 'PUSH'] },
      ...(sport ? { sport } : {}),
    };

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { settledAt: 'desc' },
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
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)) || 1,
        },
      },
    });
  } catch (err) {
    console.error('Results predictions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/predictions/:id/settle
// Админ маркира резултат: { result: 'WIN' | 'LOSS' | 'VOID' | 'PUSH' }
router.post('/:id/settle', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    const allowed = ['WIN', 'LOSS', 'VOID', 'PUSH'];
    if (!allowed.includes(result)) {
      return res.status(400).json({ success: false, message: 'Invalid result' });
    }

    const prediction = await prisma.prediction.findUnique({ where: { id } });
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    const updated = await prisma.prediction.update({
      where: { id },
      data: {
        result,
        settledAt: new Date(),
        status: 'FINISHED',
      },
    });

    res.json({ success: true, data: { prediction: updated } });
  } catch (err) {
    console.error('Settle prediction error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;