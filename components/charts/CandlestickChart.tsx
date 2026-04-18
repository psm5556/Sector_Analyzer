'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import { OHLCData, PricePoint } from '@/lib/types';

interface MaSeries {
  ma20?: PricePoint[];
  ma60?: PricePoint[];
  ma125?: PricePoint[];
  ma200?: PricePoint[];
  ma240?: PricePoint[];
  ma365?: PricePoint[];
}

interface CandlestickChartProps extends MaSeries {
  ohlc: OHLCData[];
  startDate?: string;
  height?: number;
}

const MA_CONFIG: { key: keyof MaSeries; label: string; color: string }[] = [
  { key: 'ma20',  label: 'MA20',  color: '#06b6d4' },  // cyan
  { key: 'ma60',  label: 'MA60',  color: '#22c55e' },  // green
  { key: 'ma125', label: 'MA125', color: '#f59e0b' },  // amber
  { key: 'ma200', label: 'MA200', color: '#7B1FA2' },  // purple
  { key: 'ma240', label: 'MA240', color: '#E65100' },  // deep orange
  { key: 'ma365', label: 'MA365', color: '#616161' },  // gray
];

type VisibilityState = Record<'candle' | keyof MaSeries, boolean>;

const DEFAULT_VISIBILITY: VisibilityState = {
  candle: true,
  ma20: true, ma60: true, ma125: true,
  ma200: true, ma240: true, ma365: true,
};

export default function CandlestickChart({
  ohlc,
  ma20 = [], ma60 = [], ma125 = [],
  ma200 = [], ma240 = [], ma365 = [],
  startDate,
  height = 420,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Store series refs to toggle visibility without recreating the chart
  const seriesRefs = useRef<Partial<Record<'candle' | keyof MaSeries, ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>>>>({});
  const [visibility, setVisibility] = useState<VisibilityState>({ ...DEFAULT_VISIBILITY });

  const maData: Record<keyof MaSeries, PricePoint[]> = { ma20, ma60, ma125, ma200, ma240, ma365 };

  const initChart = useCallback(() => {
    if (!containerRef.current || !ohlc.length) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    seriesRefs.current = {};

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
      timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candleSeries.setData(ohlc as Parameters<typeof candleSeries.setData>[0]);
    seriesRefs.current.candle = candleSeries;

    // Start date marker
    if (startDate) {
      const closest = ohlc.find((d) => d.time >= startDate) || ohlc[0];
      candleSeries.setMarkers([{
        time: closest.time as Parameters<typeof candleSeries.setMarkers>[0][0]['time'],
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'arrowDown',
        text: '시작',
        size: 1,
      }]);
    }

    // MA line series
    for (const cfg of MA_CONFIG) {
      const data = maData[cfg.key];
      if (data && data.length > 0) {
        const s = chart.addLineSeries({
          color: cfg.color,
          lineWidth: 1 as const,
          title: cfg.label,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(data as Parameters<typeof s.setData>[0]);
        seriesRefs.current[cfg.key] = s;
      }
    }

    chart.timeScale().fitContent();
  }, [ohlc, ma20, ma60, ma125, ma200, ma240, ma365, startDate, height]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recreate chart when data changes
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

  // Apply visibility changes without recreating the chart
  useEffect(() => {
    (Object.keys(visibility) as Array<keyof VisibilityState>).forEach((key) => {
      const s = seriesRefs.current[key];
      if (s) s.applyOptions({ visible: visibility[key] });
    });
  }, [visibility]);

  const toggleSeries = (key: keyof VisibilityState) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!ohlc.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  return (
    <div>
      {/* Legend / toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-2">
        {/* Candlestick toggle */}
        <button
          onClick={() => toggleSeries('candle')}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border transition-colors ${
            visibility.candle
              ? 'border-gray-400 text-gray-700 bg-white'
              : 'border-gray-200 text-gray-300 bg-gray-50'
          }`}
        >
          <span className="inline-block w-3 h-3 rounded-sm bg-[#26a69a]" />
          캔들
        </button>
        {/* MA toggles */}
        {MA_CONFIG.map((cfg) => {
          const hasSeries = (maData[cfg.key]?.length ?? 0) > 0;
          if (!hasSeries) return null;
          const active = visibility[cfg.key];
          return (
            <button
              key={cfg.key}
              onClick={() => toggleSeries(cfg.key)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border transition-colors ${
                active
                  ? 'border-gray-300 text-gray-700 bg-white'
                  : 'border-gray-100 text-gray-300 bg-gray-50'
              }`}
            >
              <span
                className="inline-block w-5 h-0.5 rounded"
                style={{ backgroundColor: active ? cfg.color : '#d1d5db' }}
              />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
