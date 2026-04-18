'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { StockAnalysis } from '@/lib/types';
import {
  calcTeamAverageCumul,
  calcSectorAverageCumul,
  calcMarketAverage,
  groupBySector,
} from '@/lib/calculations';
import { LineStyle } from 'lightweight-charts';

const TrendLineChart = dynamic(() => import('@/components/charts/TrendLineChart'), { ssr: false });
const HistogramChart = dynamic(() => import('@/components/charts/HistogramChart'), { ssr: false });

const SECTOR_COLORS = [
  '#1a56db', '#0e9f6e', '#e02424', '#d97706', '#7e3af2',
  '#e74694', '#0694a2', '#ff5a1f', '#31c48d', '#6875f5',
  '#84cc16', '#f43f5e', '#06b6d4', '#a855f7', '#fb923c',
  '#22d3ee', '#ec4899', '#10b981', '#f97316', '#8b5cf6',
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6',
  '#14b8a6', '#f43f5e', '#64748b', '#78716c', '#a3a3a3',
];

interface TrendTabProps {
  results: StockAnalysis[];
  yMinCumul: number;
  yMaxCumul: number;
  startDate: string;
}

export default function TrendTab({ results, yMinCumul, yMaxCumul, startDate }: TrendTabProps) {
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  const teams = useMemo(() => Array.from(new Set(results.map((r) => r.team))).sort(), [results]);
  const sectors = useMemo(() => Array.from(new Set(results.map((r) => r.sector))).sort(), [results]);
  const sectorGroups = useMemo(() => groupBySector(results), [results]);

  const teamCumul = useMemo(
    () => teams.map((team, i) => ({ data: calcTeamAverageCumul(results, team), color: i === 0 ? '#1a56db' : '#e02424', title: team })),
    [results, teams]
  );
  const marketAvg = useMemo(() => calcMarketAverage(results), [results]);

  const sectorCumulSeries = useMemo(
    () =>
      sectors.map((sector, i) => ({
        data: calcSectorAverageCumul(results, sector),
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        title: sector,
        lineWidth: 1 as const,
      })),
    [results, sectors]
  );

  const toggleSector = (sector: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-4xl mb-3">📊</span>
        <p className="text-base font-medium">분석 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Team comparison */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">팀별 누적수익률 비교</h2>
        <TrendLineChart
          series={[
            ...teamCumul,
            { data: marketAvg, color: '#ef4444', title: '전체 평균', lineWidth: 2, lineStyle: LineStyle.Dashed },
          ]}
          height={300}
          yMin={yMinCumul}
          yMax={yMaxCumul}
        />
      </div>

      {/* Team daily change */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">팀별 평균 일변동률</h2>
        <div className={`grid grid-cols-1 ${teams.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
          {teams.map((team, i) => {
            const teamStocks = results.filter((r) => r.team === team);
            const dateSet = new Set<string>();
            teamStocks.forEach((s) => s.dailyReturns.forEach((r) => dateSet.add(r.date)));
            const dates = Array.from(dateSet).sort();
            const avgDailyReturns = dates.map((date) => {
              const vals = teamStocks
                .map((s) => s.dailyReturns.find((r) => r.date === date)?.value)
                .filter((v): v is number => v !== undefined);
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
              return { date, value: avg };
            });
            return (
              <div key={team}>
                <p className="text-xs font-medium text-gray-600 mb-2">{team}</p>
                <HistogramChart data={avgDailyReturns} startDate={startDate} height={180} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector trends */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">섹터별 누적수익률 트렌드</h2>
        <TrendLineChart
          series={sectorCumulSeries}
          height={450}
          yMin={yMinCumul}
          yMax={yMaxCumul}
        />
      </div>

      {/* Sector deep-dive */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">섹터별 개별 종목 분석</h2>
        <div className="flex flex-col gap-3">
          {sectors.map((sector) => {
            const stocks = sectorGroups[sector] || [];
            const isOpen = expandedSectors.has(sector);
            return (
              <div key={sector} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSector(sector)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {sector}
                    <span className="ml-2 text-xs text-gray-400">{stocks.length}개 종목</span>
                  </span>
                  <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="p-4">
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
                    >
                      {stocks.map((stock) => {
                        const val = stock.cumulReturnBase;
                        const isPos = val !== null && val >= 0;
                        return (
                          <div
                            key={stock.ticker}
                            className="border border-gray-100 rounded-lg p-3 bg-gray-50"
                          >
                            <div className="text-xs font-medium text-gray-700 truncate">
                              {stock.company}
                            </div>
                            <div className="text-xs text-gray-400 mb-2">{stock.ticker}</div>
                            {/* Mini bar */}
                            <div className="relative h-6 bg-gray-200 rounded overflow-hidden">
                              <div
                                className={`absolute top-0 h-full rounded transition-all ${isPos ? 'bg-emerald-400 left-1/2' : 'bg-red-400 right-1/2'}`}
                                style={{
                                  width: val !== null ? `${Math.min(50, (Math.abs(val) / Math.max(Math.abs(yMinCumul), Math.abs(yMaxCumul))) * 50)}%` : '0%',
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-800">
                                {val !== null ? `${val.toFixed(1)}%` : '-'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
