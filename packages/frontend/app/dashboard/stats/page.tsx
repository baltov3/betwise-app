'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Prediction {
  id: string;
  sport: string;
  title: string;
  description?: string;
  odds: number;
  matchDate: string;
  status?: string;
  creator?: {
    email: string;
  };
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [months] = useState(2);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      // request a large limit so we can compute stats client-side
      const res = await api.get(`/predictions?limit=1000`);
      setPredictions(res.data.data.predictions || []);
    } catch (err) {
      console.error('Failed to load predictions for stats', err);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const from = new Date();
  from.setMonth(now.getMonth() - months);

  const pastPreds = predictions.filter((p) => {
    const d = new Date(p.matchDate);
    return d >= from && d <= now;
  });

  const total = pastPreds.length;
  const won = pastPreds.filter((p) => p.status === 'WON').length;
  const lost = pastPreds.filter((p) => p.status === 'LOST').length;
  const winRate = total > 0 ? (won / total) * 100 : 0;

  // group by day
  const byDayMap: Record<string, { total: number; won: number }> = {};
  pastPreds.forEach((p) => {
    const day = format(new Date(p.matchDate), 'yyyy-MM-dd');
    if (!byDayMap[day]) byDayMap[day] = { total: 0, won: 0 };
    byDayMap[day].total += 1;
    if (p.status === 'WON') byDayMap[day].won += 1;
  });

  const byDay = Object.keys(byDayMap)
    .sort()
    .map((day) => ({ day, ...byDayMap[day] }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Statistics — Last {months} months</h1>
          <p className="text-gray-600">Summary of predictions with match dates in the selected period.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded">
                <h3 className="text-sm text-gray-500">Total (past {months} months)</h3>
                <p className="text-xl font-semibold">{total}</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="text-sm text-gray-500">Won</h3>
                <p className="text-xl font-semibold">{won}</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="text-sm text-gray-500">Win rate</h3>
                <p className="text-xl font-semibold">{winRate.toFixed(2)}%</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-medium mb-3">Daily breakdown</h2>
              {byDay.length === 0 ? (
                <div className="text-gray-500">No past predictions in this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr>
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">Total</th>
                        <th className="p-2 border">Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDay.map((row) => (
                        <tr key={row.day}>
                          <td className="p-2 border">{format(new Date(row.day), 'MMM dd, yyyy')}</td>
                          <td className="p-2 border">{row.total}</td>
                          <td className="p-2 border">{row.won}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}