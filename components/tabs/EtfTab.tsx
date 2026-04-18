'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { EtfAnalysis } from '@/lib/types';

const TrendLineChart = dynamic(() => import('@/components/charts/TrendLineChart'), { ssr: false });

const ETF_COLORS = [
  '#1a56db', '#0e9f6e', '#e02424', '#d97706', '#7e3af2',
  '#e74694', '#0694a2', '#ff5a1f', '#31c48d', '#6875f5',
  '#84cc16', '#f43f5e', '#06b6d4', '#a855f7', '#fb923c',
  '#22d3ee', '#ec4899', '#10b981', '#f97316', '#8b5cf6',
];

interface EtfTabProps {
  results: EtfAnalysis[];
  yMinCumul: number;
  yMaxCumul: number;
}

export default function EtfTab({ results, yMinCumul, yMaxCumul }: EtfTabProps) {
  const categories = useMemo(
    () => Array.from(new Set(results.map((r) => r.category))).sort(),
    [results]
  );

  const byCategory = useMemo(() => {
    return categories.reduce<Record<string, EtfAnalysis[]>>((acc, cat) => {
      acc[cat] = results.filter((r) => r.category === cat);
      return acc;
    }, {});
  }, [results, categories]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-4xl mb-3">🌐</span>
        <p className="text-base font-medium">ETF 분석 결과가 없습니다.</p>
        <p className="text-sm mt-1">분석 시작 버튼을 눌러주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => {
        const etfs = byCategory[category] ?? [];
        const series = etfs.map((etf, i) => ({
          data: etf.cumulReturns,
          color: ETF_COLORS[i % ETF_COLORS.length],
          title: `${etf.sector}(${etf.ticker})`,
          lineWidth: 2 as const,
        }));

        return (
          <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">{category}</h2>
            <div className="flex gap-3 flex-wrap mb-3">
              {etfs.map((etf) => {
                const val = etf.cumulReturnBase;
                const isPos = val !== null && val >= 0;
                return (
                  <span
                    key={etf.ticker}
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      isPos
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {etf.sector}({etf.ticker}){' '}
                    {val !== null ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : '-'}
                  </span>
                );
              })}
            </div>
            <TrendLineChart
              series={series}
              height={280}
              yMin={yMinCumul}
              yMax={yMaxCumul}
              compactLegend={series.length > 6}
            />
          </div>
        );
      })}
    </div>
  );
}
