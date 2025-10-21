'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';

type Item = {
  id: string;
  sport: string;
  title: string;
  result?: 'WIN' | 'LOSS' | 'VOID' | 'PUSH' | 'PENDING';
  settledAt?: string | null;
  matchDate: string;
};

type Direction = 'ltr' | 'rtl';

export default function RotatingMatches({
  days = 90,
  limit = 24,
  intervalMs = 3000, // not used in marquee mode, kept for backward compat
  direction = 'ltr',
  speedPxPerSec = 50, // колко пиксела в секунда да се движи лентата
}: {
  days?: number;
  limit?: number;
  intervalMs?: number;
  direction?: Direction;
  speedPxPerSec?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // refs за контейнера и пистата (track)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // позиция X за translateX
  const [x, setX] = useState<number>(0);
  const xRef = useRef(0);
  const [paused, setPaused] = useState(false);

  // товарим последните резултати
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/predictions/results?days=${days}&page=1&limit=${limit}`);
        if (!active) return;
        setItems(res.data?.data?.predictions ?? []);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [days, limit]);

  // дублираме списъка за безкраен loop
  const marqueeItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    // показваме поне 10, ако limit < 10, но backend ограничава по limit; тук само въртим каквото има
    return [...items, ...items];
  }, [items]);

  // измерване ширина на половин трек (оригиналния списък)
  const halfTrackWidthRef = useRef<number>(0);

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      // половината е ширината на реалния списък (преди дублиране)
      // Приемаме, че всеки елемент е със фиксирана ширина (min-w-[220px])
      // и track съдържа [items, items]
      const total = trackRef.current.scrollWidth;
      halfTrackWidthRef.current = total / 2;
    };
    // малък timeout за да се рендерира съдържанието
    const t = setTimeout(measure, 0);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [marqueeItems.length]);

  // анимация: translateX от -halfWidth до 0 (LTR), после reset обратно
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    xRef.current = direction === 'ltr' ? -halfTrackWidthRef.current : 0;
    setX(xRef.current);

    const step = (ts: number) => {
      const dt = (ts - lastTs) / 1000; // секунди
      lastTs = ts;

      if (!paused && halfTrackWidthRef.current > 0) {
        const delta = speedPxPerSec * dt;
        if (direction === 'ltr') {
          // движим надясно: увеличаваме X, когато стигнем 0 -> reset на -halfWidth
          xRef.current += delta;
          if (xRef.current >= 0) {
            xRef.current = -halfTrackWidthRef.current;
          }
        } else {
          // движим наляво: намаляваме X, когато стигнем -halfWidth -> reset на 0
          xRef.current -= delta;
          if (xRef.current <= -halfTrackWidthRef.current) {
            xRef.current = 0;
          }
        }
        setX(xRef.current);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [direction, speedPxPerSec, paused, marqueeItems.length]);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Recent Results</h3>
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
        <div className="h-16 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Recent Results</h3>
        </div>
        <div className="text-gray-500 text-sm">No recent results.</div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-white p-3 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Recent Results</h3>
        <div className="text-xs text-gray-500">{paused ? 'Paused' : 'Auto-scrolling'}</div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ width: '100%' }}
      >
        <div
          ref={trackRef}
          className="flex gap-3 will-change-transform"
          style={{
            transform: `translateX(${x}px)`,
            transition: 'transform 0s linear', // движим се с RAF, не с CSS transition
          }}
        >
          {marqueeItems.map((it, i) => {
            const colorBg =
              it.result === 'WIN' ? 'bg-green-50 border-green-200' :
              it.result === 'LOSS' ? 'bg-red-50 border-red-200' :
              it.result === 'VOID' ? 'bg-gray-50 border-gray-200' :
              it.result === 'PUSH' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200';

            const badge =
              it.result === 'WIN' ? 'bg-green-600 text-white' :
              it.result === 'LOSS' ? 'bg-red-600 text-white' :
              it.result === 'VOID' ? 'bg-gray-600 text-white' :
              it.result === 'PUSH' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700';

            return (
              <div
                key={it.id + '-' + i}
                className={`min-w-[220px] max-w-[220px] border rounded-lg p-3 ${colorBg}`}
              >
                <div className="text-xs text-gray-500">{it.sport}</div>
                <div className="text-sm font-semibold text-gray-900 line-clamp-2">{it.title}</div>
                <div className="mt-2 text-xs text-gray-500">
                  {it.settledAt ? new Date(it.settledAt).toLocaleString() : new Date(it.matchDate).toLocaleString()}
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge}`}>
                    {it.result ?? 'PENDING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}