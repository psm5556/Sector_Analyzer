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
}

export default function TrendLineChart({ series, height = 350, title, yMin, yMax }: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});

  // Visibility state — keyed by series title
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  // Reset visibility when the set of series changes
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

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />

      {/* Interactive legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {validSeries.map((s) => {
          const active = visibility[s.title] !== false;
          return (
            <button
              key={s.title}
              onClick={() => toggleSeries(s.title)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border transition-colors ${
                active
                  ? 'border-gray-300 text-gray-700 bg-white'
                  : 'border-gray-100 text-gray-300 bg-gray-50 line-through'
              }`}
            >
              <span
                className="inline-block w-5 h-0.5 rounded shrink-0"
                style={{
                  backgroundColor: active ? s.color : '#d1d5db',
                  borderStyle: s.lineStyle === LineStyle.Dashed || s.lineStyle === LineStyle.Dotted ? 'dashed' : 'solid',
                }}
              />
              {s.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
