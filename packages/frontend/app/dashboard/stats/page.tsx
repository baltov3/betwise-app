'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

type Overall = {
  wins: number;
  losses: number;
  voids: number;
  pushes: number;
  totalCount: number;
  successRate: number;
};

type SportRow = Overall & { sport: string };

export default function StatsPage() {
  const [days, setDays] = useState(90);
  const [overall, setOverall] = useState<Overall | null>(null);
  const [bySport, setBySport] = useState<SportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/stats/predictions?days=${days}`);
      setOverall(res.data?.data?.overall ?? null);
      setBySport(res.data?.data?.bySport ?? []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Platform Stats</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Period (days)</label>
            <select
              className="border rounded px-2 py-1"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : !overall ? (
          <div>No data</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card">
                <div className="text-sm text-gray-500">Wins</div>
                <div className="text-2xl font-bold">{overall.wins}</div>
              </div>
              <div className="card">
                <div className="text-sm text-gray-500">Losses</div>
                <div className="text-2xl font-bold">{overall.losses}</div>
              </div>
              <div className="card">
                <div className="text-sm text-gray-500">Void</div>
                <div className="text-2xl font-bold">{overall.voids}</div>
              </div>
              <div className="card">
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="text-2xl font-bold">{overall.successRate}%</div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mt-6 mb-2">By Sport</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr>
                      <th className="p-2 border">Sport</th>
                      <th className="p-2 border">Wins</th>
                      <th className="p-2 border">Losses</th>
                      <th className="p-2 border">Void</th>
                      <th className="p-2 border">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySport.map((row) => (
                      <tr key={row.sport}>
                        <td className="p-2 border">{row.sport}</td>
                        <td className="p-2 border">{row.wins}</td>
                        <td className="p-2 border">{row.losses}</td>
                        <td className="p-2 border">{row.voids}</td>
                        <td className="p-2 border">{row.successRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}