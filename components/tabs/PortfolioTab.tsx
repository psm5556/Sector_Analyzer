'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { StockAnalysis, ChartInterval } from '@/lib/types';
import DataTable from '@/components/ui/DataTable';
import HistogramChart from '@/components/charts/HistogramChart';

const CandlestickChart = dynamic(() => import('@/components/charts/CandlestickChart'), { ssr: false });

interface StockMaData {
  ohlc: { time: string; open: number; high: number; low: number; close: number }[];
  ma20: { time: string; value: number }[];
  ma60: { time: string; value: number }[];
  ma125: { time: string; value: number }[];
  ma200: { time: string; value: number }[];
  ma240: { time: string; value: number }[];
  ma365: { time: string; value: number }[];
}

interface PortfolioTabProps {
  results: StockAnalysis[];
  startDate: string;
  yMinDaily: number;
  yMaxDaily: number;
  yMinCumul: number;
  yMaxCumul: number;
}

export default function PortfolioTab({
  results,
  startDate,
  yMinDaily,
  yMaxDaily,
  yMinCumul,
  yMaxCumul,
}: PortfolioTabProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [interval, setInterval] = useState<ChartInterval>('1d');
  const [maData, setMaData] = useState<StockMaData | null>(null);
  const [maLoading, setMaLoading] = useState(false);

  const selectedStock = results.find((r) => r.ticker === selectedTicker) || null;

  useEffect(() => {
    if (!selectedTicker) {
      setMaData(null);
      return;
    }
    setMaLoading(true);
    fetch(`/api/stock-ma?ticker=${encodeURIComponent(selectedTicker)}&interval=${interval}`)
      .then((r) => r.json())
      .then((d) => setMaData(d))
      .catch(() => setMaData(null))
      .finally(() => setMaLoading(false));
  }, [selectedTicker, interval]);

  return (
    <div className="flex flex-col gap-6">
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <span className="text-4xl mb-3">📊</span>
          <p className="text-base font-medium">아직 분석 결과가 없습니다.</p>
          <p className="text-sm">왼쪽 사이드바에서 기간을 선택 후 분석을 시작하세요.</p>
        </div>
      ) : (
        <>
          {/* Stock detail panel */}
          {selectedStock && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedStock.company}
                    <span className="ml-2 text-sm font-normal text-gray-400">({selectedStock.ticker})</span>
                  </h2>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {selectedStock.sector}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">현재가</div>
                    <div className="text-lg font-bold text-gray-900">
                      ${selectedStock.currentPrice?.toFixed(2) ?? '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">누적수익(시작)</div>
                    <div
                      className={`text-lg font-bold ${
                        (selectedStock.cumulReturnBase ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {selectedStock.cumulReturnBase !== null
                        ? `${selectedStock.cumulReturnBase.toFixed(2)}%`
                        : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">누적수익(최고)</div>
                    <div
                      className={`text-lg font-bold ${
                        (selectedStock.cumulReturnHigh ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {selectedStock.cumulReturnHigh !== null
                        ? `${selectedStock.cumulReturnHigh.toFixed(2)}%`
                        : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">일변동률</div>
                    <div
                      className={`text-lg font-bold ${
                        (selectedStock.dailyReturnPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {selectedStock.dailyReturnPct !== null
                        ? `${selectedStock.dailyReturnPct.toFixed(2)}%`
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interval toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInterval('1d')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    interval === '1d'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  일봉
                </button>
                <button
                  onClick={() => setInterval('1wk')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    interval === '1wk'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  주봉
                </button>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Candlestick - takes 2/3 */}
                <div className="xl:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">캔들스틱 차트</p>
                  {maLoading ? (
                    <div className="flex items-center justify-center h-[420px] bg-gray-50 rounded-lg">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <CandlestickChart
                      ohlc={maData?.ohlc ?? selectedStock.prices}
                      ma20={maData?.ma20 ?? []}
                      ma60={maData?.ma60 ?? []}
                      ma125={maData?.ma125 ?? []}
                      ma200={maData?.ma200 ?? []}
                      ma240={maData?.ma240 ?? []}
                      ma365={maData?.ma365 ?? []}
                      startDate={startDate}
                      height={420}
                    />
                  )}
                </div>

                {/* Bar charts - 1/3 */}
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">일변동률 (%)</p>
                    <HistogramChart
                      data={selectedStock.dailyReturns}
                      startDate={startDate}
                      yMin={yMinDaily}
                      yMax={yMaxDaily}
                      height={200}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">누적수익률 (%)</p>
                    <HistogramChart
                      data={selectedStock.cumulReturns}
                      startDate={startDate}
                      yMin={yMinCumul}
                      yMax={yMaxCumul}
                      height={200}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              📋 포트폴리오 현황
              <span className="text-xs font-normal text-gray-400 ml-2">
                (행 클릭 시 차트 표시)
              </span>
            </h2>
            <DataTable
              data={results}
              selectedTicker={selectedTicker}
              onSelect={(ticker) => setSelectedTicker((prev) => (prev === ticker ? null : ticker))}
            />
          </div>
        </>
      )}
    </div>
  );
}
