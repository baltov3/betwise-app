'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Item = {
  id: string;
  sport: string;
  title: string;
  result?: 'WIN' | 'LOSS' | 'VOID' | 'PUSH' | 'PENDING';
  settledAt?: string | null;
  matchDate: string;
};

export default function RotatingMatches({ days = 90, limit = 24, intervalMs = 3000 }: { days?: number; limit?: number; intervalMs?: number; }) {
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/predictions/results?days=${days}&page=1&limit=${limit}`);
        if (!active) return;
        setItems(res.data?.data?.predictions ?? []);
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
  }, [days, limit]);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => i + 1);
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  const view = useMemo(() => {
    if (items.length === 0) return [];
    // Подреждане: от първия до последния (както идват от API - по settledAt desc)
    return items;
  }, [items]);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Recent Results</h3>
        <div className="text-xs text-gray-500">Auto-rotating</div>
      </div>

      <div className="flex gap-3 overflow-hidden">
        {view.slice(0, 12).map((it, i) => {
          // Всеки 3-ти изпъква леко напред (на базата на въртящ се индекс)
          const highlight = ((i + idx) % 3) === 0;
          const color =
            it.result === 'WIN' ? 'bg-green-50 border-green-200' :
            it.result === 'LOSS' ? 'bg-red-50 border-red-200' :
            it.result === 'VOID' ? 'bg-gray-50 border-gray-200' :
            it.result === 'PUSH' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200';

          return (
            <div
              key={it.id + i}
              className={`min-w-[220px] max-w-[220px] border rounded-lg p-3 transition-all duration-500 ${color} ${highlight ? 'scale-[1.05] z-10 shadow-md' : 'opacity-90'} `}
              style={{ transformOrigin: 'center center' }}
            >
              <div className="text-xs text-gray-500">{it.sport}</div>
              <div className="text-sm font-semibold text-gray-900 line-clamp-2">{it.title}</div>
              <div className="mt-2 text-xs text-gray-500">
                {it.settledAt ? new Date(it.settledAt).toLocaleString() : new Date(it.matchDate).toLocaleString()}
              </div>
              <div className="mt-2">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold
                  ${it.result === 'WIN' ? 'bg-green-600 text-white' :
                    it.result === 'LOSS' ? 'bg-red-600 text-white' :
                    it.result === 'VOID' ? 'bg-gray-600 text-white' :
                    it.result === 'PUSH' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {it.result ?? 'PENDING'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}