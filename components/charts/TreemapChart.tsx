'use client';

import { useState, useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import {
  TreemapRoot,
  TreemapTeam,
  TreemapSector,
  TreemapLeaf,
  getTreemapColor,
  getTreemapTextColor,
  formatMarketCap,
} from '@/lib/moneyflow';

export type ColorMode = 'cumul' | 'daily';

interface Props {
  data: TreemapRoot;
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
}

// ── Zoom state ────────────────────────────────────────────────────────────────

interface ZoomState {
  type: 'root' | 'team' | 'sector';
  teamName?: string;
  sectorName?: string;
}

// ── Custom cell content ───────────────────────────────────────────────────────

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  depth?: number;
  // leaf data
  ticker?: string;
  company?: string;
  cumulReturnPct?: number | null;
  dailyReturnPct?: number | null;
  rawCap?: number;
  // non-leaf
  children?: unknown[];
  colorMode?: ColorMode;
  depthOffset?: number;
  onSectorClick?: (name: string, teamName?: string) => void;
  teamName?: string;
}

function TreemapCell(props: CellProps) {
  const {
    x = 0, y = 0, width = 0, height = 0,
    name = '', depth: rawDepth = 0,
    ticker, company, cumulReturnPct, dailyReturnPct, rawCap,
    colorMode = 'cumul',
    depthOffset = 0,
    onSectorClick,
    teamName,
  } = props;
  const depth = rawDepth + depthOffset;

  if (width < 2 || height < 2) return null;

  const returnPct = colorMode === 'daily' ? dailyReturnPct : cumulReturnPct;

  // ── depth=1: Team grouping box ────────────────────────────────────────────
  if (depth === 1) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height}
          fill="transparent" stroke="#2d3748" strokeWidth={2} />
        {width > 40 && (
          <text x={x + 6} y={y + 15} fontSize={13} fontWeight="700" fill="#e2e8f0"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {name}
          </text>
        )}
      </g>
    );
  }

  // ── depth=2: Sector grouping box ─────────────────────────────────────────
  if (depth === 2) {
    const canClick = onSectorClick && width > 20 && height > 20;
    return (
      <g
        style={{ cursor: canClick ? 'zoom-in' : 'default' }}
        onClick={() => canClick && onSectorClick(name, teamName)}
      >
        <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2}
          fill="#111827" stroke="#374151" strokeWidth={1} rx={2} />
        {width > 50 && height > 16 && (
          <>
            <rect x={x + 1} y={y + 1} width={width - 2} height={16}
              fill="#1f2937" rx={2} />
            <text x={x + 6} y={y + 13} fontSize={10} fontWeight="600" fill="#9ca3af"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {name.length > Math.floor(width / 7) ? name.slice(0, Math.floor(width / 7)) + '…' : name}
            </text>
          </>
        )}
      </g>
    );
  }

  // ── depth=3: Stock leaf cell ──────────────────────────────────────────────
  if (depth === 3) {
    const fill = getTreemapColor(returnPct ?? null);
    const textColor = getTreemapTextColor(returnPct ?? null);
    const label = ticker ?? name;
    const retStr = returnPct != null
      ? (returnPct >= 0 ? '+' : '') + returnPct.toFixed(1) + '%'
      : '';
    const fontSize = Math.min(12, Math.max(8, width / 5));

    return (
      <g>
        <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2}
          fill={fill} rx={2} />
        {width > 24 && height > 16 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + (height > 32 ? -8 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fontWeight="600"
            fill={textColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
        )}
        {width > 24 && height > 32 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(11, fontSize - 1)}
            fill={textColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {retStr}
          </text>
        )}
      </g>
    );
  }

  return null;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipEntry {
  payload?: {
    ticker?: string;
    company?: string;
    cumulReturnPct?: number | null;
    dailyReturnPct?: number | null;
    rawCap?: number;
    name?: string;
    depth?: number;
  };
}

function CustomTooltip({ active, payload, colorMode }: {
  active?: boolean;
  payload?: TooltipEntry[];
  colorMode: ColorMode;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || (d.depth !== 3 && d.depth !== undefined)) return null;

  const returnPct = colorMode === 'daily' ? d.dailyReturnPct : d.cumulReturnPct;
  const retStr = returnPct != null
    ? (returnPct >= 0 ? '+' : '') + returnPct.toFixed(2) + '%'
    : 'N/A';
  const retColor = returnPct != null && returnPct >= 0 ? '#4ade80' : '#f87171';

  return (
    <div className="rounded shadow-lg px-3 py-2 text-xs"
      style={{ background: '#1f2937', border: '1px solid #374151', color: '#e2e8f0' }}>
      <div className="font-semibold text-sm">{d.company ?? d.name} ({d.ticker ?? d.name})</div>
      <div className="mt-1">
        {colorMode === 'daily' ? '일간 변동률' : '누적 수익률'}:{' '}
        <span style={{ color: retColor, fontWeight: 700 }}>{retStr}</span>
      </div>
      {d.rawCap != null && d.rawCap > 0 && (
        <div className="text-gray-400">시총: {formatMarketCap(d.rawCap)}</div>
      )}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND_STEPS = [
  { label: '≥+5%', color: '#00c853' },
  { label: '+3%', color: '#00a846' },
  { label: '+1%', color: '#1b7a3e' },
  { label: '0%', color: '#0d3320' },
  { label: '0%', color: '#3b0d0d' },
  { label: '-1%', color: '#8b1a1a' },
  { label: '-3%', color: '#b71c1c' },
  { label: '≤-5%', color: '#cf2020' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function TreemapChart({ data, colorMode = 'cumul', onColorModeChange }: Props) {
  const [zoom, setZoom] = useState<ZoomState>({ type: 'root' });

  // Build display data based on zoom state
  const displayData = useMemo(() => {
    if (zoom.type === 'root') return data.children;

    if (zoom.type === 'team') {
      const team = data.children.find(t => t.name === zoom.teamName);
      return team ? team.children : data.children;
    }

    if (zoom.type === 'sector') {
      for (const team of data.children) {
        const sector = team.children.find(s => s.name === zoom.sectorName);
        if (sector) return sector.children;
      }
    }
    return data.children;
  }, [data, zoom]);

  // depth offset for display (zoomed-in views start at different depths)
  const depthOffset = zoom.type === 'root' ? 0 : zoom.type === 'team' ? 1 : 2;

  const handleSectorClick = (sectorName: string, teamName?: string) => {
    setZoom({ type: 'sector', sectorName, teamName });
  };

  const handleBack = () => {
    if (zoom.type === 'sector') {
      setZoom(zoom.teamName ? { type: 'team', teamName: zoom.teamName } : { type: 'root' });
    } else {
      setZoom({ type: 'root' });
    }
  };

  // Breadcrumb
  const breadcrumb = zoom.type === 'root'
    ? '전체'
    : zoom.type === 'team'
    ? zoom.teamName
    : `${zoom.teamName ?? ''} › ${zoom.sectorName}`;

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px 16px' }}>
      {/* Top controls */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {zoom.type !== 'root' && (
            <button
              onClick={handleBack}
              className="px-2 py-1 text-xs rounded"
              style={{ background: '#374151', color: '#e2e8f0', border: '1px solid #4b5563' }}
            >
              ← 뒤로
            </button>
          )}
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            📍 {breadcrumb}
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => onColorModeChange?.('daily')}
            className="px-3 py-1 text-xs rounded font-medium"
            style={{
              background: colorMode === 'daily' ? '#2563eb' : '#1f2937',
              color: colorMode === 'daily' ? '#fff' : '#9ca3af',
              border: '1px solid #374151',
            }}
          >
            A: 일간
          </button>
          <button
            onClick={() => onColorModeChange?.('cumul')}
            className="px-3 py-1 text-xs rounded font-medium"
            style={{
              background: colorMode === 'cumul' ? '#2563eb' : '#1f2937',
              color: colorMode === 'cumul' ? '#fff' : '#9ca3af',
              border: '1px solid #374151',
            }}
          >
            B: 누적
          </button>
        </div>
      </div>

      {/* Treemap */}
      <div style={{ background: '#0d1117' }}>
        <ResponsiveContainer width="100%" height={520}>
          <Treemap
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={displayData as any}
            dataKey="value"
            aspectRatio={16 / 9}
            content={
              <TreemapCell
                colorMode={colorMode}
                depthOffset={depthOffset}
                onSectorClick={zoom.type === 'root' ? handleSectorClick : undefined}
              />
            }
          >
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <CustomTooltip {...props} colorMode={colorMode} />}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Color legend + hint */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {LEGEND_STEPS.map((s, i) => (
            <div key={i} className="flex items-center" title={s.label}>
              <div style={{ width: 18, height: 12, background: s.color, borderRadius: 2 }} />
            </div>
          ))}
          <span className="text-xs ml-2" style={{ color: '#6b7280' }}>
            빨강↓ · 회색 0 · 초록↑
          </span>
        </div>
        {zoom.type === 'root' && (
          <span className="text-xs" style={{ color: '#6b7280' }}>
            섹터 클릭 → 줌인
          </span>
        )}
      </div>
    </div>
  );
}
