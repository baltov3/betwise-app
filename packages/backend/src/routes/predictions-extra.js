import express from 'express';
import prisma from '../../../backend/prisma/db/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();


// GET /api/predictions/results?days=90&sport=<optional>  (съществуващ)
router.get('/results', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport, days = 90 } = req.query;
    const pageN = parseInt(String(page), 10);
    const limitN = parseInt(String(limit), 10);
    const skip = (pageN - 1) * limitN;

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
        take: limitN,
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
          page: pageN,
          limit: limitN,
          total,
          pages: Math.ceil(total / limitN) || 1,
        },
      },
    });
  } catch (err) {
    console.error('Results predictions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// NEW: GET /api/predictions/to-settle?page=1&limit=100&sport=<optional>
// Връща мачове, които са минали, но НЕ са уредени (result=PENDING, settledAt=null)
router.get('/to-settle', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, sport } = req.query;
    const pageN = parseInt(String(page), 10);
    const limitN = parseInt(String(limit), 10);
    const skip = (pageN - 1) * limitN;

    const now = new Date();

    const where = {
      matchDate: { lt: now },
      result: 'PENDING',
      settledAt: null,
      status: { not: 'LIVE' }, // НЕ показваме LIVE за уреждане
      ...(sport ? { sport: String(sport) } : {}),
    };

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limitN,
        orderBy: { matchDate: 'desc' },
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
    console.error('To-settle predictions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/predictions/:id/settle
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

    // Забрана: не може да се урежда докато е LIVE
    if (prediction.status === 'LIVE') {
      return res.status(400).json({ success: false, message: 'Cannot settle a LIVE prediction' });
    }

    // Доп. защита: не може преди началото на мача
    const now = new Date();
    if (prediction.matchDate > now) {
      return res.status(400).json({ success: false, message: 'Cannot settle before the match starts' });
    }

    // Ако вече е уредена — блокирай
    if (prediction.settledAt || (prediction.result && prediction.result !== 'PENDING')) {
      return res.status(400).json({ success: false, message: 'Prediction already settled' });
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