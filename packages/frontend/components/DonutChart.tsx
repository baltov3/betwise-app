import React from 'react';

type Slice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  data: Slice[];
  size?: number;      // px
  thickness?: number; // px
  centerLabel?: string;
  centerSubLabel?: string;
};

export default function DonutChart({
  data,
  size = 180,
  thickness = 18,
  centerLabel,
  centerSubLabel,
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = total > 0 ? d.value / total : 0;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const circle = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-cumulative}
                strokeLinecap="butt"
                className="transition-all duration-700 ease-out"
              />
            );
            cumulative += dash;
            return circle;
          })}
          {/* Background ring (light gray) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={thickness}
            opacity={0.35}
          />
        </g>
      </svg>

      {/* Center labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {centerLabel ? (
          <div className="text-2xl font-bold text-gray-900">{centerLabel}</div>
        ) : null}
        {centerSubLabel ? (
          <div className="text-xs text-gray-500 mt-1">{centerSubLabel}</div>
        ) : null}
      </div>
    </div>
  );
}