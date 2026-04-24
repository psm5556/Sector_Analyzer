'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StreamDataPoint } from '@/lib/moneyflow';

interface Props {
  data: StreamDataPoint[];
  sectors: string[];
}

const COLORS = [
  '#e63946', '#2a9d8f', '#e9c46a', '#264653', '#f4a261',
  '#6a4c93', '#1982c4', '#8ac926', '#ff595e', '#6a0572',
  '#457b9d', '#a8dadc', '#f77f00', '#0077b6', '#7b2d8b',
  '#3a86ff', '#fb5607', '#8338ec', '#06d6a0', '#ef233c',
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
  return dateStr;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-xs max-h-60 overflow-y-auto">
      <div className="font-semibold mb-1">{label}</div>
      {payload
        .slice()
        .sort((a, b) => b.value - a.value)
        .map(entry => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span>{entry.name}:</span>
            <span className={entry.value >= 0 ? 'text-green-700' : 'text-red-700'}>
              {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)}%
            </span>
          </div>
        ))}
    </div>
  );
}

export default function StreamChart({ data, sectors }: Props) {
  const [normalized, setNormalized] = useState(false);

  // For normalized mode, convert to % share of total absolute values
  const chartData = data.map(row => {
    if (!normalized) return row;
    const total = sectors.reduce((s, sec) => s + Math.abs((row[sec] as number) ?? 0), 0);
    const newRow: StreamDataPoint = { date: row.date };
    sectors.forEach(sec => {
      const v = (row[sec] as number) ?? 0;
      newRow[sec] = total > 0 ? (v / total) * 100 : 0;
    });
    return newRow;
  });

  // evenly sample x-axis ticks (max 12)
  const tickInterval = Math.max(1, Math.floor(data.length / 12));

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="text-sm text-gray-600">Y축:</span>
        <button
          onClick={() => setNormalized(false)}
          className={`px-3 py-1 text-xs rounded border ${!normalized ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          절대 수익률 (%)
        </button>
        <button
          onClick={() => setNormalized(true)}
          className={`px-3 py-1 text-xs rounded border ${normalized ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          정규화 비중 (%)
        </button>
      </div>

      <ResponsiveContainer width="100%" height={460}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            interval={tickInterval}
            tick={{ fontSize: 11, fill: '#666' }}
            angle={-45}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={v => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: '#666' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {sectors.map((sec, i) => (
            <Area
              key={sec}
              type="monotone"
              dataKey={sec}
              stackId="a"
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.75}
              strokeWidth={0}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
