'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { DailyReturn } from '@/lib/types';

interface HistogramChartProps {
  data: DailyReturn[];
  title?: string;
  startDate?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
}

export default function HistogramChart({
  data,
  title,
  startDate,
  yMin = -10,
  yMax = 10,
  height = 220,
}: HistogramChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current || !data.length) return;

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
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: false,
        minimum: yMin,
        maximum: yMax,
      } as Parameters<typeof chart.applyOptions>[0]['rightPriceScale'],
      timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      crosshair: { mode: 1 },
    });

    chartRef.current = chart;

    const histSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const histData = data.map((d) => ({
      time: d.date as Parameters<typeof histSeries.setData>[0][0]['time'],
      value: d.value,
      color: d.value >= 0 ? '#26a69a' : '#ef5350',
    }));
    histSeries.setData(histData);

    // Start date marker line (baseline)
    if (startDate) {
      histSeries.createPriceLine({
        price: 0,
        color: '#9ca3af',
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: false,
        title: '',
      });
    }

    chart.timeScale().fitContent();
  }, [data, yMin, yMax, startDate, height]);

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

  if (!data.length) {
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
      {title && <div className="text-xs font-medium text-gray-500 mb-1">{title}</div>}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
