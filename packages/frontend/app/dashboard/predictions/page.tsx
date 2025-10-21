'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import DonutChart from '../../../components/DonutChart';
import RotatingMatches from '../../../components/RotatingMatches';

interface Prediction {
  id: string;
  sport: string;
  title: string;
  description: string;
  odds: number;
  matchDate: string;
  creator: { email: string };
}

type StatsOverall = {
  wins: number;
  losses: number;
  voids: number;
  pushes: number;
  totalCount: number;
  successRate: number;
};

const SPORTS_FILTERS = ['All', 'Football', 'Basketball', 'Tennis', 'Soccer', 'Baseball'];
const PERIODS = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }];

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statsDays, setStatsDays] = useState(90);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsOverall, setStatsOverall] = useState<StatsOverall | null>(null);

  useEffect(() => { fetchPredictions(); }, [selectedSport, currentPage]);
  useEffect(() => { fetchStats(); }, [selectedSport, statsDays]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(currentPage), limit: '10' });
      if (selectedSport !== 'All') params.append('sport', selectedSport);
      const response = await api.get(`/predictions/active?${params.toString()}`);
      setPredictions(response.data.data.predictions);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const params = new URLSearchParams({ days: String(statsDays) });
      if (selectedSport !== 'All') params.append('sport', selectedSport);
      const res = await api.get(`/stats/predictions?${params.toString()}`);
      setStatsOverall(res.data?.data?.overall ?? null);
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  };

  const donutData = useMemo(() => {
    const wins = statsOverall?.wins ?? 0;
    const losses = statsOverall?.losses ?? 0;
    return [
      { label: 'Wins', value: wins, color: '#16a34a' },
      { label: 'Losses', value: losses, color: '#dc2626' },
    ];
  }, [statsOverall]);

  const successRateLabel = useMemo(() => statsOverall ? `${statsOverall.successRate}%` : undefined, [statsOverall]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Sports Predictions</h1>
          <p className="text-gray-600">Browse our latest expert predictions</p>
        </div>

        {/* Stats панел */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-primary-50 via-white to-secondary-50 shadow-sm">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary-200 opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-secondary-200 opacity-30 blur-3xl" />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div className="flex items-center justify-center">
              <div className="group hover:scale-[1.02] transition-transform duration-300">
                <DonutChart data={donutData} size={200} thickness={22} centerLabel={successRateLabel} centerSubLabel="Success" />
                <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                    <span className="text-gray-700">Wins</span>
                    <span className="text-gray-500">({statsOverall?.wins ?? 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                    <span className="text-gray-700">Losses</span>
                    <span className="text-gray-500">({statsOverall?.losses ?? 0})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Филтри */}
            <div className="flex flex-col items-center md:items-start justify-center gap-3">
              <div className="text-sm text-gray-500">Filters</div>
              <div className="flex flex-wrap gap-2">
                {SPORTS_FILTERS.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => { setSelectedSport(sport); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow ${
                      selectedSport === sport ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Period:</span>
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.days}
                      onClick={() => setStatsDays(p.days)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-all duration-200 hover:shadow ${
                        statsDays === p.days ? 'bg-secondary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-end">
              <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow transition-shadow duration-200">
                <div className="text-xs text-gray-500">Note</div>
                <div className="text-sm text-gray-700 max-w-[240px]">
                  Statistics are based on settled predictions for the selected period. Void/Push do not affect success rate.
                </div>
              </div>
            </div>
          </div>

          {statsLoading && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="animate-pulse h-full w-full bg-gradient-to-b from-transparent via-white/40 to-transparent" />
            </div>
          )}
        </div>

        {/* Predictions */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : predictions.length > 0 ? (
          <div className="space-y-6">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="card group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-block px-3 py-1 text-sm font-semibold bg-primary-100 text-primary-800 rounded-full">{prediction.sport}</span>
                      <span className="text-sm text-gray-500">by {prediction.creator.email}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{prediction.title}</h3>
                    <p className="text-gray-600 mb-4">{prediction.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Match Date: {format(new Date(prediction.matchDate), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <div className="bg-green-50 p-4 rounded-lg group-hover:shadow-inner transition-shadow duration-200">
                      <p className="text-2xl font-bold text-green-600">{prediction.odds}</p>
                      <p className="text-sm text-green-700">Odds</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-gray-500">No predictions found.</p></div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50">Previous</button>
            <span className="px-4 py-2 text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50">Next</button>
          </div>
        )}

        {/* Recent Results — вече следва периода И спорта */}
        <div className="mt-6">
          <RotatingMatches
            key={`rr-${statsDays}-${selectedSport}`}     // force re-mount при сменен период/спорт
            days={statsDays}
            limit={10}
            sport={selectedSport !== 'All' ? selectedSport : undefined}
            intervalMs={2500}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}