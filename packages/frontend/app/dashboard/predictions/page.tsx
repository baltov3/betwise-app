'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import UpsellModal from '../../../components/UpsellModal';
import { api } from '../../../lib/api';
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
  locked?: boolean;
}

interface Subscription {
  status: string;
  endDate?: string;
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
  const min =
    sport && SPORT_LIVE_DURATION_MIN[sport] != null
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

// Лек скелетон за по-приятен loading
function SkeletonCard() {
  return (
    <div className="card relative overflow-hidden">
      <div className="animate-pulse">
        <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
        <div className="h-6 w-2/3 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-full bg-gray-200 rounded mb-2" />
        <div className="h-4 w-5/6 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Абонамент
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);

  // Филтър и ред
  const [selectedSport, setSelectedSport] = useState<(typeof SPORTS_FILTERS)[number]>('All');
  const [orderMode, setOrderMode] = useState<OrderMode>('Desc');

  const nowMs = useNow(1000);

  useEffect(() => {
    fetchPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedSport]);

  // авто-рефреш
  useEffect(() => {
    const t = setInterval(fetchPredictions, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedSport]);

  function isSubActive(sub: Subscription | null) {
    return Boolean(
      sub && sub.status === 'ACTIVE' && sub.endDate && new Date(sub.endDate) > new Date()
    );
  }

  async function fetchPredictions() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(currentPage), limit: '10' });
      if (selectedSport !== 'All') params.append('sport', selectedSport);

      const [subRes, response] = await Promise.all([
        api
          .get('/subscriptions/status')
          .catch(() => ({ data: { data: { subscription: null } } } as any)),
        api.get(`/predictions/active?${params.toString()}`),
      ]);

      setSubscription(subRes.data?.data?.subscription || null);

      const isActive = isSubActive(subRes.data?.data?.subscription || null);
      const server = (response.data?.data?.predictions as Prediction[]) || [];
      const withLock = isActive
        ? server.map((p) => ({ ...p, locked: false }))
        : server.map((p) => ({ ...p, locked: true }));

      setPredictions(withLock);
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
    return predictions
      .map((p) => {
        const startMs = new Date(p.matchDate).getTime();
        const liveUntilMs = p.liveUntil ? new Date(p.liveUntil).getTime() : startMs + getLiveDurationMs(p.sport);
        const statusComputed =
          p.statusComputed ?? (now < startMs ? 'SCHEDULED' : now <= liveUntilMs ? 'LIVE' : 'SCHEDULED');
        return {
          ...p,
          statusComputed,
          liveUntil: new Date(liveUntilMs).toISOString(),
        };
      })
      .filter((p) => p.statusComputed === 'SCHEDULED' || p.statusComputed === 'LIVE');
  }, [predictions, nowMs]);

  // Сортиране: LIVE винаги най-отгоре, вътре по коефициент
  const sortedPredictions = useMemo(() => {
    const lives = enrichedPredictions.filter((p) => p.statusComputed === 'LIVE');
    const normal = enrichedPredictions.filter((p) => p.statusComputed !== 'LIVE');

    const cmpOdds = (a: Prediction, b: Prediction) => {
      const diff = a.odds - b.odds;
      if (diff === 0) {
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
      <UpsellModal open={showUpsell} onClose={() => setShowUpsell(false)} />
      <div className="space-y-8">
        {/* Hero/intro */}
        <div className="rounded-xl p-5 bg-gradient-to-r from-primary-50 via-white to-emerald-50 border border-primary-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                Sports Predictions
              </h1>
              <p className="text-sm text-gray-600">
                See live odds. Unlock expert analysis and rationale with a subscription.
              </p>
            </div>
            {!isSubActive(subscription) && (
              <button
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 shadow"
                onClick={() => setShowUpsell(true)}
              >
                Unlock full access
              </button>
            )}
          </div>
        </div>

        {/* Филтри и сортиране */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {SPORTS_FILTERS.map((sport) => (
              <button
                key={sport}
                onClick={() => {
                  setSelectedSport(sport);
                  setCurrentPage(1);
                }}
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
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="Asc">Asc (lowest first)</option>
              <option value="Desc">Desc (highest first)</option>
            </select>
          </div>
        </div>

        {/* Списък с прогнози/скелетони */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : sortedPredictions.length > 0 ? (
          <div className="space-y-6">
            {sortedPredictions.map((p) => {
              const isLive = p.statusComputed === 'LIVE';
              const msLeft =
                isLive && p.liveUntil ? Math.max(0, new Date(p.liveUntil).getTime() - nowMs) : 0;
              const locked = p.locked === true || !isSubActive(subscription);

              return (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-xl p-4 border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{
                    borderImage: 'linear-gradient(90deg, rgba(16,185,129,.5), rgba(59,130,246,.5)) 1',
                  }}
                >
                  <div className="flex justify-between items-start gap-6">
                    {/* Лява колона */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="inline-block px-3 py-1 text-xs font-semibold bg-primary-100 text-primary-800 rounded-full">
                          {p.sport}
                        </span>

                        {isLive && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold bg-red-100 text-red-700 rounded-full">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                            LIVE · {formatCountdown(msLeft)}
                          </span>
                        )}

                        <span className="text-xs text-gray-500">by {p.creator.email}</span>

                        {locked && (
                          <button
                            className="ml-auto inline-flex items-center gap-2 rounded-full bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 text-xs shadow focus:outline-none focus:ring-2 focus:ring-primary-400"
                            onClick={() => setShowUpsell(true)}
                            aria-label="Отключи съдържанието"
                            title="Отключи съдържанието – от $9.99/мес"
                          >
                            <span aria-hidden>🔒</span>
                            <span>Отключи съдържанието</span>
                          </button>
                        )}
                      </div>

                      {/* Title + Description */}
                      <div
                        className={locked ? 'blur-[5px] select-none cursor-pointer' : ''}
                        onClick={() => locked && setShowUpsell(true)}
                      >
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 truncate">
                          {p.title}
                        </h3>
                        <p className="text-gray-600 mb-2 md:mb-3 line-clamp-3">{p.description}</p>
                      </div>

                      {/* Показваме датата САМО ако съдържанието не е заключено */}
                      {!locked && (
                        <div className="mt-1 text-xs text-gray-500">
                          Kick-off: {new Date(p.matchDate).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Дясна колона: Odds */}
                    <div className="text-right shrink-0">
                      <div className="relative min-w-[124px] rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-green-100 ring-1 ring-emerald-200 shadow-sm transition-transform duration-200 hover:scale-[1.02]">
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-medium text-emerald-700">Odds</span>
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
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No predictions found.</p>
          </div>
        )}

        {/* Marquee/rotator */}
        <div className="mt-2">
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