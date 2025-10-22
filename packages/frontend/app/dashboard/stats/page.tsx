'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import DonutChart from '../../../components/DonutChart';
import RotatingMatches from '../../../components/RotatingMatches';

type Overall = {
  wins: number;
  losses: number;
  voids: number;
  pushes: number;
  totalCount: number;
  successRate: number;
};

type SportRow = Overall & { sport: string };

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function useCountUp(target: number, durationMs = 800) {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    setVal(0);
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / durationMs);
      setVal(Math.round(target * p));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, durationMs]);

  return val;
}

export default function StatsPage() {
  const [days, setDays] = useState(90);
  const [sport, setSport] = useState<string>('All');
  const [overall, setOverall] = useState<Overall | null>(null);
  const [bySport, setBySport] = useState<SportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const winsAnimated = useCountUp(overall?.wins ?? 0);
  const lossesAnimated = useCountUp(overall?.losses ?? 0);
  const rateAnimated = useCountUp(Math.round(overall?.successRate ?? 0));

  const donutData = useMemo(
    () => [
      { label: 'Wins', value: overall?.wins ?? 0, color: '#16a34a' },
      { label: 'Losses', value: overall?.losses ?? 0, color: '#dc2626' },
    ],
    [overall]
  );

  const sportChips = useMemo(() => {
    const names = ['All', ...bySport.map((s) => s.sport).filter((v, i, arr) => arr.indexOf(v) === i)];
    return names;
  }, [bySport]);

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ days: String(days) });
      if (sport !== 'All') params.append('sport', sport);
      const res = await api.get(`/stats/predictions?${params.toString()}`);
      setOverall(res.data?.data?.overall ?? null);
      setBySport(res.data?.data?.bySport ?? []);
    } catch (e: any) {
      // soft-fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, sport]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Back button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Statistics</h1>
            <p className="text-gray-600">Performance overview of settled predictions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 transition"
              title="Refresh"
            >
              Refresh
            </button>
            <Link
              href="/dashboard/predictions"
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Colorful gradient stats panel */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-primary-50 via-white to-secondary-50 shadow-sm">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary-200 opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-secondary-200 opacity-30 blur-3xl" />

          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Donut */}
            <div className="flex items-center justify-center">
              <div className="group hover:scale-[1.02] transition-transform duration-300">
                <DonutChart
                  data={donutData}
                  size={220}
                  thickness={24}
                  centerLabel={`${rateAnimated}%`}
                  centerSubLabel="Success"
                />
                <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                    <span className="text-gray-700">Wins</span>
                    <span className="text-gray-500">({winsAnimated})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                    <span className="text-gray-700">Losses</span>
                    <span className="text-gray-500">({lossesAnimated})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col items-center lg:items-start justify-center gap-3">
              <div className="text-sm text-gray-500">Filters</div>
              <div className="flex flex-wrap gap-2">
                {sportChips.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSport(s)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow ${
                      sport === s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Period:</span>
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.days}
                      onClick={() => setDays(p.days)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-all duration-200 hover:shadow ${
                        days === p.days ? 'bg-secondary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                <div className="card hover:shadow-md transition-shadow duration-200">
                  <div className="text-xs text-gray-500">Success Rate</div>
                  <div className="text-xl font-bold">{rateAnimated}%</div>
                </div>
                <div className="card hover:shadow-md transition-shadow duration-200">
                  <div className="text-xs text-gray-500">Wins</div>
                  <div className="text-xl font-bold text-green-600">{winsAnimated}</div>
                </div>
                <div className="card hover:shadow-md transition-shadow duration-200">
                  <div className="text-xs text-gray-500">Losses</div>
                  <div className="text-xl font-bold text-red-600">{lossesAnimated}</div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow transition-shadow duration-200">
                <div className="text-xs text-gray-500">Note</div>
                <div className="text-sm text-gray-700 max-w-[280px]">
                  Statistics are based on settled predictions for the selected period. Void/Push do not affect success rate.
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="animate-pulse h-full w-full bg-gradient-to-b from-transparent via-white/40 to-transparent" />
            </div>
          )}
        </div>

        {/* Rotating strip of matches (every 3rd pops) */}
        <RotatingMatches days={days} limit={24} sport={sport !== 'All' ? sport : undefined} direction="ltr"  speedPxPerSec={60} refreshMs={60000}  />
      </div>
    </DashboardLayout>
  );
}