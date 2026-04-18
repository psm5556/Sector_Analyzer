import { NextRequest, NextResponse } from 'next/server';
import { OHLCData, VolumeBar } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const start = searchParams.get('start'); // ISO date string
  const end = searchParams.get('end');

  if (!ticker || !start || !end) {
    return NextResponse.json({ error: 'ticker, start, end required' }, { status: 400 });
  }

  const period1 = Math.floor(new Date(start).getTime() / 1000);
  const period2 = Math.floor(new Date(end).getTime() / 1000) + 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${period1}&period2=${period2}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ ohlc: [], volume: [] });
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return NextResponse.json({ ohlc: [], volume: [] });

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens: number[] = quote.open || [];
    const highs: number[] = quote.high || [];
    const lows: number[] = quote.low || [];
    const closes: number[] = quote.close || [];
    const volumes: number[] = quote.volume || [];

    const ohlc: OHLCData[] = [];
    const volume: VolumeBar[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      ohlc.push({
        time: dateStr,
        open: opens[i] ?? closes[i],
        high: highs[i] ?? closes[i],
        low: lows[i] ?? closes[i],
        close: closes[i],
      });
      const isUp = (opens[i] ?? closes[i]) <= closes[i];
      volume.push({
        time: dateStr,
        value: volumes[i] || 0,
        color: isUp ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
      });
    }

    return NextResponse.json({ ohlc, volume });
  } catch (err) {
    return NextResponse.json({ error: String(err), ohlc: [], volume: [] }, { status: 500 });
  }
}
