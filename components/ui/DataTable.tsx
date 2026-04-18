'use client';

import { useState, useMemo } from 'react';
import { StockAnalysis } from '@/lib/types';
import { formatNumber, parseMarketCapValue } from '@/lib/calculations';

interface DataTableProps {
  data: StockAnalysis[];
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
}

type SortKey = keyof StockAnalysis;
type SortDir = 'asc' | 'desc';

function colorForReturn(val: number | null): string {
  if (val === null) return '';
  if (val > 0) return 'text-emerald-700 font-medium';
  if (val < 0) return 'text-red-600 font-medium';
  return '';
}

function bgForDebt(val: string): string {
  const n = parseFloat(val);
  if (!isNaN(n) && n <= 30) return 'bg-emerald-50';
  return '';
}

function bgForMarketCap(val: string): string {
  const n = parseMarketCapValue(val);
  if (n <= 100_000_000_000) return 'bg-emerald-50';
  return '';
}

const COLUMNS: { key: SortKey; label: string; width?: string }[] = [
  { key: 'team', label: '팀', width: '60px' },
  { key: 'assetType', label: '자산', width: '90px' },
  { key: 'sector', label: '섹터', width: '130px' },
  { key: 'company', label: '기업명', width: '140px' },
  { key: 'ticker', label: '티커', width: '70px' },
  { key: 'marketCap', label: '시총', width: '80px' },
  { key: 'basePrice', label: '시작가', width: '80px' },
  { key: 'highPrice', label: '최고가', width: '80px' },
  { key: 'currentPrice', label: '현재가', width: '80px' },
  { key: 'cumulReturnBase', label: '누적수익(시작)', width: '100px' },
  { key: 'cumulReturnHigh', label: '누적수익(최고)', width: '100px' },
  { key: 'dailyProfit', label: '당일손익', width: '80px' },
  { key: 'dailyReturnPct', label: '일변동률%', width: '80px' },
  { key: 'debtEquity', label: '부채비율', width: '80px' },
  { key: 'currentRatio', label: '유동비율', width: '80px' },
  { key: 'roe', label: 'ROE', width: '70px' },
  { key: 'runway', label: 'Runway(년)', width: '90px' },
  { key: 'totalCash', label: '총현금', width: '80px' },
  { key: 'fcf', label: 'FCF', width: '80px' },
];

export default function DataTable({ data, selectedTicker, onSelect }: DataTableProps) {
  // null = no sort → preserve original Google Sheets order
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [search, setSearch] = useState('');

  const teams = useMemo(() => Array.from(new Set(data.map((d) => d.team))).sort(), [data]);
  const sectors = useMemo(() => Array.from(new Set(data.map((d) => d.sector))).sort(), [data]);

  const sorted = useMemo(() => {
    let filtered = data.filter((row) => {
      if (filterTeam && row.team !== filterTeam) return false;
      if (filterSector && row.sector !== filterSector) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          row.company.toLowerCase().includes(q) ||
          row.ticker.toLowerCase().includes(q) ||
          row.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Only sort when a column is explicitly selected
    if (sortKey !== null) {
      filtered = [...filtered].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === null || av === '-') return 1;
        if (bv === null || bv === '-') return -1;
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  }, [data, sortKey, sortDir, filterTeam, filterSector, search]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const resetSort = () => {
    setSortKey(null);
    setSortDir('desc');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="기업명/티커 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 팀</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 섹터</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {sortKey !== null && (
          <button
            onClick={resetSort}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
            title="구글 시트 원래 순서로 복원"
          >
            ↺ 원래 순서
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">{sorted.length} / {data.length} 종목</span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-gray-200 max-h-[480px]">
        <table className="text-xs w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-2 text-left font-medium text-gray-400 w-8">#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-2 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap select-none"
                  style={{ minWidth: col.width }}
                >
                  {col.label}
                  {sortKey === col.key ? (
                    <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  ) : (
                    <span className="ml-1 text-gray-300">↕</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, displayIdx) => {
              const isSelected = row.ticker === selectedTicker;
              // Show original position in data array (Google Sheets order)
              const originalIdx = data.indexOf(row) + 1;
              return (
                <tr
                  key={row.ticker}
                  onClick={() => onSelect(row.ticker)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-2 py-1.5 text-gray-300 text-right">{originalIdx}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{row.team}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{row.assetType}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">{row.sector}</td>
                  <td className="px-2 py-1.5 font-medium text-gray-900 whitespace-nowrap">{row.company}</td>
                  <td className="px-2 py-1.5">
                    <a
                      href={`https://finviz.com/quote.ashx?t=${row.ticker}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline"
                    >
                      {row.ticker}
                    </a>
                  </td>
                  <td className={`px-2 py-1.5 whitespace-nowrap ${bgForMarketCap(row.marketCap)}`}>{row.marketCap}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(row.basePrice)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(row.highPrice)}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{formatNumber(row.currentPrice)}</td>
                  <td className={`px-2 py-1.5 text-right ${colorForReturn(row.cumulReturnBase)}`}>
                    {row.cumulReturnBase !== null ? `${formatNumber(row.cumulReturnBase)}%` : '-'}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${colorForReturn(row.cumulReturnHigh)}`}>
                    {row.cumulReturnHigh !== null ? `${formatNumber(row.cumulReturnHigh)}%` : '-'}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${colorForReturn(row.dailyProfit)}`}>
                    {formatNumber(row.dailyProfit)}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${colorForReturn(row.dailyReturnPct)}`}>
                    {row.dailyReturnPct !== null ? `${formatNumber(row.dailyReturnPct)}%` : '-'}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${bgForDebt(row.debtEquity)}`}>{row.debtEquity}</td>
                  <td className="px-2 py-1.5 text-right">{row.currentRatio}</td>
                  <td className="px-2 py-1.5 text-right">{row.roe}</td>
                  <td className="px-2 py-1.5 text-right">{row.runway}</td>
                  <td className="px-2 py-1.5 text-right">{row.totalCash}</td>
                  <td className={`px-2 py-1.5 text-right ${colorForReturn(parseFloat(row.fcf) < 0 ? -1 : parseFloat(row.fcf) > 0 ? 1 : null)}`}>
                    {row.fcf}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
