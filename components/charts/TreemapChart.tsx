'use client';

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { TreemapRoot, getReturnColor, getReturnTextColor } from '@/lib/moneyflow';

interface Props {
  data: TreemapRoot;
}

interface ContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  depth?: number;
  root?: unknown;
  // custom data fields from leaf
  ticker?: string;
  company?: string;
  returnPct?: number | null;
  value?: number;
  children?: unknown[];
}

function CustomContent(props: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', depth = 0, returnPct, ticker, children } = props;

  if (width < 4 || height < 4) return null;

  // sector node (depth=1) — no fill, just border label
  if (depth === 1) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill="none" stroke="#fff" strokeWidth={2} />
        {width > 60 && height > 20 && (
          <text
            x={x + 6}
            y={y + 16}
            fontSize={11}
            fontWeight="bold"
            fill="#333"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  // leaf node (depth=2) — colored cell
  if (depth === 2) {
    const fill = getReturnColor(returnPct ?? null);
    const textColor = getReturnTextColor(returnPct ?? null);
    const label = ticker ?? name;
    const ret = returnPct != null ? (returnPct >= 0 ? '+' : '') + returnPct.toFixed(1) + '%' : '';

    return (
      <g>
        <rect
          x={x + 1}
          y={y + 1}
          width={width - 2}
          height={height - 2}
          fill={fill}
          stroke="#fff"
          strokeWidth={1}
          rx={2}
        />
        {width > 30 && height > 20 && (
          <text
            x={x + width / 2}
            y={y + height / 2 - (height > 40 ? 8 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(12, width / 5)}
            fontWeight="600"
            fill={textColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
        )}
        {width > 30 && height > 40 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(11, width / 6)}
            fill={textColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {ret}
          </text>
        )}
      </g>
    );
  }

  return null;
}

interface TooltipPayload {
  name?: string;
  ticker?: string;
  company?: string;
  returnPct?: number | null;
  value?: number;
  depth?: number;
  root?: unknown;
  children?: unknown[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: TooltipPayload }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || d.depth !== 2) return null;
  const ret = d.returnPct != null ? (d.returnPct >= 0 ? '+' : '') + d.returnPct.toFixed(2) + '%' : 'N/A';
  return (
    <div className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-sm">
      <div className="font-semibold">{d.company} ({d.ticker})</div>
      <div>수익률: <span className={d.returnPct != null && d.returnPct >= 0 ? 'text-green-700' : 'text-red-700'}>{ret}</span></div>
    </div>
  );
}

export default function TreemapChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={520}>
      <Treemap
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={data.children as any}
        dataKey="value"
        aspectRatio={4 / 3}
        content={<CustomContent />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
}
