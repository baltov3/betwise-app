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
  sport,
  // Авто-скрол настройки
  direction = 'ltr',
  speedPxPerSec = 50,
  // периодично опресняване на данните
  refreshMs = 60000,
  // хронологично подреждане (по старо -> ново)
  chronological = true,
}: {
  days?: number;
  limit?: number;
  sport?: string;
  direction?: Direction;
  speedPxPerSec?: number;
  refreshMs?: number;
  chronological?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Маркировка (marquee)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [x, setX] = useState<number>(0);
  const xRef = useRef(0);
  const halfTrackWidthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  // Drag/Swipe
  const draggingRef = useRef(false);
  const dragStartPointerXRef = useRef(0);
  const dragStartXRef = useRef(0);

  // 1) Зареждане на данни за избран период/спорт
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          days: String(days),
          page: '1',
          limit: String(limit),
        });
        if (sport) qs.append('sport', sport);
        const res = await api.get(`/predictions/results?${qs.toString()}`);
        if (cancelled) return;
        const raw: Item[] = res.data?.data?.predictions ?? [];

        // хронологично подреждане, ако е поискано
        const sorted = chronological
          ? [...raw].sort((a, b) => {
              const ta = new Date(a.settledAt ?? a.matchDate).getTime();
              const tb = new Date(b.settledAt ?? b.matchDate).getTime();
              return ta - tb; // старо -> ново
            })
          : raw;

        setItems(sorted);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    let t: any;
    if (refreshMs > 0) {
      t = setInterval(load, refreshMs);
    }
    return () => {
      cancelled = true;
      if (t) clearInterval(t);
    };
  }, [days, limit, sport, refreshMs, chronological]);

  // 2) Безкрайна лента чрез дублиране
  const marqueeItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  // 3) Измерване ширина на половин трек
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      const total = trackRef.current.scrollWidth;
      halfTrackWidthRef.current = total / 2;
      xRef.current = direction === 'ltr' ? -halfTrackWidthRef.current : 0;
      setX(xRef.current);
    };
    const t = setTimeout(measure, 0);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [marqueeItems.length, direction]);

  // 4) Авто-скрол
  useEffect(() => {
    let lastTs = performance.now();

    const step = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const halfW = halfTrackWidthRef.current;
      if (!pausedRef.current && halfW > 0 && !draggingRef.current) {
        const delta = speedPxPerSec * dt;
        if (direction === 'ltr') {
          xRef.current += delta;
          if (xRef.current >= 0) xRef.current = -halfW;
        } else {
          xRef.current -= delta;
          if (xRef.current <= -halfW) xRef.current = 0;
        }
        setX(xRef.current);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [direction, speedPxPerSec]);

  // помощна: wrap в [-halfW, 0]
  const wrapX = (val: number) => {
    const halfW = halfTrackWidthRef.current || 0;
    if (halfW <= 0) return val;
    while (val > 0) val -= halfW;
    while (val < -halfW) val += halfW;
    return val;
  };

  // 5) Mouse drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent) => {
      draggingRef.current = true;
      pausedRef.current = true;
      dragStartPointerXRef.current = e.clientX;
      dragStartXRef.current = xRef.current;
      el.classList.add('cursor-grabbing');
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragStartPointerXRef.current;
      let newX = dragStartXRef.current + dx;
      newX = wrapX(newX);
      xRef.current = newX;
      setX(newX);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      el.classList.remove('cursor-grabbing');
      setTimeout(() => {
        if (!draggingRef.current) pausedRef.current = false;
      }, 80);
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('mouseleave', onUp);
    };
  }, []);

  // 6) Touch drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      draggingRef.current = true;
      pausedRef.current = true;
      dragStartPointerXRef.current = e.touches[0].clientX;
      dragStartXRef.current = xRef.current;
      el.classList.add('cursor-grabbing');
    };
    const onMove = (e: TouchEvent) => {
      if (!draggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartPointerXRef.current;
      let newX = dragStartXRef.current + dx;
      newX = wrapX(newX);
      xRef.current = newX;
      setX(newX);
    };
    const onEnd = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      el.classList.remove('cursor-grabbing');
      setTimeout(() => {
        if (!draggingRef.current) pausedRef.current = false;
      }, 80);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

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
        <div className="text-gray-500 text-sm">No recent results for the selected period.</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-white p-3 shadow-sm select-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Recent Results</h3>
        <div className="text-xs text-gray-500">{draggingRef.current ? 'Dragging…' : 'Auto-rotating • Drag to scroll'}</div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ width: '100%', touchAction: 'pan-y' }}
        aria-label="Recent results ticker"
      >
        <div
          ref={trackRef}
          className="flex gap-3 will-change-transform"
          style={{
            transform: `translateX(${x}px)`,
            transition: 'transform 0s linear',
          }}
        >
          {marqueeItems.map((it, i) => {
            const color =
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
                className={`min-w-[220px] max-w-[220px] border rounded-lg p-3 ${color}`}
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