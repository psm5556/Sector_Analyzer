'use client';

export type TabId = 'portfolio' | 'trend' | 'heatmap';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'portfolio', label: '📈 포트폴리오 분석' },
  { id: 'trend', label: '📊 트렌드 분석' },
  { id: 'heatmap', label: '🔥 히트맵' },
];

interface TabNavProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
            active === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
