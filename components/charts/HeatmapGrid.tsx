'use client';

import { useMemo } from 'react';

interface HeatmapCell {
  date: string;
  value: number;
}

interface HeatmapRow {
  label: string;
  ticker: string;
  cells: HeatmapCell[];
}

interface HeatmapGridProps {
  rows: HeatmapRow[];
  dates: string[];
  scale?: number; // max absolute value for color scale
}

function getColor(value: number, scale: number): string {
  if (isNaN(value)) return '#f9fafb';
  const ratio = Math.max(-1, Math.min(1, value / scale));
  if (ratio > 0) {
    // White -> dark green
    const intensity = Math.round(ratio * 100);
    if (intensity > 60) return '#388e3c';
    if (intensity > 30) return '#66bb6a';
    return '#c8e6c9';
  } else if (ratio < 0) {
    // White -> dark red
    const intensity = Math.round(-ratio * 100);
    if (intensity > 60) return '#d32f2f';
    if (intensity > 30) return '#ef5350';
    return '#ffcdd2';
  }
  return '#ffffff';
}

function getTextColor(bgColor: string): string {
  const dark = ['#388e3c', '#d32f2f'];
  return dark.includes(bgColor) ? '#ffffff' : '#1f2937';
}

export default function HeatmapGrid({ rows, dates, scale = 10 }: HeatmapGridProps) {
  const cellMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    rows.forEach((row) => {
      map[row.ticker] = {};
      row.cells.forEach((cell) => {
        map[row.ticker][cell.date] = cell.value;
      });
    });
    return map;
  }, [rows]);

  if (!rows.length || !dates.length) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  // Show abbreviated dates
  const formatDate = (d: string) => d.slice(5); // 'MM-DD'

  return (
    <div className="overflow-auto rounded-lg border border-gray-200">
      <table className="text-xs border-collapse" style={{ minWidth: dates.length * 36 + 160 }}>
        <thead>
          <tr className="bg-gray-50 sticky top-0 z-10">
            <th className="sticky left-0 bg-gray-50 border-b border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600 min-w-[160px] z-20">
              종목
            </th>
            {dates.map((d) => (
              <th
                key={d}
                className="border-b border-gray-200 px-0.5 py-1.5 font-medium text-gray-500 text-center"
                style={{ minWidth: 32, maxWidth: 48, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                title={d}
              >
                {formatDate(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker} className="hover:bg-gray-50">
              <td className="sticky left-0 bg-white border-b border-gray-100 px-2 py-1 font-medium text-gray-700 z-10 whitespace-nowrap">
                <span className="text-gray-900">{row.label}</span>
                <span className="text-gray-400 ml-1">{row.ticker}</span>
              </td>
              {dates.map((d) => {
                const val = cellMap[row.ticker]?.[d];
                const bg = val !== undefined ? getColor(val, scale) : '#f9fafb';
                const fg = val !== undefined ? getTextColor(bg) : '#9ca3af';
                return (
                  <td
                    key={d}
                    className="border-b border-gray-100 text-center p-0"
                    style={{ backgroundColor: bg, minWidth: 32, maxWidth: 48, height: 28 }}
                    title={`${row.label} (${row.ticker}) | ${d}: ${val !== undefined ? val.toFixed(2) + '%' : '-'}`}
                  >
                    <span style={{ color: fg, fontSize: 10 }}>
                      {val !== undefined ? val.toFixed(1) : ''}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
