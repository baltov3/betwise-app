'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import RotatingMatches from '../../../components/RotatingMatches';

interface Prediction {
  id: string;
  sport: string;
  title: string;
  description: string;
  odds: number;
  matchDate: string;
  creator: { email: string };
  statusComputed?: 'SCHEDULED' | 'LIVE';
  liveUntil?: string;
}

const SPORTS_FILTERS = ['All', 'Football', 'Basketball', 'Tennis', 'Soccer', 'Baseball'] as const;
type OrderMode = 'Asc' | 'Desc';

// Live прозорец по спорт (в минути)
const SPORT_LIVE_DURATION_MIN: Record<string, number> = {
  Football: 105,
  Soccer: 105,
  Basketball: 150,
  Tennis: 180,
  Baseball: 240,
  __default: 120,
};
function getLiveDurationMs(sport?: string) {
  const min = sport && SPORT_LIVE_DURATION_MIN[sport] != null
    ? SPORT_LIVE_DURATION_MIN[sport]
    : SPORT_LIVE_DURATION_MIN.__default;
  return min * 60 * 1000;
}

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);
  return now;
}

function formatCountdown(msLeft: number) {
  if (msLeft <= 0) return '00:00';
  const totalSec = Math.floor(msLeft / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Филтър и ред
  const [selectedSport, setSelectedSport] = useState<(typeof SPORTS_FILTERS)[number]>('All');
  const [orderMode, setOrderMode] = useState<OrderMode>('Desc'); // По подразбиране: най-високите коефициенти най-отгоре

  const nowMs = useNow(1000);

  useEffect(() => { fetchPredictions(); }, [currentPage, selectedSport]);

  // авто-рефреш
  useEffect(() => {
    const t = setInterval(fetchPredictions, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedSport]);

  async function fetchPredictions() {
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
  }

  // Обогатяване: изчисляваме статус и liveUntil и клиентски, ако липсват от бекенда
  const enrichedPredictions = useMemo(() => {
    const now = nowMs;
    return predictions.map((p) => {
      const startMs = new Date(p.matchDate).getTime();
      const liveUntilMs = p.liveUntil
        ? new Date(p.liveUntil).getTime()
        : startMs + getLiveDurationMs(p.sport);
      const statusComputed =
        p.statusComputed ??
        (now < startMs ? 'SCHEDULED' : now <= liveUntilMs ? 'LIVE' : 'SCHEDULED');
      return {
        ...p,
        statusComputed,
        liveUntil: new Date(liveUntilMs).toISOString(),
      };
    })
    // активни: само SCHEDULED или LIVE
    .filter((p) => p.statusComputed === 'SCHEDULED' || p.statusComputed === 'LIVE');
  }, [predictions, nowMs]);

  // Сортиране: LIVE винаги най-отгоре (независимо), като вътре и те са по коефициент.
  const sortedPredictions = useMemo(() => {
    const lives = enrichedPredictions.filter(p => p.statusComputed === 'LIVE');
    const normal = enrichedPredictions.filter(p => p.statusComputed !== 'LIVE');

    const cmpOdds = (a: Prediction, b: Prediction) => {
      const diff = a.odds - b.odds;
      if (diff === 0) {
        // tie-break по дата за стабилен ред
        const dateDiff = new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
        return orderMode === 'Asc' ? dateDiff : -dateDiff;
      }
      return orderMode === 'Asc' ? diff : -diff;
    };

    lives.sort(cmpOdds);
    normal.sort(cmpOdds);

    return [...lives, ...normal];
  }, [enrichedPredictions, orderMode]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Sports Predictions</h1>
          <p className="text-gray-600">Browse our latest expert predictions</p>
        </div>

        {/* Филтър по спорт + Ред по коефициент, LIVE е винаги най-отгоре */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {SPORTS_FILTERS.map((sport) => (
              <button
                key={sport}
                onClick={() => { setSelectedSport(sport); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedSport === sport
                    ? 'bg-primary-600 text-white shadow'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Order by Odds:</span>
            <select
              value={orderMode}
              onChange={(e) => setOrderMode(e.target.value as OrderMode)}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm"
            >
              <option value="Asc">Asc (lowest first)</option>
              <option value="Desc">Desc (highest first)</option>
            </select>
          </div>
        </div>

        {/* Списък с прогнози */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : sortedPredictions.length > 0 ? (
          <div className="space-y-6">
            {sortedPredictions.map((p) => {
              const isLive = p.statusComputed === 'LIVE';
              const msLeft = isLive && p.liveUntil ? Math.max(0, new Date(p.liveUntil).getTime() - nowMs) : 0;
              return (
                <div key={p.id} className="card group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-block px-3 py-1 text-sm font-semibold bg-primary-100 text-primary-800 rounded-full">{p.sport}</span>
                        {isLive && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                            LIVE · {formatCountdown(msLeft)}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">by {p.creator.email}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h3>
                      <p className="text-gray-600 mb-4">{p.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Kick-off: {format(new Date(p.matchDate), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>

                    {/* Коефициент – зелен и ефектен */}
                    <div className="text-right ml-6">
                      <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-green-100 ring-1 ring-emerald-200 shadow-sm group-hover:shadow-md transition-all">
                        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-medium text-emerald-700">Odds</span>
                        </div>
                        <p className="mt-1 text-3xl font-extrabold tracking-tight bg-gradient-to-br from-emerald-600 to-green-700 bg-clip-text text-transparent">
                          {p.odds}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50">Previous</button>
                <span className="px-4 py-2 text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-gray-500">No predictions found.</p></div>
        )}

        {/* Recent Matches — най-долу */}
        <div className="mt-8">
          <RotatingMatches
            key={`rr-bottom-${selectedSport}`}
            days={90}
            limit={24}
            sport={selectedSport !== 'All' ? selectedSport : undefined}
            direction="ltr"
            speedPxPerSec={60}
            refreshMs={60000}
            chronological={true}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}