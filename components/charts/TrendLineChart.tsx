'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, LineStyle } from 'lightweight-charts';
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

const COLORS = [
  '#1a56db', '#0e9f6e', '#e02424', '#d97706', '#7e3af2',
  '#e74694', '#0694a2', '#ff5a1f', '#31c48d', '#6875f5',
  '#84cc16', '#f43f5e', '#06b6d4', '#a855f7', '#fb923c',
  '#22d3ee', '#ec4899', '#10b981', '#f97316', '#8b5cf6',
];

export default function TrendLineChart({ series, height = 350, title, yMin, yMax }: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current || !series.length) return;

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

    series.forEach((s, i) => {
      if (!s.data.length) return;
      const lineSeries = chart.addLineSeries({
        color: s.color || COLORS[i % COLORS.length],
        lineWidth: s.lineWidth ?? 2,
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
    });

    // Zero line
    const baselineSeries = chart.addLineSeries({
      color: '#9ca3af',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      title: '',
    });
    const allDates = series.flatMap((s) => s.data.map((d) => d.date)).sort();
    if (allDates.length >= 2) {
      baselineSeries.setData([
        { time: allDates[0] as Parameters<typeof baselineSeries.setData>[0][0]['time'], value: 0 },
        { time: allDates[allDates.length - 1] as Parameters<typeof baselineSeries.setData>[0][0]['time'], value: 0 },
      ]);
    }

    chart.timeScale().fitContent();
  }, [series, height, yMin, yMax]);

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
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {validSeries.map((s, i) => (
          <span key={s.title} className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="inline-block w-6 h-0.5 rounded"
              style={{ backgroundColor: s.color || COLORS[i % COLORS.length] }}
            />
            {s.title}
          </span>
        ))}
      </div>
    </div>
  );
}
