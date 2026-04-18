'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import TabNav, { TabId } from '@/components/ui/TabNav';
import PortfolioTab from '@/components/tabs/PortfolioTab';
import TrendTab from '@/components/tabs/TrendTab';
import HeatmapTab from '@/components/tabs/HeatmapTab';
import EtfTab from '@/components/tabs/EtfTab';
import { PortfolioItem, StockAnalysis, AnalysisStatus, EtfItem, EtfAnalysis } from '@/lib/types';
import { buildAnalysis, calcCumulReturns } from '@/lib/calculations';

const CONCURRENCY = 8;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function defaultStartDate() {
  // Matches original app.py: datetime(2025, 10, 9)
  return '2025-10-09';
}

async function fetchStockData(ticker: string, start: string, end: string) {
  const url = `/api/stock-price?ticker=${encodeURIComponent(ticker)}&start=${start}&end=${end}`;
  const res = await fetch(url);
  if (!res.ok) return { ohlc: [], volume: [] };
  return res.json();
}

async function fetchFinviz(ticker: string) {
  const res = await fetch(`/api/finviz?ticker=${encodeURIComponent(ticker)}`);
  if (!res.ok) return { marketCap: '-', debtEquity: '-', currentRatio: '-', roe: '-', totalCash: '-', fcf: '-' };
  return res.json();
}

async function analyzeOne(item: PortfolioItem, startDate: string, endDate: string): Promise<StockAnalysis> {
  const [priceData, finviz] = await Promise.all([
    fetchStockData(item.ticker, startDate, endDate),
    fetchFinviz(item.ticker),
  ]);
  return buildAnalysis(item, priceData.ohlc ?? [], finviz);
}

async function analyzeEtf(item: EtfItem, startDate: string, endDate: string): Promise<EtfAnalysis> {
  const priceData = await fetchStockData(item.ticker, startDate, endDate);
  const ohlc = priceData.ohlc ?? [];
  const basePrice = ohlc.length > 0 ? ohlc[0].close : null;
  const currentPrice = ohlc.length > 0 ? ohlc[ohlc.length - 1].close : null;
  const cumulReturnBase =
    basePrice && currentPrice && basePrice !== 0
      ? ((currentPrice - basePrice) / basePrice) * 100
      : null;
  const cumulReturns = basePrice ? calcCumulReturns(ohlc, basePrice) : [];
  return {
    ticker: item.ticker,
    company: item.company,
    category: item.category,
    sector: item.sector,
    basePrice,
    currentPrice,
    cumulReturnBase,
    cumulReturns,
  };
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress: (done: number, total: number) => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;
  let done = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (index < tasks.length) {
        const i = index++;
        results[i] = await tasks[i]();
        done++;
        onProgress(done, tasks.length);
      }
    })
  );
  return results;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [results, setResults] = useState<StockAnalysis[]>([]);
  const [etfPortfolio, setEtfPortfolio] = useState<EtfItem[]>([]);
  const [etfResults, setEtfResults] = useState<EtfAnalysis[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState(0);

  // Controls
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(todayStr());
  const [yMinDaily, setYMinDaily] = useState(-10);
  const [yMaxDaily, setYMaxDaily] = useState(10);
  const [yMinCumul, setYMinCumul] = useState(-50);
  const [yMaxCumul, setYMaxCumul] = useState(50);

  // Load portfolio and ETF list on mount
  useEffect(() => {
    fetch('/api/portfolio')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setPortfolioError(d.error);
        else setPortfolio(d.items ?? []);
      })
      .catch((e) => setPortfolioError(String(e)));

    fetch('/api/etf-portfolio')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setEtfPortfolio(d.items ?? []);
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!portfolio.length || status === 'loading') return;
    setStatus('loading');
    setProgress(0);
    setResults([]);
    setEtfResults([]);

    const total = portfolio.length + etfPortfolio.length;
    let done = 0;
    const onProgress = () => {
      done++;
      setProgress(Math.round((done / total) * 100));
    };

    try {
      const portfolioTasks = portfolio.map(
        (item) => async () => {
          const r = await analyzeOne(item, startDate, endDate);
          onProgress();
          return r;
        }
      );
      const etfTasks = etfPortfolio.map(
        (item) => async () => {
          const r = await analyzeEtf(item, startDate, endDate);
          onProgress();
          return r;
        }
      );

      const [analysisResults, etfAnalysisResults] = await Promise.all([
        runWithConcurrency(portfolioTasks, CONCURRENCY, () => {}),
        runWithConcurrency(etfTasks, CONCURRENCY, () => {}),
      ]);

      setResults(analysisResults);
      setEtfResults(etfAnalysisResults);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }, [portfolio, etfPortfolio, startDate, endDate, status]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">📈 투자 포트폴리오 대시보드</h1>
          {status === 'done' && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              ✓ {results.length}개 종목 · ETF {etfResults.length}개 분석 완료
            </span>
          )}
          {portfolioError && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
              ⚠ {portfolioError}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-6 py-5 flex gap-5">
        {/* Sidebar */}
        <Sidebar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          yMinDaily={yMinDaily}
          yMaxDaily={yMaxDaily}
          onYMinDailyChange={setYMinDaily}
          onYMaxDailyChange={setYMaxDaily}
          yMinCumul={yMinCumul}
          yMaxCumul={yMaxCumul}
          onYMinCumulChange={setYMinCumul}
          onYMaxCumulChange={setYMaxCumul}
          onAnalyze={handleAnalyze}
          isLoading={status === 'loading'}
          progress={progress}
          portfolioCount={portfolio.length}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col gap-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <TabNav active={activeTab} onChange={setActiveTab} />
            <div className="p-5">
              {activeTab === 'portfolio' && (
                <PortfolioTab
                  results={results}
                  startDate={startDate}
                  yMinDaily={yMinDaily}
                  yMaxDaily={yMaxDaily}
                  yMinCumul={yMinCumul}
                  yMaxCumul={yMaxCumul}
                />
              )}
              {activeTab === 'trend' && (
                <TrendTab
                  results={results}
                  yMinCumul={yMinCumul}
                  yMaxCumul={yMaxCumul}
                  startDate={startDate}
                />
              )}
              {activeTab === 'heatmap' && <HeatmapTab results={results} />}
              {activeTab === 'etf' && (
                <EtfTab
                  results={etfResults}
                  yMinCumul={yMinCumul}
                  yMaxCumul={yMaxCumul}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
