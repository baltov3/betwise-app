import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get prediction statistics
router.get('/predictions', async (req, res) => {
  try {
    const { period = '2m' } = req.query;
    
    // Parse period (e.g., "2m" means 2 months)
    const months = parseInt(period.replace('m', '')) || 2;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get all predictions in the period
    const predictions = await prisma.prediction.findMany({
      where: {
        scheduledAt: {
          gte: startDate
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });

    // Calculate overall stats
    const totalPicks = predictions.length;
    const wonPicks = predictions.filter(p => p.status === 'WON').length;
    const lostPicks = predictions.filter(p => p.status === 'LOST').length;
    const voidPicks = predictions.filter(p => p.status === 'VOID').length;
    const upcomingPicks = predictions.filter(p => p.status === 'UPCOMING').length;
    const expiredPicks = predictions.filter(p => p.status === 'EXPIRED').length;

    const settledPicks = wonPicks + lostPicks;
    const hitRate = settledPicks > 0 ? ((wonPicks / settledPicks) * 100).toFixed(2) : 0;

    // Calculate average odds
    const avgOdds = predictions.length > 0
      ? (predictions.reduce((sum, p) => sum + parseFloat(p.odds), 0) / predictions.length).toFixed(2)
      : 0;

    // Calculate ROI (assuming 1 unit flat stake)
    let totalStake = settledPicks; // 1 unit per settled pick
    let totalReturn = 0;
    
    predictions.forEach(p => {
      if (p.status === 'WON') {
        totalReturn += parseFloat(p.odds);
      }
    });

    const roi = totalStake > 0 ? (((totalReturn - totalStake) / totalStake) * 100).toFixed(2) : 0;

    // Group by month
    const monthlyStats = {};
    predictions.forEach(p => {
      const monthKey = p.scheduledAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          total: 0,
          won: 0,
          lost: 0,
          void: 0,
          upcoming: 0,
          expired: 0,
        };
      }
      monthlyStats[monthKey].total++;
      if (p.status === 'WON') monthlyStats[monthKey].won++;
      if (p.status === 'LOST') monthlyStats[monthKey].lost++;
      if (p.status === 'VOID') monthlyStats[monthKey].void++;
      if (p.status === 'UPCOMING') monthlyStats[monthKey].upcoming++;
      if (p.status === 'EXPIRED') monthlyStats[monthKey].expired++;
    });

    // Group by category
    const categoryStats = {};
    predictions.forEach(p => {
      const categorySlug = p.category.slug;
      if (!categoryStats[categorySlug]) {
        categoryStats[categorySlug] = {
          category: p.category.name,
          slug: categorySlug,
          total: 0,
          won: 0,
          lost: 0,
          void: 0,
        };
      }
      categoryStats[categorySlug].total++;
      if (p.status === 'WON') categoryStats[categorySlug].won++;
      if (p.status === 'LOST') categoryStats[categorySlug].lost++;
      if (p.status === 'VOID') categoryStats[categorySlug].void++;
    });

    // Calculate hit rates for categories
    Object.values(categoryStats).forEach(cat => {
      const settled = cat.won + cat.lost;
      cat.hitRate = settled > 0 ? ((cat.won / settled) * 100).toFixed(2) : 0;
    });

    res.json({
      success: true,
      data: {
        overall: {
          totalPicks,
          wonPicks,
          lostPicks,
          voidPicks,
          upcomingPicks,
          expiredPicks,
          hitRate: parseFloat(hitRate),
          avgOdds: parseFloat(avgOdds),
          roi: parseFloat(roi),
        },
        byMonth: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month)),
        byCategory: Object.values(categoryStats),
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
