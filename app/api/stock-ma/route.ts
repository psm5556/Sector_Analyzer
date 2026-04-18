import { NextRequest, NextResponse } from 'next/server';
import { OHLCData } from '@/lib/types';
import { calcMovingAverage } from '@/lib/calculations';
import { toYahooTicker } from '@/lib/ticker';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const interval = (searchParams.get('interval') || '1d') as '1d' | '1wk';

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  }

  // Fetch enough history to compute all MAs (MA365 needs 365+ bars)
  const yearsBack = interval === '1wk' ? 10 : 3;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - yearsBack);

  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);

  const yahooTicker = toYahooTicker(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${interval}&period1=${period1}&period2=${period2}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ ohlc: [], ma20: [], ma60: [], ma125: [], ma200: [], ma240: [], ma365: [] });
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ ohlc: [], ma20: [], ma60: [], ma125: [], ma200: [], ma240: [], ma365: [] });
    }

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens: number[] = quote.open || [];
    const highs: number[] = quote.high || [];
    const lows: number[] = quote.low || [];
    const closes: number[] = quote.close || [];

    const allOhlc: OHLCData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      allOhlc.push({
        time: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: opens[i] ?? closes[i],
        high: highs[i] ?? closes[i],
        low: lows[i] ?? closes[i],
        close: closes[i],
      });
    }

    // Compute all MAs on full history
    const ma20  = calcMovingAverage(allOhlc, 20);
    const ma60  = calcMovingAverage(allOhlc, 60);
    const ma125 = calcMovingAverage(allOhlc, 125);
    const ma200 = calcMovingAverage(allOhlc, 200);
    const ma240 = calcMovingAverage(allOhlc, 240);
    const ma365 = calcMovingAverage(allOhlc, 365);

    // Return only last 1.5 years (18 months) for display
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 18);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filter = <T extends { time: string }>(arr: T[]) => arr.filter((d) => d.time >= cutoffStr);

    return NextResponse.json({
      ohlc:  filter(allOhlc),
      ma20:  filter(ma20),
      ma60:  filter(ma60),
      ma125: filter(ma125),
      ma200: filter(ma200),
      ma240: filter(ma240),
      ma365: filter(ma365),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), ohlc: [], ma20: [], ma60: [], ma125: [], ma200: [], ma240: [], ma365: [] },
      { status: 500 }
    );
  }
}
