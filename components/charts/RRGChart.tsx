'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { RRGSeries } from '@/lib/moneyflow';

interface Props {
  series: RRGSeries[];
}

const CENTER = 100;

// Percentile helper
function pct(arr: number[], q: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * q), sorted.length - 1)] ?? CENTER;
}

function spreadFrom100(arr: number[]): number {
  if (!arr.length) return 5;
  return Math.max(Math.abs(pct(arr, 0.97) - CENTER), Math.abs(pct(arr, 0.03) - CENTER), 1);
}

export default function RRGChart({ series }: Props) {
  const maxFrames = useMemo(
    () => Math.max(0, ...series.map(s => s.trail.length)),
    [series]
  );

  // -1 = show full trail; >= 0 = show trail up to this frame index
  const [frame, setFrame] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(80);           // ms per frame
  const [showTip, setShowTip] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allHidden = series.length > 0 && hidden.size === series.length;

  // Current display frame (for scrubber / label)
  const displayFrame = frame === -1 ? maxFrames : frame;

  // Date label for current frame
  const currentDate = useMemo(() => {
    if (!series.length) return '';
    const refTrail = series.find(s => s.trail.length > 0)?.trail;
    if (!refTrail) return '';
    const idx = frame === -1 ? refTrail.length - 1 : Math.min(frame, refTrail.length - 1);
    return idx >= 0 ? refTrail[idx].date : '';
  }, [series, frame]);

  // Stop / clear timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(() => {
    stopTimer();
    // If at the end, restart from frame 0
    const startFrame = (frame === -1 || frame >= maxFrames - 1) ? 0 : frame;
    setFrame(startFrame);
    setIsPlaying(true);
  }, [frame, maxFrames, stopTimer]);

  const handlePause = useCallback(() => {
    stopTimer();
    setIsPlaying(false);
  }, [stopTimer]);

  const handleStop = useCallback(() => {
    stopTimer();
    setIsPlaying(false);
    setFrame(-1); // back to full view
  }, [stopTimer]);

  // Advance frame while playing
  useEffect(() => {
    if (!isPlaying) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      setFrame(f => {
        const cur = f === -1 ? 0 : f;
        if (cur >= maxFrames - 1) {
          setIsPlaying(false);
          return -1; // snap back to full view when done
        }
        return cur + 1;
      });
    }, speed);
    return stopTimer;
  }, [isPlaying, speed, maxFrames, stopTimer]);

  // Sync legend clicks from ECharts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEvents = useMemo<Record<string, (p: any) => void>>(() => ({
    legendselectchanged: (params: { selected: Record<string, boolean> }) => {
      const nextHidden = new Set(
        Object.entries(params.selected)
          .filter(([, v]) => !v)
          .map(([k]) => k)
      );
      setHidden(nextHidden);
    },
  }), []);

  const toggleAll = () =>
    setHidden(allHidden ? new Set() : new Set(series.map(s => s.sector)));

  const toggleOne = (sector: string) =>
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector); else next.add(sector);
      return next;
    });

  // Build ECharts option
  const option = useMemo(() => {
    // Compute effective trail per series based on current frame
    const cutoff = frame === -1 ? Infinity : frame + 1;
    const sliced = series.map(s => ({
      ...s,
      trail: s.trail.slice(0, cutoff),
    }));

    // Axis bounds from full trail (all series, ignore frame) to keep axes stable
    const allPts = series.flatMap(s => s.trail);
    const allR = allPts.map(p => p.rsRatio);
    const allM = allPts.map(p => p.rsMomentum);

    const xSpread = spreadFrom100(allR);
    const ySpread = spreadFrom100(allM);
    const xMin = CENTER - xSpread * 1.3;
    const xMax = CENTER + xSpread * 1.3;
    const yMin = CENTER - ySpread * 1.3;
    const yMax = CENTER + ySpread * 1.3;

    // Background: quadrant areas + center axes
    const bgSeries = {
      type: 'scatter',
      name: '__bg__',
      data: [[CENTER, CENTER]],
      symbolSize: 0,
      silent: true,
      legendHoverLink: false,
      markArea: {
        silent: true,
        data: [
          [
            { coord: [CENTER, CENTER], itemStyle: { color: 'rgba(34,197,94,0.09)' }, label: { show: true, formatter: 'Leading 주도', position: 'insideTopRight', color: '#14532d', fontSize: 11, fontWeight: 'bold' } },
            { coord: [xMax, yMax] },
          ],
          [
            { coord: [CENTER, yMin], itemStyle: { color: 'rgba(234,179,8,0.08)' }, label: { show: true, formatter: 'Weakening 이탈', position: 'insideBottomRight', color: '#713f12', fontSize: 11, fontWeight: 'bold' } },
            { coord: [xMax, CENTER] },
          ],
          [
            { coord: [xMin, yMin], itemStyle: { color: 'rgba(239,68,68,0.07)' }, label: { show: true, formatter: 'Lagging 소외', position: 'insideBottomLeft', color: '#7f1d1d', fontSize: 11, fontWeight: 'bold' } },
            { coord: [CENTER, CENTER] },
          ],
          [
            { coord: [xMin, CENTER], itemStyle: { color: 'rgba(59,130,246,0.08)' }, label: { show: true, formatter: 'Improving 반등', position: 'insideTopLeft', color: '#1e3a8a', fontSize: 11, fontWeight: 'bold' } },
            { coord: [CENTER, yMax] },
          ],
        ],
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#374151', type: 'solid', width: 1 },
        label: { show: false },
        data: [{ xAxis: CENTER }, { yAxis: CENTER }],
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectorSeries: any[] = sliced.map(s => {
      const trail = s.trail;
      const n = trail.length;
      return {
        type: 'line',
        name: s.sector,
        data: trail.map((p, i) => ({
          value: [p.rsRatio, p.rsMomentum],
          symbolSize: i === n - 1 ? 13 : 4,
          itemStyle: {
            color: s.color,
            opacity: i === n - 1 ? 1 : 0.2 + 0.7 * (i / Math.max(n - 1, 1)),
            borderWidth: i === n - 1 ? 2 : 0,
            borderColor: '#ffffff',
          },
          label: {
            show: i === n - 1 && n > 0,
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
      grid: { top: 24, right: 190, bottom: 52, left: 62 },
      xAxis: {
        type: 'value',
        name: 'RS-Ratio  (상대강도 →)',
        nameLocation: 'middle',
        nameGap: 36,
        min: xMin,
        max: xMax,
        axisLine: { show: true, lineStyle: { color: '#374151' } },
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
        axisLine: { show: true, lineStyle: { color: '#374151' } },
        splitLine: { show: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: any) => (v as number).toFixed(1) },
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
          const s = sliced.find(s => s.sector === params.seriesName);
          const pt = s?.trail[params.dataIndex];
          const isLast = params.dataIndex === (s?.trail.length ?? 0) - 1;
          return `<div style="font-weight:700;color:${params.color};margin-bottom:3px">${params.seriesName}${isLast ? ' ●' : ''}</div>
<div style="color:#d1d5db">RS-Ratio: <b style="color:#f9fafb">${(params.value[0] as number).toFixed(2)}</b></div>
<div style="color:#d1d5db">Momentum: <b style="color:#f9fafb">${(params.value[1] as number).toFixed(2)}</b></div>
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
        pageIconColor: '#9ca3af',
        pageIconInactiveColor: '#374151',
        selected: Object.fromEntries(series.map(s => [s.sector, !hidden.has(s.sector)])),
        data: series.map(s => ({ name: s.sector, icon: 'circle' })),
      },
      series: [bgSeries, ...sectorSeries],
    };
  }, [series, frame, hidden]);

  // Button styles helper
  const btnStyle = (active = false, accent = '#3b82f6') => ({
    padding: '3px 10px',
    fontSize: 12,
    borderRadius: 4,
    cursor: 'pointer',
    background: active ? accent : '#1f2937',
    color: active ? '#fff' : '#9ca3af',
    border: `1px solid ${active ? accent : '#374151'}`,
  });

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px 16px' }}>

      {/* ── Top controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>

        {/* Play controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={handlePlay} disabled={isPlaying} style={btnStyle(isPlaying, '#22c55e')} title="재생">
            ▶ 재생
          </button>
          <button onClick={handlePause} disabled={!isPlaying} style={btnStyle(false)} title="일시정지">
            ⏸ 정지
          </button>
          <button onClick={handleStop} style={btnStyle(false)} title="처음으로">
            ⏹ 초기화
          </button>

          {/* Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <span style={{ color: '#6b7280', fontSize: 11 }}>속도:</span>
            <input
              type="range" min={20} max={300} step={10}
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: 72, accentColor: '#3b82f6' }}
              title={`${speed}ms/프레임`}
            />
            <span style={{ color: '#9ca3af', fontSize: 11, width: 36 }}>
              {speed < 60 ? '빠름' : speed < 150 ? '보통' : '느림'}
            </span>
          </div>
        </div>

        {/* Info + tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#6b7280', fontSize: 11 }}>
            {maxFrames}개 데이터
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
          >?</button>
        </div>
      </div>

      {/* ── Timeline scrubber ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ color: '#6b7280', fontSize: 11, width: 24 }}>날짜</span>
          <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600 }}>
            {frame === -1 ? '전체' : currentDate || `${displayFrame}/${maxFrames}`}
          </span>
          {frame !== -1 && (
            <span style={{ color: '#6b7280', fontSize: 11 }}>
              ({displayFrame}/{maxFrames})
            </span>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={maxFrames}
          value={displayFrame}
          onChange={e => {
            stopTimer();
            setIsPlaying(false);
            const v = Number(e.target.value);
            setFrame(v >= maxFrames ? -1 : v);
          }}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4b5563', marginTop: 1 }}>
          <span>{series[0]?.trail[0]?.date ?? ''}</span>
          <span>전체</span>
          <span>{series[0]?.trail[series[0].trail.length - 1]?.date ?? ''}</span>
        </div>
      </div>

      {/* ── Tip panel ── */}
      {showTip && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 6, background: '#111827', border: '1px solid #1f2937', color: '#d1d5db', fontSize: 12, lineHeight: 1.6 }}>
          <p style={{ fontWeight: 'bold', color: '#f9fafb', marginBottom: 4 }}>로테이션 휠 (RRG)</p>
          <p>각 섹터의 상대 모멘텀 사이클을 2D 평면에 궤적으로 시각화합니다.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div>
              <p style={{ color: '#9ca3af', marginBottom: 2 }}>📐 축 구성</p>
              <p><b style={{ color: '#f9fafb' }}>X (RS-Ratio)</b> — 100 기준: 초과 = 아웃퍼폼</p>
              <p style={{ marginTop: 3 }}><b style={{ color: '#f9fafb' }}>Y (Momentum)</b> — 100 기준: 초과 = RS 상승 중</p>
              <p style={{ marginTop: 3 }}><b style={{ color: '#f9fafb' }}>궤적</b> — 길수록 변화 빠름</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', marginBottom: 2 }}>🔄 사이클 (시계 방향)</p>
              <p><span style={{ color: '#60a5fa' }}>반등 Q2</span> → <span style={{ color: '#4ade80' }}>주도 Q1</span> → <span style={{ color: '#fbbf24' }}>이탈 Q4</span> → <span style={{ color: '#f87171' }}>소외 Q3</span></p>
            </div>
          </div>
          <div style={{ marginTop: 8, padding: '6px 8px', background: '#1f2937', borderRadius: 4 }}>
            <b style={{ color: '#fbbf24' }}>💡 </b>
            Q1→Q4 = 주도 약화 신호 &nbsp;|&nbsp; Q3→Q2 = 신규 주도 후보 &nbsp;|&nbsp; 원점 근처 = 방향성 불명확
          </div>
        </div>
      )}

      {/* ── ECharts ── */}
      <ReactECharts
        option={option}
        style={{ height: 500 }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
        onEvents={onEvents}
      />

      {/* ── Bottom controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          onClick={toggleAll}
          style={{ ...btnStyle(false), fontSize: 11 }}
        >
          {allHidden ? '전체 보기' : '전체 숨기기'}
        </button>
        {series.map(s => {
          const isHidden = hidden.has(s.sector);
          return (
            <button
              key={s.sector}
              onClick={() => toggleOne(s.sector)}
              style={{
                padding: '2px 8px', fontSize: 11, borderRadius: 12, cursor: 'pointer',
                background: '#1f2937',
                color: isHidden ? '#4b5563' : '#d1d5db',
                border: `1px solid ${isHidden ? '#374151' : s.color + '90'}`,
                textDecoration: isHidden ? 'line-through' : 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isHidden ? '#374151' : s.color, display: 'inline-block', flexShrink: 0 }} />
              {s.sector}
            </button>
          );
        })}
      </div>
    </div>
  );
}
