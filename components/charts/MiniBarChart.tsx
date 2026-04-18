'use client';

import { useMemo } from 'react';
import { DailyReturn } from '@/lib/types';

interface MiniBarChartProps {
  data: DailyReturn[];
  yMin?: number;
  yMax?: number;
  width?: number;
  height?: number;
}

export default function MiniBarChart({
  data,
  yMin = -50,
  yMax = 50,
  width = 160,
  height = 80,
}: MiniBarChartProps) {
  const { bars, zeroY } = useMemo(() => {
    if (!data.length) return { bars: [], zeroY: height / 2 };

    const range = yMax - yMin;
    const zeroY = ((yMax - 0) / range) * height;

    const barW = Math.max(1, (width / data.length) - 0.5);
    const bars = data.map((d, i) => {
      const clampedVal = Math.max(yMin, Math.min(yMax, d.value));
      const pixelVal = (clampedVal / range) * height;
      const y = clampedVal >= 0 ? zeroY - pixelVal : zeroY;
      const h = Math.abs(pixelVal);
      return {
        x: i * (width / data.length),
        y,
        w: barW,
        h: Math.max(h, 0.5),
        color: d.value >= 0 ? '#16a34a' : '#dc2626',
      };
    });

    return { bars, zeroY };
  }, [data, yMin, yMax, width, height]);

  if (!data.length) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#9ca3af" strokeWidth={0.5} />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Zero line */}
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="2 2" />
      {/* Bars */}
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} opacity={0.8} />
      ))}
    </svg>
  );
}
