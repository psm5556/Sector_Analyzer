'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  TreemapRoot,
  TreemapLeaf,
  getTreemapColor,
  getTreemapTextColor,
  formatMarketCap,
} from '@/lib/moneyflow';

export type ColorMode = 'cumul' | 'daily';

// ── Squarify layout ───────────────────────────────────────────────────────────

interface SR { x: number; y: number; w: number; h: number; }

function squarify<T extends { value: number }>(items: T[], r: SR): Array<{ item: T; rect: SR }> {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (total <= 0 || r.w <= 1 || r.h <= 1) return [];
  return _sq(sorted, total, r.x, r.y, r.w, r.h);
}

function _sq<T extends { value: number }>(
  items: T[], total: number, x: number, y: number, w: number, h: number
): Array<{ item: T; rect: SR }> {
  if (!items.length || w <= 0 || h <= 0) return [];
  if (items.length === 1) return [{ item: items[0], rect: { x, y, w, h } }];

  let row: T[] = [], rowSum = 0, prev = Infinity;
  for (const item of items) {
    const cand = [...row, item];
    const cs = rowSum + item.value;
    const worst = _worst(cand, cs, w, h, total);
    if (row.length > 0 && worst > prev) break;
    row = cand; rowSum = cs; prev = worst;
  }

  const out: Array<{ item: T; rect: SR }> = [];
  if (w >= h) {
    const rw = (rowSum / total) * w;
    let cy = y;
    for (const it of row) {
      const ch = (it.value / rowSum) * h;
      out.push({ item: it, rect: { x, y: cy, w: rw, h: ch } });
      cy += ch;
    }
    const rest = items.slice(row.length);
    if (rest.length) out.push(..._sq(rest, total - rowSum, x + rw, y, w - rw, h));
  } else {
    const rh = (rowSum / total) * h;
    let cx = x;
    for (const it of row) {
      const cw = (it.value / rowSum) * w;
      out.push({ item: it, rect: { x: cx, y, w: cw, h: rh } });
      cx += cw;
    }
    const rest = items.slice(row.length);
    if (rest.length) out.push(..._sq(rest, total - rowSum, x, y + rh, w, h - rh));
  }
  return out;
}

function _worst<T extends { value: number }>(
  row: T[], rs: number, w: number, h: number, total: number
): number {
  if (!rs) return Infinity;
  const L = Math.max(w, h); const S = Math.min(w, h);
  const rl = (rs / total) * L;
  let worst = 0;
  for (const it of row) {
    const cl = (it.value / rs) * S;
    if (!cl) continue;
    worst = Math.max(worst, Math.max(rl / cl, cl / rl));
  }
  return worst;
}

// ── Cell types ────────────────────────────────────────────────────────────────

interface StockCell  { kind: 'stock';  rect: SR; leaf: TreemapLeaf; sector: string; team: string; }
interface SectorCell { kind: 'sector'; rect: SR; name: string; team: string; }
interface TeamCell   { kind: 'team';   rect: SR; name: string; }
type Cell = StockCell | SectorCell | TeamCell;

const G  = 2;   // gap between cells
const TH = 20;  // team header height
const SH = 15;  // sector header height

// ── Full 3-level layout ───────────────────────────────────────────────────────

function fullLayout(data: TreemapRoot, W: number, H: number): Cell[] {
  const cells: Cell[] = [];

  const teamW = data.children.map(t => ({
    ...t,
    value: t.children.reduce((ts, s) => ts + s.children.reduce((vs, st) => vs + st.value, 0), 0),
  }));
  const teamRects = squarify(teamW, { x: G, y: G, w: W - 2 * G, h: H - 2 * G });

  for (const { item: team, rect: tr } of teamRects) {
    cells.push({ kind: 'team', rect: tr, name: team.name });

    const sx = tr.x + G, sy = tr.y + TH;
    const sw = tr.w - 2 * G, sh = tr.h - TH - G;
    if (sw <= 0 || sh <= 0) continue;

    const secW = team.children.map(s => ({
      ...s,
      value: s.children.reduce((vs, st) => vs + st.value, 0),
    }));
    const secRects = squarify(secW, { x: sx, y: sy, w: sw, h: sh });

    for (const { item: sec, rect: sr } of secRects) {
      cells.push({ kind: 'sector', rect: sr, name: sec.name, team: team.name });

      const ix = sr.x + G, iy = sr.y + SH;
      const iw = sr.w - 2 * G, ih = sr.h - SH - G;
      if (iw <= 0 || ih <= 0) continue;

      const stockRects = squarify(sec.children, { x: ix, y: iy, w: iw, h: ih });
      for (const { item: st, rect: r } of stockRects) {
        cells.push({ kind: 'stock', rect: r, leaf: st, sector: sec.name, team: team.name });
      }
    }
  }
  return cells;
}

// ── Team-level layout (zoom into one team) ────────────────────────────────────

function teamLayout(
  team: { name: string; children: { name: string; children: TreemapLeaf[] }[] },
  W: number, H: number
): Cell[] {
  const cells: Cell[] = [];
  const secW = team.children.map(s => ({
    ...s,
    value: s.children.reduce((vs, st) => vs + st.value, 0),
  }));
  const secRects = squarify(secW, { x: G, y: G, w: W - 2 * G, h: H - 2 * G });
  for (const { item: sec, rect: sr } of secRects) {
    cells.push({ kind: 'sector', rect: sr, name: sec.name, team: team.name });
    const ix = sr.x + G, iy = sr.y + SH;
    const iw = sr.w - 2 * G, ih = sr.h - SH - G;
    if (iw <= 0 || ih <= 0) continue;
    const stockRects = squarify(sec.children, { x: ix, y: iy, w: iw, h: ih });
    for (const { item: st, rect: r } of stockRects) {
      cells.push({ kind: 'stock', rect: r, leaf: st, sector: sec.name, team: team.name });
    }
  }
  return cells;
}

// ── Sector-level layout (zoom into one sector) ────────────────────────────────

function sectorLayout(
  sec: { name: string; team: string; children: TreemapLeaf[] },
  W: number, H: number
): Cell[] {
  const stockRects = squarify(sec.children, { x: G, y: G, w: W - 2 * G, h: H - 2 * G });
  return stockRects.map(({ item: st, rect: r }) => ({
    kind: 'stock' as const, rect: r, leaf: st, sector: sec.name, team: sec.team,
  }));
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { label: '≥+5%', color: '#00c853' },
  { label: '+3%',  color: '#00a846' },
  { label: '+1%',  color: '#1b7a3e' },
  { label: '±0',   color: '#0d3320' },
  { label: '±0',   color: '#3b0d0d' },
  { label: '-1%',  color: '#8b1a1a' },
  { label: '-3%',  color: '#b71c1c' },
  { label: '≤-5%', color: '#cf2020' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: TreemapRoot;
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
}

interface ZoomState {
  type: 'root' | 'team' | 'sector';
  teamName?: string;
  sectorName?: string;
}

interface TooltipState { x: number; y: number; leaf: TreemapLeaf; }

export default function TreemapChart({ data, colorMode = 'cumul', onColorModeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [zoom, setZoom] = useState<ZoomState>({ type: 'root' });
  const [tip, setTip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setDims({ w: Math.max(300, w), h: Math.min(600, Math.max(400, w * 0.58)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cells = useMemo(() => {
    const { w, h } = dims;
    if (zoom.type === 'root') return fullLayout(data, w, h);
    if (zoom.type === 'team' && zoom.teamName) {
      const t = data.children.find(t => t.name === zoom.teamName);
      if (t) return teamLayout(t, w, h);
    }
    if (zoom.type === 'sector' && zoom.sectorName) {
      for (const t of data.children) {
        const s = t.children.find(s => s.name === zoom.sectorName);
        if (s) return sectorLayout({ ...s, team: t.name }, w, h);
      }
    }
    return fullLayout(data, w, h);
  }, [data, dims, zoom]);

  const handleClick = useCallback((cell: Cell) => {
    if (cell.kind === 'team' && zoom.type === 'root') {
      setZoom({ type: 'team', teamName: cell.name });
    } else if (cell.kind === 'sector' && zoom.type !== 'sector') {
      setZoom({ type: 'sector', sectorName: cell.name, teamName: (cell as SectorCell).team });
    }
  }, [zoom.type]);

  const handleBack = () => {
    if (zoom.type === 'sector') {
      setZoom(zoom.teamName ? { type: 'team', teamName: zoom.teamName } : { type: 'root' });
    } else {
      setZoom({ type: 'root' });
    }
  };

  const breadcrumb = zoom.type === 'root' ? '전체'
    : zoom.type === 'team' ? (zoom.teamName ?? '')
    : `${zoom.teamName ?? ''} › ${zoom.sectorName ?? ''}`;

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px 16px' }}>
      {/* ── Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>

        {/* Breadcrumb + back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {zoom.type !== 'root' && (
            <button onClick={handleBack} style={{
              padding: '3px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
              background: '#374151', color: '#e2e8f0', border: '1px solid #4b5563',
            }}>← 뒤로</button>
          )}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>📍 {breadcrumb}</span>
        </div>

        {/* A/B mode toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['daily', 'cumul'] as ColorMode[]).map((m, i) => (
            <button key={m} onClick={() => onColorModeChange?.(m)} style={{
              padding: '3px 12px', fontSize: 12, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              background: colorMode === m ? '#2563eb' : '#1f2937',
              color: colorMode === m ? '#fff' : '#9ca3af',
              border: `1px solid ${colorMode === m ? '#2563eb' : '#374151'}`,
            }}>
              {i === 0 ? 'A: 일간' : 'B: 누적'}
            </button>
          ))}
        </div>
      </div>

      {/* ── SVG ── */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <svg width="100%" height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: 'block' }}>

          {/* Background */}
          <rect width={dims.w} height={dims.h} fill="#0d1117" />

          {/* 1) Team borders — bottom layer */}
          {(cells.filter(c => c.kind === 'team') as TeamCell[]).map((c, i) => (
            <g key={`t${i}`} onClick={() => handleClick(c)}
              style={{ cursor: zoom.type === 'root' ? 'zoom-in' : 'default' }}>
              <rect x={c.rect.x} y={c.rect.y} width={c.rect.w} height={c.rect.h}
                fill="transparent" stroke="#4b5563" strokeWidth={1.5} rx={3} />
              {c.rect.w > 50 && (
                <text x={c.rect.x + 7} y={c.rect.y + 15} fontSize={13}
                  fontWeight="700" fill="#e2e8f0"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {c.name}
                </text>
              )}
            </g>
          ))}

          {/* 2) Sector backgrounds + label — middle layer */}
          {(cells.filter(c => c.kind === 'sector') as SectorCell[]).map((c, i) => {
            const canZoom = zoom.type !== 'sector';
            const maxChars = Math.max(3, Math.floor(c.rect.w / 8));
            const label = c.name.length > maxChars ? c.name.slice(0, maxChars) + '…' : c.name;
            return (
              <g key={`s${i}`} onClick={() => handleClick(c)}
                style={{ cursor: canZoom ? 'zoom-in' : 'default' }}>
                <rect x={c.rect.x} y={c.rect.y} width={c.rect.w} height={c.rect.h}
                  fill="#111827" stroke="#1e293b" strokeWidth={0.5} rx={2} />
                {c.rect.w > 30 && c.rect.h > SH && (
                  <text x={c.rect.x + 4} y={c.rect.y + 11} fontSize={10}
                    fontWeight="600" fill="#6b7280"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 3) Stock cells — top layer */}
          {(cells.filter(c => c.kind === 'stock') as StockCell[]).map((c, i) => {
            const rp = colorMode === 'daily' ? c.leaf.dailyReturnPct : c.leaf.cumulReturnPct;
            const fill = getTreemapColor(rp ?? null);
            const tc = getTreemapTextColor(rp ?? null);
            const retStr = rp != null ? (rp >= 0 ? '+' : '') + rp.toFixed(1) + '%' : '';
            const { x, y, w, h } = c.rect;
            const fs = Math.min(12, Math.max(8, w / 5));
            return (
              <g key={`st${i}`}
                onMouseEnter={e => {
                  const box = containerRef.current?.getBoundingClientRect();
                  if (box) setTip({ x: e.clientX - box.left + 12, y: e.clientY - box.top - 50, leaf: c.leaf });
                }}
                onMouseLeave={() => setTip(null)}>
                <rect x={x} y={y} width={w} height={h} fill={fill} rx={1.5} />
                {w > 18 && h > 12 && (
                  <text x={x + w / 2} y={y + h / 2 + (h > 26 && retStr ? -7 : 0)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={fs} fontWeight="600" fill={tc}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {c.leaf.ticker}
                  </text>
                )}
                {w > 18 && h > 26 && retStr && (
                  <text x={x + w / 2} y={y + h / 2 + 9}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.max(8, fs - 1)} fill={tc}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {retStr}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tip && (() => {
          const { leaf } = tip;
          const rp = colorMode === 'daily' ? leaf.dailyReturnPct : leaf.cumulReturnPct;
          const retStr = rp != null ? (rp >= 0 ? '+' : '') + rp.toFixed(2) + '%' : 'N/A';
          const retColor = rp != null && rp >= 0 ? '#4ade80' : '#f87171';
          return (
            <div style={{
              position: 'absolute', left: tip.x, top: tip.y,
              background: '#1f2937', border: '1px solid #374151', borderRadius: 6,
              padding: '8px 12px', fontSize: 12, color: '#e2e8f0',
              pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>{leaf.company} ({leaf.ticker})</div>
              <div>{colorMode === 'daily' ? '일간 변동률' : '누적 수익률'}:{' '}
                <span style={{ color: retColor, fontWeight: 700 }}>{retStr}</span>
              </div>
              {leaf.rawCap > 0 && (
                <div style={{ color: '#9ca3af', marginTop: 2 }}>시총: {formatMarketCap(leaf.rawCap)}</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {LEGEND.map((l, i) => (
            <div key={i} title={l.label}
              style={{ width: 18, height: 12, background: l.color, borderRadius: 2 }} />
          ))}
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>빨강↓ · 중립=어둠 · 초록↑</span>
        </div>
        {zoom.type !== 'sector' && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            {zoom.type === 'root' ? '팀·섹터 클릭 → 줌인' : '섹터 클릭 → 줌인'}
          </span>
        )}
      </div>
    </div>
  );
}
