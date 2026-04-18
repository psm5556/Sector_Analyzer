export interface PortfolioItem {
  team: string;
  assetType: string;
  sector: string;
  company: string;
  ticker: string;
}

export interface OHLCData {
  time: string; // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PricePoint {
  time: string;
  value: number;
}

export interface VolumeBar {
  time: string;
  value: number;
  color: string;
}

export interface StockPriceData {
  ticker: string;
  ohlc: OHLCData[];
  volume: VolumeBar[];
}

export interface StockWithMA {
  ticker: string;
  ohlc: OHLCData[];
  ma200: PricePoint[];
  ma240: PricePoint[];
  ma365: PricePoint[];
}

export interface DailyReturn {
  date: string;
  value: number;
}

export interface StockAnalysis {
  ticker: string;
  company: string;
  team: string;
  assetType: string;
  sector: string;
  marketCap: string;
  basePrice: number | null;
  highPrice: number | null;
  currentPrice: number | null;
  cumulReturnBase: number | null;
  cumulReturnHigh: number | null;
  dailyProfit: number | null;
  dailyReturnPct: number | null;
  debtEquity: string;
  currentRatio: string;
  roe: string;
  runway: string;
  totalCash: string;
  fcf: string;
  dailyReturns: DailyReturn[];
  cumulReturns: DailyReturn[];
  prices: OHLCData[];
}

export type AnalysisStatus = 'idle' | 'loading' | 'done' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  progress: number;
  results: StockAnalysis[];
  error?: string;
}

export type HeatmapType = 'cumul' | 'daily';
export type ChartInterval = '1d' | '1wk';
