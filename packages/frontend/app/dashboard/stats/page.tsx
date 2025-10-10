'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface Stats {
  overall: {
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    voidPicks: number;
    upcomingPicks: number;
    expiredPicks: number;
    hitRate: number;
    avgOdds: number;
    roi: number;
  };
  byMonth: Array<{
    month: string;
    total: number;
    won: number;
    lost: number;
    void: number;
    upcoming: number;
    expired: number;
  }>;
  byCategory: Array<{
    category: string;
    slug: string;
    total: number;
    won: number;
    lost: number;
    void: number;
    hitRate: string;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2m');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stats/predictions?period=${period}`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">No statistics available.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prediction Statistics</h1>
            <p className="text-gray-600">Performance overview for the last {period}</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="1m">Last Month</option>
            <option value="2m">Last 2 Months</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
          </select>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Total Picks</p>
            <p className="text-3xl font-bold text-gray-900">{stats.overall.totalPicks}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Hit Rate</p>
            <p className="text-3xl font-bold text-green-600">{stats.overall.hitRate.toFixed(2)}%</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Average Odds</p>
            <p className="text-3xl font-bold text-blue-600">{stats.overall.avgOdds.toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">ROI</p>
            <p className={`text-3xl font-bold ${stats.overall.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.overall.roi >= 0 ? '+' : ''}{stats.overall.roi.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-700 mb-1">Won</p>
            <p className="text-2xl font-bold text-green-900">{stats.overall.wonPicks}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-700 mb-1">Lost</p>
            <p className="text-2xl font-bold text-red-900">{stats.overall.lostPicks}</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-blue-900">{stats.overall.upcomingPicks}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">Void</p>
            <p className="text-2xl font-bold text-gray-900">{stats.overall.voidPicks}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 mb-1">Expired</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.overall.expiredPicks}</p>
          </div>
        </div>

        {/* Stats by Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Stats by Category</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Category</th>
                  <th className="text-right py-2 px-4">Total</th>
                  <th className="text-right py-2 px-4">Won</th>
                  <th className="text-right py-2 px-4">Lost</th>
                  <th className="text-right py-2 px-4">Void</th>
                  <th className="text-right py-2 px-4">Hit Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCategory.map((cat) => (
                  <tr key={cat.slug} className="border-b">
                    <td className="py-2 px-4">{cat.category}</td>
                    <td className="text-right py-2 px-4">{cat.total}</td>
                    <td className="text-right py-2 px-4 text-green-600">{cat.won}</td>
                    <td className="text-right py-2 px-4 text-red-600">{cat.lost}</td>
                    <td className="text-right py-2 px-4">{cat.void}</td>
                    <td className="text-right py-2 px-4 font-semibold">{cat.hitRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats by Month */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Month</th>
                  <th className="text-right py-2 px-4">Total</th>
                  <th className="text-right py-2 px-4">Won</th>
                  <th className="text-right py-2 px-4">Lost</th>
                  <th className="text-right py-2 px-4">Void</th>
                  <th className="text-right py-2 px-4">Upcoming</th>
                  <th className="text-right py-2 px-4">Expired</th>
                </tr>
              </thead>
              <tbody>
                {stats.byMonth.map((month) => (
                  <tr key={month.month} className="border-b">
                    <td className="py-2 px-4">{month.month}</td>
                    <td className="text-right py-2 px-4">{month.total}</td>
                    <td className="text-right py-2 px-4 text-green-600">{month.won}</td>
                    <td className="text-right py-2 px-4 text-red-600">{month.lost}</td>
                    <td className="text-right py-2 px-4">{month.void}</td>
                    <td className="text-right py-2 px-4 text-blue-600">{month.upcoming}</td>
                    <td className="text-right py-2 px-4 text-yellow-600">{month.expired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
