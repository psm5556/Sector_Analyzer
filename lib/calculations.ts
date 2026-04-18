import { OHLCData, DailyReturn, StockAnalysis, PortfolioItem } from './types';

export function calcDailyReturns(ohlc: OHLCData[]): DailyReturn[] {
  const result: DailyReturn[] = [];
  for (let i = 1; i < ohlc.length; i++) {
    const prev = ohlc[i - 1].close;
    const cur = ohlc[i].close;
    if (prev && prev !== 0) {
      result.push({ date: ohlc[i].time, value: ((cur - prev) / prev) * 100 });
    }
  }
  return result;
}

export function calcCumulReturns(ohlc: OHLCData[], basePrice: number): DailyReturn[] {
  return ohlc.map((d) => ({
    date: d.time,
    value: basePrice !== 0 ? ((d.close - basePrice) / basePrice) * 100 : 0,
  }));
}

export function calcMovingAverage(ohlc: OHLCData[], period: number) {
  return ohlc
    .map((d, i) => {
      if (i < period - 1) return null;
      const slice = ohlc.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, x) => sum + x.close, 0) / period;
      return { time: d.time, value: avg };
    })
    .filter((d) => d !== null) as { time: string; value: number }[];
}

export function parseMarketCapValue(cap: string): number {
  if (!cap || cap === '-') return Infinity;
  const num = parseFloat(cap);
  if (cap.includes('T')) return num * 1_000_000_000_000;
  if (cap.includes('B')) return num * 1_000_000_000;
  if (cap.includes('M')) return num * 1_000_000;
  return num;
}

export function formatNumber(n: number | null, decimals = 2): string {
  if (n === null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

export function calcRunway(totalCash: string, fcf: string): string {
  const cash = parseFloat(totalCash);
  const flow = parseFloat(fcf);
  if (isNaN(cash) || isNaN(flow) || flow >= 0) return '-';
  const years = cash / Math.abs(flow);
  return years.toFixed(1);
}

export function groupBySector(results: StockAnalysis[]): Record<string, StockAnalysis[]> {
  return results.reduce<Record<string, StockAnalysis[]>>((acc, item) => {
    if (!acc[item.sector]) acc[item.sector] = [];
    acc[item.sector].push(item);
    return acc;
  }, {});
}

export function groupByTeam(results: StockAnalysis[]): Record<string, StockAnalysis[]> {
  return results.reduce<Record<string, StockAnalysis[]>>((acc, item) => {
    if (!acc[item.team]) acc[item.team] = [];
    acc[item.team].push(item);
    return acc;
  }, {});
}

export function calcTeamAverageCumul(
  results: StockAnalysis[],
  team: string
): DailyReturn[] {
  const teamStocks = results.filter((r) => r.team === team && r.cumulReturns.length > 0);
  if (teamStocks.length === 0) return [];

  // Collect all dates
  const dateSet = new Set<string>();
  teamStocks.forEach((s) => s.cumulReturns.forEach((r) => dateSet.add(r.date)));
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const vals = teamStocks
      .map((s) => s.cumulReturns.find((r) => r.date === date)?.value)
      .filter((v): v is number => v !== undefined);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { date, value: avg };
  });
}

export function calcSectorAverageCumul(
  results: StockAnalysis[],
  sector: string
): DailyReturn[] {
  const sectorStocks = results.filter((r) => r.sector === sector && r.cumulReturns.length > 0);
  if (sectorStocks.length === 0) return [];

  const dateSet = new Set<string>();
  sectorStocks.forEach((s) => s.cumulReturns.forEach((r) => dateSet.add(r.date)));
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const vals = sectorStocks
      .map((s) => s.cumulReturns.find((r) => r.date === date)?.value)
      .filter((v): v is number => v !== undefined);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { date, value: avg };
  });
}

export function calcMarketAverage(results: StockAnalysis[]): DailyReturn[] {
  const validStocks = results.filter((r) => r.cumulReturns.length > 0);
  if (validStocks.length === 0) return [];

  const dateSet = new Set<string>();
  validStocks.forEach((s) => s.cumulReturns.forEach((r) => dateSet.add(r.date)));
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const vals = validStocks
      .map((s) => s.cumulReturns.find((r) => r.date === date)?.value)
      .filter((v): v is number => v !== undefined);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { date, value: avg };
  });
}

export function buildAnalysis(
  item: PortfolioItem,
  ohlc: OHLCData[],
  finviz: {
    marketCap: string;
    debtEquity: string;
    currentRatio: string;
    roe: string;
    totalCash: string;
    fcf: string;
  }
): StockAnalysis {
  const basePrice = ohlc.length > 0 ? ohlc[0].close : null;
  const currentPrice = ohlc.length > 0 ? ohlc[ohlc.length - 1].close : null;
  const highPrice = ohlc.length > 0 ? Math.max(...ohlc.map((d) => d.close)) : null;

  const cumulReturnBase =
    basePrice && currentPrice && basePrice !== 0
      ? ((currentPrice - basePrice) / basePrice) * 100
      : null;
  const cumulReturnHigh =
    highPrice && currentPrice && highPrice !== 0
      ? ((currentPrice - highPrice) / highPrice) * 100
      : null;

  let dailyProfit: number | null = null;
  let dailyReturnPct: number | null = null;
  if (ohlc.length >= 2) {
    const prev = ohlc[ohlc.length - 2].close;
    const cur = ohlc[ohlc.length - 1].close;
    dailyProfit = cur - prev;
    dailyReturnPct = prev !== 0 ? ((cur - prev) / prev) * 100 : null;
  }

  const dailyReturns = calcDailyReturns(ohlc);
  const cumulReturns = basePrice ? calcCumulReturns(ohlc, basePrice) : [];
  const runway = calcRunway(finviz.totalCash, finviz.fcf);

  return {
    ticker: item.ticker,
    company: item.company,
    team: item.team,
    assetType: item.assetType,
    sector: item.sector,
    marketCap: finviz.marketCap,
    basePrice,
    highPrice,
    currentPrice,
    cumulReturnBase,
    cumulReturnHigh,
    dailyProfit,
    dailyReturnPct,
    debtEquity: finviz.debtEquity,
    currentRatio: finviz.currentRatio,
    roe: finviz.roe,
    runway,
    totalCash: finviz.totalCash,
    fcf: finviz.fcf,
    dailyReturns,
    cumulReturns,
    prices: ohlc,
  };
}
