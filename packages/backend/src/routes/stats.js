import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/stats/predictions?days=90&sport=<optional>
 * Връща агрегирана статистика (Wins/Losses/Void/Push) и Success Rate за период
 */
router.get('/predictions', async (req, res) => {
  try {
    const { days = 90, sport } = req.query;

    const to = new Date();
    const from = new Date(to.getTime() - Number(days) * 24 * 60 * 60 * 1000);

    const where = {
      settledAt: { gte: from, lte: to },
      result: { in: ['WIN', 'LOSS', 'VOID', 'PUSH'] },
      ...(sport ? { sport: String(sport) } : {}),
    };

    const items = await prisma.prediction.findMany({
      where,
      select: { sport: true, result: true },
    });

    const agg = {
      overall: { wins: 0, losses: 0, voids: 0, pushes: 0, totalCount: 0, successRate: 0 },
      bySport: {},
    };

    for (const it of items) {
      agg.overall.totalCount += 1;
      if (it.result === 'WIN') agg.overall.wins += 1;
      else if (it.result === 'LOSS') agg.overall.losses += 1;
      else if (it.result === 'VOID') agg.overall.voids += 1;
      else if (it.result === 'PUSH') agg.overall.pushes += 1;

      const s = it.sport || 'Unknown';
      if (!agg.bySport[s]) {
        agg.bySport[s] = { wins: 0, losses: 0, voids: 0, pushes: 0, totalCount: 0, successRate: 0 };
      }
      agg.bySport[s].totalCount += 1;
      if (it.result === 'WIN') agg.bySport[s].wins += 1;
      else if (it.result === 'LOSS') agg.bySport[s].losses += 1;
      else if (it.result === 'VOID') agg.bySport[s].voids += 1;
      else if (it.result === 'PUSH') agg.bySport[s].pushes += 1;
    }

    const denomOverall = agg.overall.wins + agg.overall.losses;
    agg.overall.successRate = denomOverall > 0 ? +(agg.overall.wins / denomOverall * 100).toFixed(2) : 0;

    const bySportArr = Object.entries(agg.bySport).map(([sportName, v]) => {
      const denom = v.wins + v.losses;
      return {
        sport: sportName,
        wins: v.wins,
        losses: v.losses,
        voids: v.voids,
        pushes: v.pushes,
        totalCount: v.totalCount,
        successRate: denom > 0 ? +(v.wins / denom * 100).toFixed(2) : 0,
      };
    });

    res.json({
      success: true,
      data: {
        period: { from: from.toISOString(), to: to.toISOString(), days: Number(days) },
        overall: agg.overall,
        bySport: bySportArr,
      },
    });
  } catch (err) {
    console.error('Stats predictions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;