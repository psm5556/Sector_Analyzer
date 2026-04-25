'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { RRGSeries } from '@/lib/moneyflow';

interface Props {
  series: RRGSeries[];
}

const PERIODS = [
  { label: '14d', days: 14 },
  { label: '1M',  days: 22 },
  { label: '2M',  days: 44 },
  { label: '3M',  days: 66 },
  { label: '6M',  days: 130 },
  { label: '1년', days: 260 },
];

function pct(arr: number[], q: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * q), sorted.length - 1)] ?? 0;
}

export default function RRGChart({ series }: Props) {
  const [periodDays, setPeriodDays] = useState(22);
  const [showTip, setShowTip] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showStart, setShowStart] = useState(false);

  const allHidden = series.length > 0 && hidden.size === series.length;

  const toggleAll = () =>
    setHidden(allHidden ? new Set() : new Set(series.map(s => s.sector)));

  const toggleOne = (sector: string) =>
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector); else next.add(sector);
      return next;
    });

  // Sync ECharts legend clicks → React state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEvents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    legendselectchanged: (params: any) => {
      const nextHidden = new Set(
        Object.entries(params.selected as Record<string, boolean>)
          .filter(([, v]) => !v)
          .map(([k]) => k)
      );
      setHidden(nextHidden);
    },
  }), []);

  const option = useMemo(() => {
    // All series with trail sliced to the chosen period
    const sliced = series.map(s => ({ ...s, trail: s.trail.slice(-periodDays) }));

    // Compute axis bounds from ALL (including hidden) using 3–97 percentile to drop outliers
    const allPts = sliced.flatMap(s => s.trail);
    const ratios = allPts.map(p => p.rsRatio);
    const moms   = allPts.map(p => p.rsMomentum);

    const spread = (arr: number[]) =>
      arr.length ? Math.max(Math.abs(pct(arr, 0.97)), Math.abs(pct(arr, 0.03)), 0.3) : 1;

    const xSpread = spread(ratios);
    const ySpread = spread(moms);
    const xMin = -xSpread * 1.3;
    const xMax =  xSpread * 1.3;
    const yMin = -ySpread * 1.3;
    const yMax =  ySpread * 1.3;

    // Background decoration attached to a silent dummy scatter
    const bgSeries = {
      type: 'scatter',
      name: '__bg__',
      data: [[0, 0]],
      symbolSize: 0,
      silent: true,
      legendHoverLink: false,
      markArea: {
        silent: true,
        data: [
          [
            { coord: [0, 0], itemStyle: { color: 'rgba(34,197,94,0.09)' }, label: { show: true, formatter: 'Leading 주도', position: 'insideTopRight', color: '#14532d', fontSize: 11, fontWeight: 'bold' } },
            { coord: [xMax, yMax] },
          ],
          [
            { coord: [0, yMin], itemStyle: { color: 'rgba(234,179,8,0.08)' }, label: { show: true, formatter: 'Weakening 이탈', position: 'insideBottomRight', color: '#713f12', fontSize: 11, fontWeight: 'bold' } },
            { coord: [xMax, 0] },
          ],
          [
            { coord: [xMin, yMin], itemStyle: { color: 'rgba(239,68,68,0.07)' }, label: { show: true, formatter: 'Lagging 소외', position: 'insideBottomLeft', color: '#7f1d1d', fontSize: 11, fontWeight: 'bold' } },
            { coord: [0, 0] },
          ],
          [
            { coord: [xMin, 0], itemStyle: { color: 'rgba(59,130,246,0.08)' }, label: { show: true, formatter: 'Improving 반등', position: 'insideTopLeft', color: '#1e3a8a', fontSize: 11, fontWeight: 'bold' } },
            { coord: [0, yMax] },
          ],
        ],
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#374151', type: 'solid', width: 1, opacity: 0.9 },
        label: { show: false },
        data: [{ xAxis: 0 }, { yAxis: 0 }],
      },
    };

    // One line series per sector
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectorSeries: any[] = sliced.map(s => {
      const trail = s.trail;
      const n = trail.length;
      return {
        type: 'line',
        name: s.sector,
        data: trail.map((p, i) => ({
          value: [p.rsRatio, p.rsMomentum],
          symbolSize: i === n - 1 ? 12 : (showStart && i === 0 ? 7 : 4),
          itemStyle: {
            color: s.color,
            opacity: i === n - 1 ? 1 : (showStart && i === 0 ? 0.85 : 0.2 + 0.7 * (i / Math.max(n - 1, 1))),
            borderWidth: i === n - 1 ? 2 : 0,
            borderColor: '#ffffff',
          },
          label: {
            show: i === n - 1,
            formatter: s.sector,
            position: 'right',
            fontSize: 10,
            fontWeight: 'bold',
            color: s.color,
          },
        })),
        lineStyle: { color: s.color, width: 1.5, opacity: 0.65 },
        itemStyle: { color: s.color },
        emphasis: { scale: 1.5 },
      };
    });

    return {
      animation: false,
      backgroundColor: '#0d1117',
      grid: { top: 24, right: 190, bottom: 52, left: 60 },
      xAxis: {
        type: 'value',
        name: 'Relative Strength →',
        nameLocation: 'middle',
        nameGap: 36,
        min: xMin,
        max: xMax,
        axisLine: { show: true, lineStyle: { color: '#374151' } },
        splitLine: { show: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: any) => (v as number).toFixed(2) },
        nameTextStyle: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Momentum ↑',
        nameLocation: 'middle',
        nameGap: 50,
        min: yMin,
        max: yMax,
        axisLine: { show: true, lineStyle: { color: '#374151' } },
        splitLine: { show: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: any) => (v as number).toFixed(2) },
        nameTextStyle: { color: '#6b7280', fontSize: 11 },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        textStyle: { color: '#f9fafb', fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (!Array.isArray(params.value) || params.seriesName === '__bg__') return '';
          const s = series.find(s => s.sector === params.seriesName);
          const trail = s?.trail.slice(-periodDays) ?? [];
          const pt = trail[params.dataIndex];
          const isLast = params.dataIndex === trail.length - 1;
          return `<div style="font-weight:700;color:${params.color};margin-bottom:3px">${params.seriesName}${isLast ? ' ●' : ''}</div>
<div style="color:#d1d5db">RS-Ratio: <b style="color:#f9fafb">${(params.value[0] as number).toFixed(3)}</b></div>
<div style="color:#d1d5db">Momentum: <b style="color:#f9fafb">${(params.value[1] as number).toFixed(3)}</b></div>
${pt?.date ? `<div style="color:#6b7280;font-size:11px;margin-top:2px">${pt.date}</div>` : ''}`;
        },
      },
      legend: {
        show: true,
        type: 'scroll',
        orient: 'vertical',
        right: 8,
        top: 20,
        bottom: 20,
        textStyle: { color: '#9ca3af', fontSize: 11 },
        inactiveColor: '#374151',
        pageTextStyle: { color: '#6b7280' },
        pageIconColor: '#6b7280',
        pageIconInactiveColor: '#374151',
        selected: Object.fromEntries(series.map(s => [s.sector, !hidden.has(s.sector)])),
        // Exclude the dummy bg series from legend
        data: series.map(s => ({ name: s.sector, icon: 'circle' })),
      },
      series: [bgSeries, ...sectorSeries],
    };
  }, [series, periodDays, hidden, showStart]);

  const maxAvailable = series.length > 0 ? (series[0]?.trail.length ?? 0) : 0;
  const displayedPoints = Math.min(periodDays, maxAvailable);

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px 16px' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>
            윈도우 W={periodDays}일 · 궤적 {displayedPoints}점
          </span>
          <button
            onClick={() => setShowTip(v => !v)}
            title="차트 설명"
            style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 'bold',
              background: showTip ? '#3b82f6' : '#1f2937',
              color: showTip ? '#fff' : '#9ca3af',
              border: `1px solid ${showTip ? '#3b82f6' : '#374151'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ?
          </button>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1">
          <span style={{ color: '#6b7280', fontSize: 12, marginRight: 4 }}>기간:</span>
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setPeriodDays(p.days)}
              style={{
                padding: '1px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
                background: periodDays === p.days ? '#3b82f6' : '#1f2937',
                color: periodDays === p.days ? '#ffffff' : '#9ca3af',
                border: `1px solid ${periodDays === p.days ? '#3b82f6' : '#374151'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <label style={{ color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showStart}
            onChange={e => setShowStart(e.target.checked)}
            style={{ accentColor: '#3b82f6' }}
          />
          ○ 시작점 표시
        </label>

        <button
          onClick={toggleAll}
          style={{
            padding: '1px 10px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
            background: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
          }}
        >
          {allHidden ? '전체 보기' : '전체 숨기기'}
        </button>
      </div>

      {/* Tip panel */}
      {showTip && (
        <div className="mb-3 p-3 rounded-lg text-xs leading-relaxed space-y-2"
          style={{ background: '#111827', border: '1px solid #1f2937', color: '#d1d5db' }}>
          <p style={{ fontWeight: 'bold', color: '#f9fafb' }}>로테이션 휠 (RRG)</p>
          <p>각 테마의 상대 모멘텀 사이클을 2D 평면에 궤적으로 그려, 어떤 테마가 지금 어느 단계에 있는지 한 번에 확인합니다.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <p style={{ color: '#9ca3af', marginBottom: 2 }}>📐 축 구성</p>
              <p><b style={{ color: '#f9fafb' }}>X축 (RS-Ratio)</b> — 섹터 누적수익 − 전체 평균. 양수 = 아웃퍼폼.</p>
              <p style={{ marginTop: 4 }}><b style={{ color: '#f9fafb' }}>Y축 (Momentum)</b> — RS의 EMA 대비 변화. 양수 = RS 상승 중.</p>
              <p style={{ marginTop: 4 }}><b style={{ color: '#f9fafb' }}>궤적</b> — ○ 시작 → ● 현재. 길수록 변화 빠름.</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', marginBottom: 2 }}>🔄 이상적 사이클</p>
              <p><span style={{ color: '#60a5fa' }}>반등 (Q2)</span> → <span style={{ color: '#4ade80' }}>주도 (Q1)</span> → <span style={{ color: '#fbbf24' }}>이탈 (Q4)</span> → <span style={{ color: '#f87171' }}>소외 (Q3)</span></p>
              <p style={{ marginTop: 4 }}>시계 방향 순환. 궤적 방향으로 다음 단계 예측 가능.</p>
            </div>
          </div>
          <div style={{ background: '#1f2937', borderRadius: 4, padding: '6px 10px', color: '#d1d5db' }}>
            <p style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: 2 }}>💡 해석 팁</p>
            <p>• Q1 → Q4 이동 시작 = 주도주 약화 신호 &nbsp;|&nbsp; Q3 → Q2 진입 = 신규 주도 후보</p>
            <p>• Q1에 밀집 → 시장 강세 &nbsp;|&nbsp; Q3에 밀집 → 시장 약세</p>
            <p>• 원점 근처 정체 = 방향성 불명확</p>
          </div>
        </div>
      )}

      {/* ECharts */}
      <ReactECharts
        option={option}
        style={{ height: 500 }}
        opts={{ renderer: 'canvas' }}
        notMerge
        onEvents={onEvents}
      />
    </div>
  );
}
