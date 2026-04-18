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
import MiniBarChart from '@/components/charts/MiniBarChart';

const TrendLineChart = dynamic(() => import('@/components/charts/TrendLineChart'), { ssr: false });
const HistogramChart = dynamic(() => import('@/components/charts/HistogramChart'), { ssr: false });

function getTeamColor(team: string): string {
  if (team.includes('청')) return '#2563eb'; // Blue
  if (team.includes('백')) return '#16a34a'; // Green
  if (team.includes('흑')) return '#111827'; // Black
  return '#9333ea'; // Purple fallback
}

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
    () =>
      teams.map((team) => ({
        data: calcTeamAverageCumul(results, team),
        color: getTeamColor(team),
        title: team,
      })),
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
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          1️⃣ 청팀 vs 백팀 누적수익률 비교 (가중평균 포함)
        </h2>
        <TrendLineChart
          series={[
            ...teamCumul,
            {
              data: marketAvg,
              color: '#ef4444',
              title: '시장 전체 가중평균',
              lineWidth: 2 as const,
              lineStyle: LineStyle.Dotted,
            },
          ]}
          height={300}
          yMin={yMinCumul}
          yMax={yMaxCumul}
        />
      </div>

      {/* Team daily change */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">청팀 vs 백팀 평균 변동률 비교</h2>
        <div className={`grid grid-cols-1 ${teams.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
          {teams.map((team) => {
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
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: getTeamColor(team) }}
                >
                  {team}
                </p>
                <HistogramChart data={avgDailyReturns} startDate={startDate} height={180} yMin={-10} yMax={10} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector trends */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">2️⃣ 섹터별 평균 누적변동률 트렌드</h2>
        <TrendLineChart
          series={sectorCumulSeries}
          height={500}
          yMin={yMinCumul}
          yMax={yMaxCumul}
          compactLegend={true}
        />
      </div>

      {/* Sector deep-dive — 5-column grid with time-series cumulative return bars */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">3️⃣ 섹터별 개별 종목 누적변동률</h2>
        <div className="flex flex-col gap-2">
          {sectors.map((sector) => {
            const stocks = sectorGroups[sector] || [];
            const isOpen = expandedSectors.has(sector);
            return (
              <div key={sector} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSector(sector)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-700">
                    📂 {sector}
                    <span className="ml-2 text-xs text-gray-400">{stocks.length}개 종목</span>
                  </span>
                  <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="p-4">
                    {/* 5-column grid matching original Plotly subplots layout */}
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
                    >
                      {stocks.map((stock) => {
                        const val = stock.cumulReturnBase;
                        const isPos = val !== null && val >= 0;
                        return (
                          <div
                            key={stock.ticker}
                            className="border border-gray-100 rounded-lg p-2 bg-gray-50"
                          >
                            {/* Title: 기업명(티커) */}
                            <div
                              className="text-[10px] font-medium text-gray-700 truncate leading-tight mb-1"
                              title={`${stock.company}(${stock.ticker})`}
                            >
                              {stock.company}({stock.ticker})
                            </div>
                            {/* Final return badge */}
                            <div
                              className={`text-[11px] font-bold mb-1.5 ${isPos ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              {val !== null ? `${val.toFixed(2)}%` : '-'}
                            </div>
                            {/* Time-series cumulative return mini bar chart */}
                            <div className="w-full">
                              <MiniBarChart
                                data={stock.cumulReturns}
                                yMin={yMinCumul}
                                yMax={yMaxCumul}
                                width={140}
                                height={60}
                              />
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
