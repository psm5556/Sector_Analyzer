'use client';

interface SidebarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  yMinDaily: number;
  yMaxDaily: number;
  onYMinDailyChange: (v: number) => void;
  onYMaxDailyChange: (v: number) => void;
  yMinCumul: number;
  yMaxCumul: number;
  onYMinCumulChange: (v: number) => void;
  onYMaxCumulChange: (v: number) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  progress: number;
  portfolioCount: number;
}

export default function Sidebar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  yMinDaily,
  yMaxDaily,
  onYMinDailyChange,
  onYMaxDailyChange,
  yMinCumul,
  yMaxCumul,
  onYMinCumulChange,
  onYMaxCumulChange,
  onAnalyze,
  isLoading,
  progress,
  portfolioCount,
}: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 flex flex-col gap-5">
      {/* Date Range */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📅 분석 기간</h3>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">시작일</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">종료일</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Y-axis Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📏 차트 Y축 범위</h3>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">일변동률 (%)</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={yMinDaily}
                onChange={(e) => onYMinDailyChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="최소"
              />
              <span className="text-gray-400 text-xs">~</span>
              <input
                type="number"
                value={yMaxDaily}
                onChange={(e) => onYMaxDailyChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="최대"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">누적수익률 (%)</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={yMinCumul}
                onChange={(e) => onYMinCumulChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="최소"
              />
              <span className="text-gray-400 text-xs">~</span>
              <input
                type="number"
                value={yMaxCumul}
                onChange={(e) => onYMaxCumulChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="최대"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        {portfolioCount > 0 && (
          <p className="text-xs text-gray-500 mb-3">포트폴리오: {portfolioCount}개 종목</p>
        )}
        <button
          onClick={onAnalyze}
          disabled={isLoading || portfolioCount === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {isLoading ? '분석 중...' : '📊 분석 시작'}
        </button>
        {isLoading && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>데이터 수집 중</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
