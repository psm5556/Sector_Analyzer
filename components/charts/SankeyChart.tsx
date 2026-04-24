'use client';

import { useRef, useState, useEffect } from 'react';
import { SankeyData, formatMarketCap } from '@/lib/moneyflow';

interface Props {
  data: SankeyData;
}

interface NodeLayout {
  id: string;
  label: string;
  side: 'left' | 'right';
  x: number;
  y: number;
  height: number;
  totalValue: number;
  color: string;
}

interface LinkLayout {
  sourceNode: NodeLayout;
  targetNode: NodeLayout;
  sourceY: number; // top of this link on source node
  targetY: number; // top of this link on target node
  height: number;  // thickness of the link
  value: number;
  label: string;
  color: string;
}

const LEFT_COLORS = [
  '#264653', '#2a9d8f', '#457b9d', '#1982c4', '#0077b6',
  '#023e8a', '#6a4c93', '#7b2d8b', '#9b2226', '#ae2012',
];
const RIGHT_COLORS = [
  '#e63946', '#f4a261', '#e9c46a', '#8ac926', '#52b788',
  '#2a9d8f', '#06d6a0', '#3a86ff', '#fb5607', '#ff595e',
  '#8338ec', '#ef233c', '#f77f00', '#6a0572', '#0077b6',
  '#b5179e', '#560bad', '#480ca8', '#3f37c9', '#4361ee',
];

function lighten(hex: string, amount = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

function buildLayout(data: SankeyData, width: number, height: number): {
  nodes: NodeLayout[];
  links: LinkLayout[];
} {
  const pad = { top: 30, bottom: 30, left: 20, right: 20, nodeWidth: 20, gap: 10 };
  const leftX = pad.left;
  const rightX = width - pad.right - pad.nodeWidth;
  const plotH = height - pad.top - pad.bottom;

  const leftNodes = data.nodes.filter(n => n.side === 'left');
  const rightNodes = data.nodes.filter(n => n.side === 'right');

  // compute totals per node
  const leftTotals = new Map<string, number>();
  const rightTotals = new Map<string, number>();
  for (const link of data.links) {
    leftTotals.set(link.source, (leftTotals.get(link.source) ?? 0) + link.value);
    rightTotals.set(link.target, (rightTotals.get(link.target) ?? 0) + link.value);
  }

  const totalFlow = Array.from(leftTotals.values()).reduce((a, b) => a + b, 0) || 1;

  // build node layouts
  const nodeLayouts = new Map<string, NodeLayout>();

  const layoutSide = (
    nodes: typeof data.nodes,
    totals: Map<string, number>,
    x: number,
    colors: string[]
  ) => {
    const totalGap = pad.gap * (nodes.length - 1);
    const availH = plotH - totalGap;
    let curY = pad.top;
    nodes.forEach((n, i) => {
      const total = totals.get(n.id) ?? 0;
      const h = Math.max(8, (total / totalFlow) * availH);
      nodeLayouts.set(n.id, {
        id: n.id,
        label: n.label,
        side: n.side,
        x,
        y: curY,
        height: h,
        totalValue: total,
        color: colors[i % colors.length],
      });
      curY += h + pad.gap;
    });
  };

  layoutSide(leftNodes, leftTotals, leftX, LEFT_COLORS);
  layoutSide(rightNodes, rightTotals, rightX, RIGHT_COLORS);

  // sort links per node by target/source to avoid crossing
  const leftLinkOffsets = new Map<string, number>();
  const rightLinkOffsets = new Map<string, number>();
  nodeLayouts.forEach((nl, id) => {
    leftLinkOffsets.set(id, nl.y);
    rightLinkOffsets.set(id, nl.y);
  });

  // sort links by target node y position to minimize crossings
  const sortedLinks = [...data.links].sort((a, b) => {
    const ay = nodeLayouts.get(a.target)?.y ?? 0;
    const by = nodeLayouts.get(b.target)?.y ?? 0;
    return ay - by;
  });

  const links: LinkLayout[] = [];
  for (const link of sortedLinks) {
    const src = nodeLayouts.get(link.source);
    const tgt = nodeLayouts.get(link.target);
    if (!src || !tgt) continue;

    const linkH = Math.max(2, (link.value / totalFlow) * (plotH - pad.gap * (leftNodes.length - 1)));
    const srcY = leftLinkOffsets.get(link.source) ?? src.y;
    const tgtY = rightLinkOffsets.get(link.target) ?? tgt.y;

    links.push({
      sourceNode: src,
      targetNode: tgt,
      sourceY: srcY,
      targetY: tgtY,
      height: linkH,
      value: link.value,
      label: link.label,
      color: src.color,
    });

    leftLinkOffsets.set(link.source, srcY + linkH);
    rightLinkOffsets.set(link.target, tgtY + linkH);
  }

  return { nodes: Array.from(nodeLayouts.values()), links };
}

export default function SankeyChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 720, h: 480 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: Math.max(400, width), h: Math.min(580, Math.max(360, width * 0.6)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, links } = buildLayout(data, dims.w, dims.h);
  const nodeWidth = 20;
  const midX = dims.w / 2;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        {/* Links */}
        {links.map((link, i) => {
          const x0 = link.sourceNode.x + nodeWidth;
          const x1 = link.targetNode.x;
          const y0t = link.sourceY;
          const y0b = link.sourceY + link.height;
          const y1t = link.targetY;
          const y1b = link.targetY + link.height;
          const cpx = (x0 + x1) / 2;
          const path = [
            `M${x0},${y0t}`,
            `C${cpx},${y0t} ${cpx},${y1t} ${x1},${y1t}`,
            `L${x1},${y1b}`,
            `C${cpx},${y1b} ${cpx},${y0b} ${x0},${y0b}`,
            'Z',
          ].join(' ');

          const isHovered = hovered === `${link.sourceNode.id}__${link.targetNode.id}`;

          return (
            <path
              key={i}
              d={path}
              fill={link.color}
              fillOpacity={isHovered ? 0.65 : 0.3}
              stroke={link.color}
              strokeOpacity={0.2}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
              onMouseEnter={e => {
                setHovered(`${link.sourceNode.id}__${link.targetNode.id}`);
                const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                setTooltip({
                  x: e.clientX - (rect?.left ?? 0) + 10,
                  y: e.clientY - (rect?.top ?? 0) - 30,
                  text: link.label,
                });
              }}
              onMouseLeave={() => { setHovered(null); setTooltip(null); }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(n => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={nodeWidth}
              height={n.height}
              fill={n.color}
              rx={3}
            />
            {/* Labels */}
            {n.side === 'left' ? (
              <text
                x={n.x + nodeWidth + 6}
                y={n.y + n.height / 2}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight="600"
                fill="#333"
              >
                {n.label}
              </text>
            ) : (
              <text
                x={n.x - 6}
                y={n.y + n.height / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight="600"
                fill="#333"
              >
                {n.label}
              </text>
            )}
            {/* Value label */}
            {n.height > 20 && (
              <text
                x={n.x + nodeWidth / 2}
                y={n.y + n.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="#fff"
                fontWeight="600"
              >
                {formatMarketCap(n.totalValue)}
              </text>
            )}
          </g>
        ))}

        {/* Column headers */}
        <text x={20 + nodeWidth / 2} y={16} textAnchor="middle" fontSize={12} fontWeight="700" fill="#555">팀</text>
        <text x={dims.w - 20 - nodeWidth / 2} y={16} textAnchor="middle" fontSize={12} fontWeight="700" fill="#555">섹터</text>
      </svg>

      {tooltip && (
        <div
          style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, pointerEvents: 'none' }}
          className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-xs z-10"
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
