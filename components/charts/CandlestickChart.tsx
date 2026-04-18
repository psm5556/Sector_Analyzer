'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickSeriesOptions,
  LineSeriesOptions,
} from 'lightweight-charts';
import { OHLCData, PricePoint } from '@/lib/types';

interface CandlestickChartProps {
  ohlc: OHLCData[];
  ma200?: PricePoint[];
  ma240?: PricePoint[];
  ma365?: PricePoint[];
  startDate?: string;
  height?: number;
}

export default function CandlestickChart({
  ohlc,
  ma200 = [],
  ma240 = [],
  ma365 = [],
  startDate,
  height = 420,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current || !ohlc.length) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#374151',
        fontSize: 12,
      },
      width: containerRef.current.clientWidth,
      height,
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e5e7eb' },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    } as Partial<CandlestickSeriesOptions>);
    candleSeries.setData(ohlc as Parameters<typeof candleSeries.setData>[0]);

    // Moving averages
    if (ma200.length) {
      const s = chart.addLineSeries({ color: '#7B1FA2', lineWidth: 1, title: 'MA200', priceLineVisible: false } as Partial<LineSeriesOptions>);
      s.setData(ma200 as Parameters<typeof s.setData>[0]);
    }
    if (ma240.length) {
      const s = chart.addLineSeries({ color: '#E65100', lineWidth: 1, title: 'MA240', priceLineVisible: false } as Partial<LineSeriesOptions>);
      s.setData(ma240 as Parameters<typeof s.setData>[0]);
    }
    if (ma365.length) {
      const s = chart.addLineSeries({ color: '#616161', lineWidth: 1, title: 'MA365', priceLineVisible: false } as Partial<LineSeriesOptions>);
      s.setData(ma365 as Parameters<typeof s.setData>[0]);
    }

    // Start date marker
    if (startDate && ohlc.find((d) => d.time >= startDate)) {
      const closestBar = ohlc.find((d) => d.time >= startDate) || ohlc[0];
      candleSeries.setMarkers([
        {
          time: closestBar.time as Parameters<typeof candleSeries.setMarkers>[0][0]['time'],
          position: 'aboveBar',
          color: '#ef4444',
          shape: 'arrowDown',
          text: '시작',
          size: 1,
        },
      ]);
    }

    chart.timeScale().fitContent();
  }, [ohlc, ma200, ma240, ma365, startDate, height]);

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
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  if (!ohlc.length) {
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
    <div className="relative">
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
      <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-6 h-0.5 bg-[#7B1FA2]" /> MA200
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-6 h-0.5 bg-[#E65100]" /> MA240
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-6 h-0.5 bg-[#616161]" /> MA365
        </span>
      </div>
    </div>
  );
}
