'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { StockAnalysis } from '@/lib/types';
import {
  buildTreemapData,
  buildStreamData,
  buildRRGData,
  buildSankeyData,
} from '@/lib/moneyflow';
import type { ColorMode } from '@/components/charts/TreemapChart';

const TreemapChart = dynamic(() => import('@/components/charts/TreemapChart'), { ssr: false });
const RRGChart = dynamic(() => import('@/components/charts/RRGChart'), { ssr: false });
const StreamChart = dynamic(() => import('@/components/charts/StreamChart'), { ssr: false });
const SankeyChart = dynamic(() => import('@/components/charts/SankeyChart'), { ssr: false });

type SubTab = 'treemap' | 'rrg' | 'stream' | 'sankey';

const SUB_TABS: { id: SubTab; label: string; desc: string }[] = [
  { id: 'treemap', label: '🗺️ 트리맵', desc: '팀 › 섹터 › 종목 계층 — 크기=√시총, 색=수익률' },
  { id: 'rrg', label: '🔄 RRG', desc: '섹터 로테이션 상대강도 분석' },
  { id: 'stream', label: '🌊 스트림', desc: '날짜별 섹터 누적수익 흐름' },
  { id: 'sankey', label: '🔀 상키', desc: '팀 → 섹터 자금 흐름' },
];

interface Props {
  results: StockAnalysis[];
}

export default function MoneyFlowTab({ results }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('treemap');
  const [colorMode, setColorMode] = useState<ColorMode>('cumul');

  const treemapData = useMemo(() => buildTreemapData(results), [results]);
  const { data: streamData, sectors: streamSectors } = useMemo(() => buildStreamData(results), [results]);
  const rrgSeries = useMemo(() => buildRRGData(results), [results]);
  const sankeyData = useMemo(() => buildSankeyData(results), [results]);

  // total sector count (sum across all teams)
  const sectorCount = useMemo(
    () => treemapData.children.reduce((sum, t) => sum + t.children.length, 0),
    [treemapData]
  );

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        사이드바에서 날짜를 설정하고 <strong className="mx-1">분석 시작</strong>을 눌러주세요.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            title={t.desc}
            className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${
              subTab === t.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab description */}
      <p className="text-xs text-gray-500">
        {SUB_TABS.find(t => t.id === subTab)?.desc}
      </p>

      {/* Chart panels */}
      <div className="rounded-xl overflow-hidden border border-gray-700"
        style={{ background: subTab === 'treemap' ? '#0d1117' : undefined }}>
        {subTab === 'treemap' && (
          <TreemapChart
            data={treemapData}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
          />
        )}

        {subTab !== 'treemap' && (
          <div className="bg-white p-4">
            {subTab === 'rrg' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  RRG (Relative Rotation Graph) — 섹터 로테이션 분석
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  X축: RS-Ratio (100=시장평균), Y축: RS-Momentum (100=기준). 점이 시계방향으로 이동: Leading→Weakening→Lagging→Improving
                </p>
                {rrgSeries.length > 0 ? (
                  <RRGChart series={rrgSeries} />
                ) : (
                  <div className="text-sm text-gray-400 py-10 text-center">누적 수익률 데이터가 부족합니다.</div>
                )}
              </div>
            )}

            {subTab === 'stream' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  스트림 차트 — 날짜별 섹터 누적 수익률 흐름
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  각 섹터의 평균 누적 수익률을 누적 면적으로 표시. 정규화 모드에서는 비중(%) 확인 가능.
                </p>
                {streamData.length > 0 ? (
                  <StreamChart data={streamData} sectors={streamSectors} />
                ) : (
                  <div className="text-sm text-gray-400 py-10 text-center">수익률 데이터가 없습니다.</div>
                )}
              </div>
            )}

            {subTab === 'sankey' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  상키 다이어그램 — 팀 → 섹터 자금 흐름
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  링크 굵기 = 시총 합계 (시총 데이터 없을 시 종목 수 기반). 호버로 상세 확인.
                </p>
                {sankeyData.links.length > 0 ? (
                  <SankeyChart data={sankeyData} />
                ) : (
                  <div className="text-sm text-gray-400 py-10 text-center">데이터가 없습니다.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="text-xs text-gray-400 text-right">
        {results.length}개 종목 · {sectorCount}개 섹터 · {treemapData.children.length}개 팀
      </div>
    </div>
  );
}
