'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TreemapRoot, getTreemapColor, getTreemapTextColor, formatMarketCap } from '@/lib/moneyflow';

export type ColorMode = 'cumul' | 'daily';

interface Props {
  data: TreemapRoot;
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEChartsData(data: TreemapRoot, colorMode: ColorMode): any[] {
  return data.children.map(team => ({
    name: team.name,
    children: team.children.map(sector => ({
      name: sector.name,
      children: sector.children.map(stock => {
        const rp = colorMode === 'daily' ? stock.dailyReturnPct : stock.cumulReturnPct;
        const retStr = rp != null ? (rp >= 0 ? '+' : '') + rp.toFixed(1) + '%' : '';
        return {
          name: stock.ticker,
          value: stock.value,
          // extra fields for tooltip / label
          _company: stock.company,
          _rp: rp,
          _retStr: retStr,
          _rawCap: stock.rawCap,
          itemStyle: { color: getTreemapColor(rp ?? null) },
          label: { color: getTreemapTextColor(rp ?? null) },
        };
      }),
    })),
  }));
}

export default function TreemapChart({ data, colorMode = 'cumul', onColorModeChange }: Props) {
  const echartsData = useMemo(() => buildEChartsData(data, colorMode), [data, colorMode]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const option: any = useMemo(() => ({
    backgroundColor: '#0d1117',
    tooltip: {
      show: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (info: any) => {
        // Only show tooltip for leaf nodes (depth 3)
        if (!info.treePathInfo || info.treePathInfo.length < 4) return '';
        const d = info.data;
        const retStr = d._retStr || 'N/A';
        const retColor = d._rp != null && d._rp >= 0 ? '#4ade80' : '#f87171';
        const capStr = d._rawCap > 0 ? `<div style="color:#9ca3af;margin-top:3px">시총: ${formatMarketCap(d._rawCap)}</div>` : '';
        return `<div style="font-size:13px;font-weight:700;margin-bottom:4px">${d._company} (${info.name})</div>
<div>${colorMode === 'daily' ? '일간 변동률' : '누적 수익률'}: <span style="color:${retColor};font-weight:700">${retStr}</span></div>${capStr}`;
      },
    },
    series: [
      {
        type: 'treemap',
        top: 0,
        left: 0,
        right: 0,
        bottom: 32,
        roam: false,
        nodeClick: 'zoomToNode',
        drillDownIcon: '',
        // upperLabel shows a header strip on non-leaf nodes
        upperLabel: {
          show: true,
          height: 24,
        },
        breadcrumb: {
          show: true,
          bottom: 0,
          height: 30,
          left: 8,
          itemStyle: {
            color: '#1f2937',
            borderColor: '#374151',
            borderWidth: 1,
            shadowBlur: 0,
            textStyle: { color: '#d1d5db', fontSize: 12 },
          },
          emphasis: {
            itemStyle: { color: '#374151' },
          },
        },
        data: echartsData,
        levels: [
          // level 0: virtual root (hidden)
          {
            itemStyle: { borderWidth: 0, gapWidth: 0 },
            upperLabel: { show: false },
          },
          // level 1: teams
          {
            itemStyle: {
              borderWidth: 3,
              borderColor: '#4b5563',
              gapWidth: 3,
            },
            upperLabel: {
              show: true,
              height: 24,
              color: '#f1f5f9',
              fontWeight: 'bold',
              fontSize: 13,
              align: 'left',
              padding: [0, 0, 0, 8],
              backgroundColor: 'rgba(15,23,42,0.9)',
            },
            label: { show: false },
          },
          // level 2: sectors
          {
            itemStyle: {
              borderWidth: 1,
              borderColor: '#1e293b',
              gapWidth: 2,
            },
            upperLabel: {
              show: true,
              height: 16,
              color: '#94a3b8',
              fontWeight: '600',
              fontSize: 10,
              align: 'left',
              padding: [0, 0, 0, 5],
              backgroundColor: '#0f172a',
            },
            label: { show: false },
          },
          // level 3: stocks (leaf nodes)
          {
            itemStyle: {
              borderWidth: 0,
              gapWidth: 1,
            },
            upperLabel: { show: false },
            label: {
              show: true,
              position: 'inside',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (params: any) => {
                const rp: number | null = params.data?._rp ?? null;
                const retStr: string = params.data?._retStr ?? '';
                const w: number = params.rect?.width ?? 0;
                const h: number = params.rect?.height ?? 0;
                if (w < 18 || h < 12) return '';
                if (h < 26 || !retStr) return params.name;
                return `${params.name}\n${retStr}`;
              },
              fontSize: 11,
              fontWeight: 'bold',
              overflow: 'truncate',
            },
          },
        ],
      },
    ],
  }), [echartsData, colorMode]);

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px 16px' }}>
      {/* A/B Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 4 }}>
        {(['daily', 'cumul'] as ColorMode[]).map((m, i) => (
          <button
            key={m}
            onClick={() => onColorModeChange?.(m)}
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              cursor: 'pointer',
              background: colorMode === m ? '#2563eb' : '#1f2937',
              color: colorMode === m ? '#ffffff' : '#94a3b8',
              border: `1px solid ${colorMode === m ? '#3b82f6' : '#374151'}`,
              outline: 'none',
            }}
          >
            {i === 0 ? 'A: 일간' : 'B: 누적'}
          </button>
        ))}
      </div>

      {/* Treemap */}
      <ReactECharts
        option={option}
        style={{ height: 520, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge
      />

      {/* Color legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 8 }}>
        {LEGEND.map((l, i) => (
          <div
            key={i}
            title={l.label}
            style={{ width: 18, height: 12, background: l.color, borderRadius: 2 }}
          />
        ))}
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
          빨강↓ · 중립=어둠 · 초록↑  ·  클릭 → 줌인
        </span>
      </div>
    </div>
  );
}
