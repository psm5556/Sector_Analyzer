'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { RRGSeries, RRGPoint } from '@/lib/moneyflow';

interface Props {
  series: RRGSeries[];
}

const QUADRANT_BG = {
  leading: 'rgba(82,183,136,0.12)',
  weakening: 'rgba(233,196,106,0.15)',
  lagging: 'rgba(220,47,2,0.10)',
  improving: 'rgba(26,130,196,0.12)',
};

const QUADRANT_LABELS = [
  { key: 'leading', x: 'right', y: 'top', label: 'Leading 선도', color: '#2d6a4f' },
  { key: 'weakening', x: 'right', y: 'bottom', label: 'Weakening 약화', color: '#b5830a' },
  { key: 'lagging', x: 'left', y: 'bottom', label: 'Lagging 후행', color: '#9d0208' },
  { key: 'improving', x: 'left', y: 'top', label: 'Improving 개선', color: '#1a82c4' },
];

export default function RRGChart({ series }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 720, h: 520 });
  const [trailLen, setTrailLen] = useState(10);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.min(560, Math.max(360, width * 0.65)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 40, right: 30, bottom: 50, left: 60 };
  const plotW = dims.w - pad.left - pad.right;
  const plotH = dims.h - pad.top - pad.bottom;
  const cx = pad.left + plotW / 2; // RS-Ratio = 100
  const cy = pad.top + plotH / 2;  // RS-Momentum = 100

  // compute axis range from data
  const allRatios = series.flatMap(s => s.trail.map(p => p.rsRatio));
  const allMoms = series.flatMap(s => s.trail.map(p => p.rsMomentum));

  const xMin = allRatios.length ? Math.min(...allRatios) - 2 : 90;
  const xMax = allRatios.length ? Math.max(...allRatios) + 2 : 110;
  const yMin = allMoms.length ? Math.min(...allMoms) - 2 : 90;
  const yMax = allMoms.length ? Math.max(...allMoms) + 2 : 110;

  // center at 100 symmetrically
  const xRange = Math.max(xMax - 100, 100 - xMin, 5);
  const yRange = Math.max(yMax - 100, 100 - yMin, 5);
  const xDomain = [100 - xRange * 1.1, 100 + xRange * 1.1];
  const yDomain = [100 - yRange * 1.1, 100 + yRange * 1.1];

  const toSvgX = (v: number) =>
    pad.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotW;
  const toSvgY = (v: number) =>
    pad.top + plotH - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotH;

  const xCenter = toSvgX(100);
  const yCenter = toSvgY(100);

  // x-axis ticks
  const xTicks = Array.from({ length: 5 }, (_, i) =>
    xDomain[0] + (i * (xDomain[1] - xDomain[0])) / 4
  );
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    yDomain[0] + (i * (yDomain[1] - yDomain[0])) / 4
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, sector: string, pt: RRGPoint) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 30,
        text: `${sector}\nRS-Ratio: ${pt.rsRatio.toFixed(2)}\nRS-Mom: ${pt.rsMomentum.toFixed(2)}\n${pt.date}`,
      });
    },
    []
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-600">트레일 길이:</label>
        <input
          type="range"
          min={3}
          max={20}
          value={trailLen}
          onChange={e => setTrailLen(Number(e.target.value))}
          className="w-32 accent-blue-600"
        />
        <span className="text-sm font-medium text-gray-700">{trailLen}일</span>
      </div>

      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Quadrant backgrounds */}
          <rect x={xCenter} y={pad.top} width={pad.left + plotW - xCenter} height={yCenter - pad.top}
            fill={QUADRANT_BG.leading} />
          <rect x={xCenter} y={yCenter} width={pad.left + plotW - xCenter} height={pad.top + plotH - yCenter}
            fill={QUADRANT_BG.weakening} />
          <rect x={pad.left} y={yCenter} width={xCenter - pad.left} height={pad.top + plotH - yCenter}
            fill={QUADRANT_BG.lagging} />
          <rect x={pad.left} y={pad.top} width={xCenter - pad.left} height={yCenter - pad.top}
            fill={QUADRANT_BG.improving} />

          {/* Plot border */}
          <rect x={pad.left} y={pad.top} width={plotW} height={plotH}
            fill="none" stroke="#ccc" strokeWidth={1} />

          {/* Center axes */}
          <line x1={xCenter} y1={pad.top} x2={xCenter} y2={pad.top + plotH} stroke="#999" strokeWidth={1} strokeDasharray="4 3" />
          <line x1={pad.left} y1={yCenter} x2={pad.left + plotW} y2={yCenter} stroke="#999" strokeWidth={1} strokeDasharray="4 3" />

          {/* Quadrant labels */}
          {QUADRANT_LABELS.map(q => (
            <text
              key={q.key}
              x={q.x === 'right' ? pad.left + plotW - 8 : pad.left + 8}
              y={q.y === 'top' ? pad.top + 16 : pad.top + plotH - 8}
              textAnchor={q.x === 'right' ? 'end' : 'start'}
              fontSize={11}
              fontWeight="600"
              fill={q.color}
              opacity={0.7}
            >
              {q.label}
            </text>
          ))}

          {/* X-axis ticks */}
          {xTicks.map(v => (
            <g key={v}>
              <line x1={toSvgX(v)} y1={pad.top + plotH} x2={toSvgX(v)} y2={pad.top + plotH + 4} stroke="#aaa" strokeWidth={1} />
              <text x={toSvgX(v)} y={pad.top + plotH + 16} textAnchor="middle" fontSize={10} fill="#666">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          {/* Y-axis ticks */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={pad.left - 4} y1={toSvgY(v)} x2={pad.left} y2={toSvgY(v)} stroke="#aaa" strokeWidth={1} />
              <text x={pad.left - 8} y={toSvgY(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#666">
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={pad.left + plotW / 2} y={dims.h - 6} textAnchor="middle" fontSize={12} fill="#555">
            RS-Ratio (상대강도)
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            fontSize={12}
            fill="#555"
            transform={`rotate(-90, 16, ${pad.top + plotH / 2})`}
          >
            RS-Momentum
          </text>

          {/* Trails and dots */}
          {series.map(s => {
            const trail = s.trail.slice(-trailLen);
            if (trail.length === 0) return null;
            const points = trail.map(p => `${toSvgX(p.rsRatio)},${toSvgY(p.rsMomentum)}`).join(' ');
            const last = trail[trail.length - 1];
            const lx = toSvgX(last.rsRatio);
            const ly = toSvgY(last.rsMomentum);
            return (
              <g key={s.sector}>
                {/* Trail line */}
                {trail.length > 1 && (
                  <polyline
                    points={points}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                    strokeLinejoin="round"
                  />
                )}
                {/* Trail dots */}
                {trail.slice(0, -1).map((pt, i) => (
                  <circle
                    key={i}
                    cx={toSvgX(pt.rsRatio)}
                    cy={toSvgY(pt.rsMomentum)}
                    r={2.5}
                    fill={s.color}
                    opacity={0.3 + 0.5 * (i / trail.length)}
                  />
                ))}
                {/* Current dot */}
                <circle
                  cx={lx}
                  cy={ly}
                  r={7}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => handleMouseEnter(e, s.sector, last)}
                  onMouseLeave={() => setTooltip(null)}
                />
                {/* Label */}
                <text
                  x={lx + 9}
                  y={ly - 4}
                  fontSize={11}
                  fontWeight="600"
                  fill={s.color}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {s.sector}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, pointerEvents: 'none' }}
            className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-xs whitespace-pre z-10"
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {series.map(s => (
          <div key={s.sector} className="flex items-center gap-1.5 text-xs">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: s.color }} />
            {s.sector}
          </div>
        ))}
      </div>
    </div>
  );
}
