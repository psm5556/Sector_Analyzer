'use client';

import { useMemo, useState } from 'react';
import { StockAnalysis, HeatmapType } from '@/lib/types';
import HeatmapGrid from '@/components/charts/HeatmapGrid';

interface HeatmapTabProps {
  results: StockAnalysis[];
}

export default function HeatmapTab({ results }: HeatmapTabProps) {
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('cumul');
  const [filterTeams, setFilterTeams] = useState<string[]>([]);
  const [filterSectors, setFilterSectors] = useState<string[]>([]);

  const teams = useMemo(() => Array.from(new Set(results.map((r) => r.team))).sort(), [results]);
  const sectors = useMemo(() => Array.from(new Set(results.map((r) => r.sector))).sort(), [results]);

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (filterTeams.length > 0 && !filterTeams.includes(r.team)) return false;
      if (filterSectors.length > 0 && !filterSectors.includes(r.sector)) return false;
      return true;
    });
  }, [results, filterTeams, filterSectors]);

  const { rows, dates } = useMemo(() => {
    if (filteredResults.length === 0) return { rows: [], dates: [] };

    const dateSet = new Set<string>();
    filteredResults.forEach((r) => {
      const source = heatmapType === 'cumul' ? r.cumulReturns : r.dailyReturns;
      source.forEach((d) => dateSet.add(d.date));
    });
    const sortedDates = Array.from(dateSet).sort();

    const rows = filteredResults.map((r) => {
      const source = heatmapType === 'cumul' ? r.cumulReturns : r.dailyReturns;
      const cellMap: Record<string, number> = {};
      source.forEach((d) => { cellMap[d.date] = d.value; });
      return {
        label: r.company,
        ticker: r.ticker,
        cells: sortedDates.map((d) => ({ date: d, value: cellMap[d] ?? NaN })),
      };
    });

    return { rows, dates: sortedDates };
  }, [filteredResults, heatmapType]);

  const stats = useMemo(() => {
    const allVals = rows.flatMap((r) => r.cells.map((c) => c.value)).filter((v) => !isNaN(v));
    if (!allVals.length) return null;
    const avg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
    const max = Math.max(...allVals);
    const min = Math.min(...allVals);
    const std = Math.sqrt(allVals.reduce((a, b) => a + (b - avg) ** 2, 0) / allVals.length);
    return { avg, max, min, std };
  }, [rows]);

  const toggleTeam = (team: string) => {
    setFilterTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const toggleSector = (sector: string) => {
    setFilterSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  };

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-4xl mb-3">🔥</span>
        <p className="text-base font-medium">분석 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-6">
          {/* Heatmap type */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">히트맵 유형</p>
            <div className="flex gap-2">
              <button
                onClick={() => setHeatmapType('cumul')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  heatmapType === 'cumul' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                누적수익률
              </button>
              <button
                onClick={() => setHeatmapType('daily')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  heatmapType === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                일일변동률
              </button>
            </div>
          </div>

          {/* Team filter */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">팀 필터</p>
            <div className="flex flex-wrap gap-1.5">
              {teams.map((team) => (
                <button
                  key={team}
                  onClick={() => toggleTeam(team)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    filterTeams.includes(team)
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>

          {/* Sector filter */}
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-semibold text-gray-600 mb-2">섹터 필터</p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-auto">
              {sectors.map((sector) => (
                <button
                  key={sector}
                  onClick={() => toggleSector(sector)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    filterSectors.includes(sector)
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                      : 'border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '평균 변동', value: `${stats.avg.toFixed(2)}%`, color: stats.avg >= 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: '최대 상승', value: `+${stats.max.toFixed(2)}%`, color: 'text-emerald-600' },
            { label: '최대 하락', value: `${stats.min.toFixed(2)}%`, color: 'text-red-600' },
            { label: '변동성 (σ)', value: `${stats.std.toFixed(2)}%`, color: 'text-gray-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">
            {heatmapType === 'cumul' ? '누적수익률 히트맵' : '일일변동률 히트맵'}
          </h2>
          <span className="text-xs text-gray-400">{filteredResults.length}개 종목 · {dates.length}일</span>
        </div>
        <HeatmapGrid rows={rows} dates={dates} scale={heatmapType === 'cumul' ? 30 : 10} />
      </div>
    </div>
  );
}
