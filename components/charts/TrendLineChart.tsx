'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { DailyReturn } from '@/lib/types';

export interface LineSeriesConfig {
  data: DailyReturn[];
  color: string;
  title: string;
  lineWidth?: 1 | 2 | 3 | 4;
  lineStyle?: LineStyle;
}

interface TrendLineChartProps {
  series: LineSeriesConfig[];
  height?: number;
  title?: string;
  yMin?: number;
  yMax?: number;
  /** When true, renders legend as a compact scrollable grid (for many series like sectors) */
  compactLegend?: boolean;
}

export default function TrendLineChart({
  series,
  height = 350,
  title,
  yMin,
  yMax,
  compactLegend = false,
}: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});

  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const seriesTitleKey = series.map((s) => s.title).join('|');
  useEffect(() => {
    setVisibility(Object.fromEntries(series.map((s) => [s.title, true])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesTitleKey]);

  const initChart = useCallback(() => {
    if (!containerRef.current || !series.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    seriesRefs.current = {};

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#374151',
        fontSize: 11,
      },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: '#e5e7eb',
        ...(yMin !== undefined && yMax !== undefined
          ? { autoScale: false, minimum: yMin, maximum: yMax }
          : {}),
      } as Parameters<typeof chart.applyOptions>[0]['rightPriceScale'],
      timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    series.forEach((s) => {
      if (!s.data.length) return;
      const lineSeries = chart.addLineSeries({
        color: s.color,
        lineWidth: (s.lineWidth ?? 2) as 1 | 2 | 3 | 4,
        lineStyle: s.lineStyle ?? LineStyle.Solid,
        title: s.title,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      lineSeries.setData(
        s.data.map((d) => ({
          time: d.date as Parameters<typeof lineSeries.setData>[0][0]['time'],
          value: d.value,
        }))
      );
      seriesRefs.current[s.title] = lineSeries;
    });

    // Zero baseline
    const allDates = series.flatMap((s) => s.data.map((d) => d.date)).sort();
    if (allDates.length >= 2) {
      const baseline = chart.addLineSeries({
        color: '#d1d5db',
        lineWidth: 1 as const,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      });
      baseline.setData([
        { time: allDates[0] as Parameters<typeof baseline.setData>[0][0]['time'], value: 0 },
        { time: allDates[allDates.length - 1] as Parameters<typeof baseline.setData>[0][0]['time'], value: 0 },
      ]);
    }

    chart.timeScale().fitContent();
  }, [series, height, yMin, yMax]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initChart();
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [initChart]);

  // Apply visibility without recreating the chart
  useEffect(() => {
    Object.entries(visibility).forEach(([seriesTitle, visible]) => {
      seriesRefs.current[seriesTitle]?.applyOptions({ visible });
    });
  }, [visibility]);

  const toggleSeries = (seriesTitle: string) => {
    setVisibility((prev) => ({ ...prev, [seriesTitle]: !prev[seriesTitle] }));
  };

  const showAll = () => setVisibility(Object.fromEntries(series.map((s) => [s.title, true])));
  const hideAll = () => setVisibility(Object.fromEntries(series.map((s) => [s.title, false])));

  const validSeries = series.filter((s) => s.data.length > 0);

  if (!validSeries.length) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm"
      >
        데이터 없음
      </div>
    );
  }

  const hiddenCount = validSeries.filter((s) => visibility[s.title] === false).length;

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />

      {/* Interactive legend */}
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-2">
          {compactLegend && (
            <span className="text-xs text-gray-400">{validSeries.length}개 섹터</span>
          )}
          {hiddenCount > 0 && (
            <span className="text-xs text-gray-400">({hiddenCount}개 숨김)</span>
          )}
          <button
            onClick={showAll}
            className="text-xs text-blue-500 hover:underline ml-auto"
          >
            전체 표시
          </button>
          <button
            onClick={hideAll}
            className="text-xs text-gray-400 hover:underline ml-1"
          >
            전체 숨김
          </button>
        </div>

        <div
          className={
            compactLegend
              ? 'grid gap-x-3 gap-y-1 max-h-48 overflow-y-auto pr-1'
              : 'flex flex-wrap gap-2'
          }
          style={compactLegend ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } : undefined}
        >
          {validSeries.map((s) => {
            const active = visibility[s.title] !== false;
            return (
              <button
                key={s.title}
                onClick={() => toggleSeries(s.title)}
                title={s.title}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors text-left w-full ${
                  compactLegend ? 'text-[11px]' : 'text-xs'
                } ${
                  active
                    ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    : 'border-gray-100 text-gray-300 bg-gray-50'
                }`}
              >
                <span
                  className="inline-block shrink-0 rounded"
                  style={{
                    width: compactLegend ? 12 : 20,
                    height: 2,
                    backgroundColor: active ? s.color : '#d1d5db',
                  }}
                />
                <span className={`truncate ${!active ? 'line-through' : ''}`}>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
