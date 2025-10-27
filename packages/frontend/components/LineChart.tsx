'use client';

import React, { useMemo, useState } from 'react';

type Point = { label: string; value: number };
type Props = {
  points: Point[];
  width?: number;
  height?: number;
  color?: string;
  areaColor?: string;
  showDots?: boolean;
  smooth?: boolean;
  yMin?: number;
  yMax?: number;
  formatTooltip?: (p: Point) => string;
  className?: string; // NEW
};

export default function LineChart({
  points,
  width = 420,
  height = 180,
  color = '#2563eb',
  areaColor = 'rgba(37, 99, 235, 0.18)',
  showDots = true,
  smooth = true,
  yMin,
  yMax,
  formatTooltip,
  className,
}: Props) {
  const padding = { top: 12, right: 16, bottom: 24, left: 32 };
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { xs, ys, viewW, viewH, ticksY, minY, maxY } = useMemo(() => {
    const viewW = Math.max(10, width - padding.left - padding.right);
    const viewH = Math.max(10, height - padding.top - padding.bottom);
    const vals = points.map(p => p.value);
    const minData = vals.length ? Math.min(...vals) : 0;
    const maxData = vals.length ? Math.max(...vals) : 100;
    const min = yMin ?? Math.min(minData, 0);
    const max = yMax ?? Math.max(maxData, 100);
    const range = max - min || 1;

    const xs = points.map((_, i) =>
      padding.left + (points.length > 1 ? (i / (points.length - 1)) * viewW : viewW / 2)
    );
    const ys = points.map(p =>
      padding.top + (1 - (p.value - min) / range) * viewH
    );

    const ticksY = [min, min + range / 2, max].map(v => Math.round(v));

    return { xs, ys, viewW, viewH, ticksY, minY: min, maxY: max };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, height, yMin, yMax]);

  const path = useMemo(() => {
    if (points.length === 0) return '';
    if (!smooth || points.length < 3) {
      return points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${ys[i]}`).join(' ');
    }
    const d: string[] = [`M ${xs[0]} ${ys[0]}`];
    for (let i = 1; i < points.length; i++) {
      const x0 = xs[i - 1], y0 = ys[i - 1];
      const x1 = xs[i], y1 = ys[i];
      const xm = (x0 + x1) / 2;
      d.push(`C ${xm} ${y0}, ${xm} ${y1}, ${x1} ${y1}`);
    }
    return d.join(' ');
  }, [points, xs, ys, smooth]);

  const areaPath = useMemo(() => {
    if (!path) return '';
    const lastX = xs[xs.length - 1];
    const firstX = xs[0];
    const baselineY = padding.top + (height - padding.top - padding.bottom);
    return `${path} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [path, xs, padding.top, padding.bottom, height]);

  const tooltipText = (idx: number) => {
    const p = points[idx];
    if (!p) return '';
    return formatTooltip ? formatTooltip(p) : `${p.label}: ${p.value}%`;
  };

  return (
    <div className={`relative inline-block ${className || ''}`} style={{ width, height }}>
      <svg width={width} height={height} role="img">
        <g>
          {ticksY.map((t, i) => {
            const y = padding.top + (1 - (t - minY) / ((maxY - minY) || 1)) * (height - padding.top - padding.bottom);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                  {t}
                </text>
              </g>
            );
          })}
        </g>

        {areaPath && <path d={areaPath} fill={areaColor} />}
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} />

        {points.map((p, i) => (
          <g key={i}>
            {showDots && (
              <circle
                cx={xs[i]}
                cy={ys[i]}
                r={hoverIdx === i ? 4 : 3}
                fill={color}
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}
            <rect
              x={i === 0 ? xs[i] - (width / points.length) / 2 : (xs[i - 1] + xs[i]) / 2}
              y={padding.top}
              width={
                i === 0
                  ? (xs[i + 1] - xs[i]) / 2 + (width / points.length) / 2
                  : i === points.length - 1
                  ? (width - padding.right - xs[i]) + (xs[i] - xs[i - 1]) / 2
                  : (xs[i + 1] - xs[i - 1]) / 2
              }
              height={height - padding.top - padding.bottom}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}
      </svg>

      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="absolute pointer-events-none bg-white/95 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-800 shadow"
          style={{
            left: Math.min(Math.max(xs[hoverIdx] - 40, 0), width - 80),
            top: 8,
            width: 80,
            textAlign: 'center',
          }}
        >
          {tooltipText(hoverIdx)}
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-0 flex justify-between px-4 text-[10px] text-gray-500 select-none">
        {points.map((p, i) => (
          <span key={i} className="truncate" style={{ width: 40, textAlign: 'center' }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}