'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { RRGSeries } from '@/lib/moneyflow';

interface Props {
  series: RRGSeries[];
}

export default function RRGChart({ series }: Props) {
  const [trailLen, setTrailLen] = useState(10);
  const [showTip, setShowTip] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const allHidden = series.length > 0 && hidden.size === series.length;

  const toggleAll = () => {
    setHidden(allHidden ? new Set() : new Set(series.map(s => s.sector)));
  };

  const toggleOne = (sector: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector); else next.add(sector);
      return next;
    });
  };

  const option = useMemo(() => {
    // Compute axis bounds from ALL series (ignore hidden so axes don't jump)
    const allPts = series.flatMap(s => s.trail.slice(-trailLen));
    const ratios = allPts.map(p => p.rsRatio);
    const moms = allPts.map(p => p.rsMomentum);

    const xSpread = ratios.length ? Math.max(Math.max(...ratios) - 100, 100 - Math.min(...ratios), 4) : 8;
    const ySpread = moms.length ? Math.max(Math.max(...moms) - 100, 100 - Math.min(...moms), 4) : 8;

    const xMin = 100 - xSpread * 1.25;
    const xMax = 100 + xSpread * 1.25;
    const yMin = 100 - ySpread * 1.25;
    const yMax = 100 + ySpread * 1.25;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesArr: any[] = series.map((s, idx) => {
      const trail = s.trail.slice(-trailLen);
      return {
        type: 'line',
        name: s.sector,
        data: trail.map((p, i) => ({
          value: [p.rsRatio, p.rsMomentum],
          symbolSize: i === trail.length - 1 ? 14 : 5,
          itemStyle: {
            opacity: i === trail.length - 1 ? 1 : 0.25 + 0.65 * (i / Math.max(trail.length - 1, 1)),
          },
          label: {
            show: i === trail.length - 1,
            formatter: s.sector,
            position: 'right',
            fontSize: 11,
            fontWeight: 'bold',
            color: s.color,
          },
        })),
        lineStyle: { color: s.color, width: 2, opacity: 0.55 },
        itemStyle: { color: s.color },
        emphasis: { scale: 1.4 },
        // Attach quadrant backgrounds + center lines to the first series
        ...(idx === 0
          ? {
              markArea: {
                silent: true,
                data: [
                  [
                    {
                      coord: [100, 100],
                      itemStyle: { color: 'rgba(34,197,94,0.11)' },
                      label: { show: true, formatter: 'Leading 주도', position: 'insideTopRight', color: '#166534', fontSize: 11, fontWeight: 'bold' },
                    },
                    { coord: [xMax, yMax] },
                  ],
                  [
                    {
                      coord: [100, yMin],
                      itemStyle: { color: 'rgba(234,179,8,0.12)' },
                      label: { show: true, formatter: 'Weakening 고점이탈', position: 'insideBottomRight', color: '#854d0e', fontSize: 11, fontWeight: 'bold' },
                    },
                    { coord: [xMax, 100] },
                  ],
                  [
                    {
                      coord: [xMin, yMin],
                      itemStyle: { color: 'rgba(239,68,68,0.09)' },
                      label: { show: true, formatter: 'Lagging 소외', position: 'insideBottomLeft', color: '#991b1b', fontSize: 11, fontWeight: 'bold' },
                    },
                    { coord: [100, 100] },
                  ],
                  [
                    {
                      coord: [xMin, 100],
                      itemStyle: { color: 'rgba(59,130,246,0.10)' },
                      label: { show: true, formatter: 'Improving 반등', position: 'insideTopLeft', color: '#1e3a8a', fontSize: 11, fontWeight: 'bold' },
                    },
                    { coord: [100, yMax] },
                  ],
                ],
              },
              markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { color: '#94a3b8', type: 'dashed', width: 1, opacity: 0.8 },
                label: { show: false },
                data: [{ xAxis: 100 }, { yAxis: 100 }],
              },
            }
          : {}),
      };
    });

    return {
      animation: false,
      grid: { top: 20, right: 160, bottom: 52, left: 62 },
      xAxis: {
        type: 'value',
        name: 'RS-Ratio  (상대강도 →)',
        nameLocation: 'middle',
        nameGap: 36,
        min: xMin,
        max: xMax,
        axisLine: { show: true, lineStyle: { color: '#d1d5db' } },
        splitLine: { show: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: any) => (v as number).toFixed(1) },
        nameTextStyle: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'RS-Momentum  (모멘텀 ↑)',
        nameLocation: 'middle',
        nameGap: 52,
        min: yMin,
        max: yMax,
        axisLine: { show: true, lineStyle: { color: '#d1d5db' } },
        splitLine: { show: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: any) => (v as number).toFixed(1) },
        nameTextStyle: { color: '#6b7280', fontSize: 11 },
      },
      tooltip: {
        trigger: 'item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (!Array.isArray(params.value)) return '';
          const s = series.find(s => s.sector === params.seriesName);
          const trail = s?.trail.slice(-trailLen) ?? [];
          const pt = trail[params.dataIndex];
          return `<div style="font-weight:700;color:${params.color};margin-bottom:3px">${params.seriesName}</div>
<div>RS-Ratio: <b>${(params.value[0] as number).toFixed(2)}</b></div>
<div>RS-Mom: <b>${(params.value[1] as number).toFixed(2)}</b></div>
${pt?.date ? `<div style="color:#9ca3af;font-size:11px;margin-top:2px">${pt.date}</div>` : ''}`;
        },
      },
      // legend.show:false but selected controls visibility (notMerge ensures state is applied)
      legend: {
        show: false,
        selected: Object.fromEntries(series.map(s => [s.sector, !hidden.has(s.sector)])),
      },
      series: seriesArr,
    };
  }, [series, trailLen, hidden]);

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">트레일 길이:</label>
          <input
            type="range" min={3} max={20} value={trailLen}
            onChange={e => setTrailLen(Number(e.target.value))}
            className="w-28 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 w-8">{trailLen}일</span>
        </div>

        <button
          onClick={toggleAll}
          className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
        >
          {allHidden ? '전체 보기' : '전체 숨기기'}
        </button>

        <button
          onClick={() => setShowTip(v => !v)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            showTip
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {showTip ? '설명 닫기 ▲' : '💡 차트 설명 ▼'}
        </button>
      </div>

      {/* Collapsible tip panel */}
      {showTip && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-gray-700 leading-relaxed space-y-3">
          <div>
            <span className="font-bold text-gray-900">로테이션 휠 (RRG)</span>
            <span className="ml-2 text-xs text-gray-500">각 테마의 상대 모멘텀 사이클을 2D 평면에 궤적으로 시각화</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-gray-800 mb-1">📐 축 구성</p>
              <p><span className="font-medium">X축 (RS-Ratio)</span> — 최근 평균 변동률 − 전체 평균. 양수 = 시장 아웃퍼폼.</p>
              <p className="mt-1"><span className="font-medium">Y축 (RS-Momentum)</span> — RS의 변화율. 양수 = RS 상승 중, 음수 = 약화 중.</p>
              <p className="mt-1"><span className="font-medium">궤적</span> — 최근 N일 이동 경로. ○ 시작 → ● 현재.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">🔄 이상적 사이클</p>
              <p>반등초입 <span className="text-blue-600">(Q2)</span> → 주도주 <span className="text-green-600">(Q1)</span> → 고점이탈 <span className="text-yellow-600">(Q4)</span> → 소외 <span className="text-red-600">(Q3)</span></p>
              <p className="mt-1">궤적 방향 · 길이로 다음 단계 예측 가능.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 border border-green-100 rounded p-2">
              <span className="font-bold text-green-700">Q1 우상 — 주도주</span>
              <p className="text-gray-600 mt-0.5">RS 양수 + 모멘텀 양수. 강한 상승 추세.</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2">
              <span className="font-bold text-yellow-700">Q4 우하 — 고점이탈</span>
              <p className="text-gray-600 mt-0.5">RS 양수지만 모멘텀 음수. 강하나 힘 빠짐.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2">
              <span className="font-bold text-red-700">Q3 좌하 — 소외</span>
              <p className="text-gray-600 mt-0.5">RS 음수 + 모멘텀 음수. 약화 지속.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded p-2">
              <span className="font-bold text-blue-700">Q2 좌상 — 반등초입</span>
              <p className="text-gray-600 mt-0.5">RS 음수지만 모멘텀 양수. 바닥 회복 중.</p>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded p-2 space-y-0.5">
            <p className="font-semibold text-amber-800">💡 해석 팁</p>
            <p>• 궤적 길이 길수록 변화 속도 빠름 — 짧으면 방향성 불명확</p>
            <p>• Q1에 여러 테마 밀집 → 시장 전체 강세 / Q3 밀집 → 전체 약세</p>
            <p>• Q1 → Q4 이동 시작 = 주도주 약화 신호 (비중 조절 고려)</p>
            <p>• Q3 → Q2 진입 = 신규 주도 후보 모니터링 대상</p>
            <p>• 원점(100, 100) 근처 정체 = 시장 중립 / 방향성 불명확</p>
          </div>
        </div>
      )}

      {/* ECharts */}
      <ReactECharts
        option={option}
        style={{ height: 500 }}
        opts={{ renderer: 'canvas' }}
        notMerge
      />

      {/* Custom legend — clickable chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {series.map(s => {
          const isHidden = hidden.has(s.sector);
          return (
            <button
              key={s.sector}
              onClick={() => toggleOne(s.sector)}
              title={isHidden ? '클릭하여 표시' : '클릭하여 숨기기'}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                isHidden
                  ? 'border-gray-200 bg-gray-50 text-gray-400'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: isHidden ? '#d1d5db' : s.color }}
              />
              <span className={isHidden ? 'line-through' : ''}>{s.sector}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
