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
  // Авто-маркировка (посока/скорост)
  direction = 'ltr',
  speedPxPerSec = 50,
  // Опресняване на данните
  refreshMs = 60000,
  // Ефект за "пулс" на всеки 3-ти елемент
  pulseIntervalMs = 2500,
}: {
  days?: number;
  limit?: number;
  sport?: string;
  direction?: Direction;
  speedPxPerSec?: number;
  refreshMs?: number;
  pulseIntervalMs?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Пулс за визуален ефект
  const [pulseIdx, setPulseIdx] = useState(0);

  // Маркировка (marquee) refs/състояния
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [x, setX] = useState<number>(0);
  const xRef = useRef(0);
  const halfTrackWidthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  // Drag/Swipe състояния
  const draggingRef = useRef(false);
  const dragStartPointerXRef = useRef(0);
  const dragStartXRef = useRef(0);

  // Зареждане на данни по период/спорт
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
        setItems(res.data?.data?.predictions ?? []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Периодично опресняване
    let t: any;
    if (refreshMs > 0) {
      t = setInterval(load, refreshMs);
    }

    return () => {
      cancelled = true;
      if (t) clearInterval(t);
    };
  }, [days, limit, sport, refreshMs]);

  // Дублиране за безкрайна лента
  const marqueeItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  // Измерване на половин трек (оригиналният списък, преди дублиране)
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      const total = trackRef.current.scrollWidth;
      halfTrackWidthRef.current = total / 2;
      // Подравняваме началната позиция спрямо посоката
      xRef.current = direction === 'ltr' ? -halfTrackWidthRef.current : 0;
      setX(xRef.current);
    };

    // Щипка таймаут, за да се е рендерирало съдържанието
    const t = setTimeout(measure, 0);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [marqueeItems.length, direction]);

  // Авто-скрол (requestAnimationFrame)
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
          if (xRef.current >= 0) {
            xRef.current = -halfW;
          }
        } else {
          xRef.current -= delta;
          if (xRef.current <= -halfW) {
            xRef.current = 0;
          }
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

  // Пулс ефект за всеки 3-ти (не е задължителен)
  useEffect(() => {
    const t = setInterval(() => setPulseIdx((i) => i + 1), pulseIntervalMs);
    return () => clearInterval(t);
  }, [pulseIntervalMs]);

  // Помощна: wrap в диапазона [-halfW, 0]
  const wrapX = (val: number) => {
    const halfW = halfTrackWidthRef.current || 0;
    if (halfW <= 0) return val;
    // нормализиране в затворен диапазон [-halfW, 0]
    while (val > 0) val -= halfW;
    while (val < -halfW) val += halfW;
    return val;
  };

  // Drag handlers (mouse)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseDown = (e: MouseEvent) => {
      draggingRef.current = true;
      pausedRef.current = true; // пауза на авто-скрола по време на drag
      dragStartPointerXRef.current = e.clientX;
      dragStartXRef.current = xRef.current;
      container.classList.add('cursor-grabbing');
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragStartPointerXRef.current;
      // Положителен dx = плъзгане надясно => местим лентата надясно => увеличаваме x
      let newX = dragStartXRef.current + dx;
      newX = wrapX(newX);
      xRef.current = newX;
      setX(newX);
    };

    const finish = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      container.classList.remove('cursor-grabbing');
      // кратко забавяне преди да пуснем авто-скрол, за да не “дръпне” веднага
      setTimeout(() => {
        if (!draggingRef.current) pausedRef.current = false;
      }, 80);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', finish);
    container.addEventListener('mouseleave', finish);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', finish);
      container.removeEventListener('mouseleave', finish);
    };
  }, []);

  // Touch handlers (mobile)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      draggingRef.current = true;
      pausedRef.current = true;
      dragStartPointerXRef.current = e.touches[0].clientX;
      dragStartXRef.current = xRef.current;
      container.classList.add('cursor-grabbing');
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartPointerXRef.current;
      let newX = dragStartXRef.current + dx;
      newX = wrapX(newX);
      xRef.current = newX;
      setX(newX);
    };

    const finish = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      container.classList.remove('cursor-grabbing');
      setTimeout(() => {
        if (!draggingRef.current) pausedRef.current = false;
      }, 80);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', finish);
    container.addEventListener('touchcancel', finish);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', finish);
      container.removeEventListener('touchcancel', finish);
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
        <div className="text-gray-500 text-sm">No recent results.</div>
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
        style={{ width: '100%', touchAction: 'pan-y' }} // оставяме вертикален скрол на страницата
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
            const highlight = ((i + pulseIdx) % 3) === 0;
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
                className={`min-w-[220px] max-w-[220px] border rounded-lg p-3 transition-transform duration-300 ${color} ${highlight ? 'scale-[1.03] shadow-md' : ''}`}
                style={{ transformOrigin: 'center center' }}
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