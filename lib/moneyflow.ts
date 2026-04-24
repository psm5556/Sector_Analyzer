import { StockAnalysis, DailyReturn } from './types';

// ── Market Cap Parsing ────────────────────────────────────────────────────────

export function parseMarketCap(cap: string): number {
  if (!cap || cap === '-' || cap === 'N/A') return 0;
  const clean = cap.replace(/[$,\s]/g, '').toUpperCase();
  const match = clean.match(/^([\d.]+)([BMT]?)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === 'T') return num * 1e12;
  if (suffix === 'B') return num * 1e9;
  if (suffix === 'M') return num * 1e6;
  return num;
}

export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

// ── Return Color Scale ────────────────────────────────────────────────────────

export function getReturnColor(returnPct: number | null): string {
  if (returnPct === null || isNaN(returnPct)) return '#e0e0e0';
  if (returnPct >= 10) return '#1a7a4a';
  if (returnPct >= 3) return '#52b788';
  if (returnPct >= 0) return '#b7e4c7';
  if (returnPct > -3) return '#ffc8c8';
  if (returnPct > -10) return '#dc2f02';
  return '#9d0208';
}

export function getReturnTextColor(returnPct: number | null): string {
  if (returnPct === null || isNaN(returnPct)) return '#555';
  if (returnPct >= 3 || returnPct <= -3) return '#fff';
  return '#222';
}

// ── Treemap ───────────────────────────────────────────────────────────────────

export interface TreemapLeaf {
  name: string;
  ticker: string;
  company: string;
  value: number;
  returnPct: number | null;
  sector: string;
}

export interface TreemapSector {
  name: string;
  children: TreemapLeaf[];
}

export interface TreemapRoot {
  name: string;
  children: TreemapSector[];
}

export function buildTreemapData(results: StockAnalysis[]): TreemapRoot {
  const sectorMap = new Map<string, TreemapLeaf[]>();

  for (const s of results) {
    const sector = s.sector || '기타';
    if (!sectorMap.has(sector)) sectorMap.set(sector, []);
    let value = parseMarketCap(s.marketCap);
    sectorMap.get(sector)!.push({
      name: s.ticker,
      ticker: s.ticker,
      company: s.company,
      value,
      returnPct: s.cumulReturnBase,
      sector,
    });
  }

  // fallback: equal weight per sector when no market cap data
  const sectors: TreemapSector[] = Array.from(sectorMap.entries()).map(([name, leaves]) => {
    const totalCap = leaves.reduce((s, l) => s + l.value, 0);
    if (totalCap === 0) {
      const equalVal = 1e9;
      leaves.forEach(l => (l.value = equalVal));
    }
    return { name, children: leaves };
  });

  return { name: 'root', children: sectors };
}

// ── Stream Chart ──────────────────────────────────────────────────────────────

export interface StreamDataPoint {
  date: string;
  [sector: string]: number | string;
}

export function buildStreamData(results: StockAnalysis[]): {
  data: StreamDataPoint[];
  sectors: string[];
} {
  if (results.length === 0) return { data: [], sectors: [] };

  // collect all unique dates
  const dateSet = new Set<string>();
  for (const s of results) s.cumulReturns.forEach(r => dateSet.add(r.date));
  const dates = Array.from(dateSet).sort();

  // build sector → stock map
  const sectorStocks = new Map<string, StockAnalysis[]>();
  for (const s of results) {
    const sector = s.sector || '기타';
    if (!sectorStocks.has(sector)) sectorStocks.set(sector, []);
    sectorStocks.get(sector)!.push(s);
  }
  const sectors = Array.from(sectorStocks.keys()).sort();

  // for each date, compute per-sector average cumul return
  const data: StreamDataPoint[] = dates.map(date => {
    const point: StreamDataPoint = { date };
    Array.from(sectorStocks.entries()).forEach(([sector, stocks]) => {
      const vals: number[] = [];
      for (const stock of stocks) {
        const entry = stock.cumulReturns.find(r => r.date === date);
        if (entry !== undefined) vals.push(entry.value);
      }
      point[sector] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    return point;
  });

  return { data, sectors };
}

// ── RRG Chart ─────────────────────────────────────────────────────────────────

export interface RRGPoint {
  date: string;
  rsRatio: number;
  rsMomentum: number;
}

export interface RRGSeries {
  sector: string;
  trail: RRGPoint[];
  color: string;
}

const SECTOR_COLORS = [
  '#e63946', '#2a9d8f', '#e9c46a', '#264653', '#f4a261',
  '#6a4c93', '#1982c4', '#8ac926', '#ff595e', '#6a0572',
  '#457b9d', '#a8dadc', '#f77f00', '#0077b6', '#7b2d8b',
  '#3a86ff', '#fb5607', '#8338ec', '#06d6a0', '#ef233c',
];

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      result.push(values[0]);
    } else {
      result.push(values[i] * k + result[i - 1] * (1 - k));
    }
  }
  return result;
}

export function buildRRGData(results: StockAnalysis[], trailLength = 10): RRGSeries[] {
  if (results.length === 0) return [];

  const dateSet = new Set<string>();
  for (const s of results) s.cumulReturns.forEach(r => dateSet.add(r.date));
  const dates = Array.from(dateSet).sort();

  // market avg cumul return per date
  const marketByDate = new Map<string, number>();
  for (const date of dates) {
    const vals: number[] = [];
    for (const s of results) {
      const entry = s.cumulReturns.find(r => r.date === date);
      if (entry) vals.push(entry.value);
    }
    marketByDate.set(date, vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
  }

  const sectorStocks = new Map<string, StockAnalysis[]>();
  for (const s of results) {
    const sector = s.sector || '기타';
    if (!sectorStocks.has(sector)) sectorStocks.set(sector, []);
    sectorStocks.get(sector)!.push(s);
  }

  const series: RRGSeries[] = [];

  Array.from(sectorStocks.entries()).forEach(([sector, stocks], colorIdx) => {
    const sectorVals: number[] = dates.map(date => {
      const vals: number[] = [];
      for (const stock of stocks) {
        const entry = stock.cumulReturns.find(r => r.date === date);
        if (entry) vals.push(entry.value);
      }
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });

    const marketVals = dates.map(d => marketByDate.get(d) ?? 0);

    const rsRatios = sectorVals.map((sv, i) => {
      const mv = marketVals[i];
      if (mv === 0) return 100;
      return 100 + (sv - mv);
    });

    const rsEma = ema(rsRatios, 14);
    const rsMomentum = rsRatios.map((r, i) => {
      const e = rsEma[i];
      if (e === 0) return 100;
      return 100 + (r - e);
    });

    const trail: RRGPoint[] = [];
    const start = Math.max(0, dates.length - trailLength);
    for (let i = start; i < dates.length; i++) {
      trail.push({ date: dates[i], rsRatio: rsRatios[i], rsMomentum: rsMomentum[i] });
    }

    series.push({ sector, trail, color: SECTOR_COLORS[colorIdx % SECTOR_COLORS.length] });
  });

  return series;
}

// ── Sankey Chart ──────────────────────────────────────────────────────────────

export interface SankeyNode {
  id: string;
  label: string;
  side: 'left' | 'right';
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  label: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function buildSankeyData(results: StockAnalysis[]): SankeyData {
  const teamSet = new Set<string>();
  const sectorSet = new Set<string>();
  const linkMap = new Map<string, number>();

  for (const s of results) {
    const team = s.team || '기타';
    const sector = s.sector || '기타';
    teamSet.add(team);
    sectorSet.add(sector);

    const key = `${team}__${sector}`;
    const cap = parseMarketCap(s.marketCap);
    linkMap.set(key, (linkMap.get(key) ?? 0) + (cap > 0 ? cap : 1e9));
  }

  const nodes: SankeyNode[] = [
    ...Array.from(teamSet).map(t => ({ id: `team:${t}`, label: t, side: 'left' as const })),
    ...Array.from(sectorSet).map(s => ({ id: `sector:${s}`, label: s, side: 'right' as const })),
  ];

  const links: SankeyLink[] = Array.from(linkMap.entries()).map(([key, value]) => {
    const [team, sector] = key.split('__');
    return {
      source: `team:${team}`,
      target: `sector:${sector}`,
      value,
      label: `${team} → ${sector}: ${formatMarketCap(value)}`,
    };
  });

  return { nodes, links };
}
