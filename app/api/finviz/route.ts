import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';

const FINVIZ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Referer: 'https://finviz.com/',
};

async function fetchSnapshotMetric(ticker: string, label: string): Promise<string> {
  const url = `https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`;
  try {
    const res = await fetch(url, { headers: FINVIZ_HEADERS, next: { revalidate: 86400 } });
    if (!res.ok) return '-';
    const html = await res.text();
    const root = parse(html);

    // snapshot-table2 contains all metrics as label/value pairs
    const table = root.querySelector('.snapshot-table2');
    if (!table) return '-';

    const cells = table.querySelectorAll('td');
    for (let i = 0; i < cells.length - 1; i++) {
      if (cells[i].text.trim() === label) {
        return cells[i + 1].text.trim();
      }
    }
    return '-';
  } catch {
    return '-';
  }
}

async function fetchStatementValue(ticker: string, statType: string, itemName: string): Promise<string> {
  // ty mapping: IQ=income quarterly, BSQ=balance sheet quarterly, CFQ=cash flow quarterly
  const tyMap: Record<string, string> = { IQ: 'IQ', BSQ: 'BQ', CFQ: 'CQ', IA: 'IA', BSA: 'BA', CFA: 'CA' };
  const ty = tyMap[statType] || statType;
  const url = `https://finviz.com/api.ashx?t=${encodeURIComponent(ticker)}&ty=${ty}&ta=1&p=q`;

  try {
    const res = await fetch(url, { headers: FINVIZ_HEADERS, next: { revalidate: 86400 } });
    if (!res.ok) return '-';
    const json = await res.json();

    const data = json?.data;
    if (!Array.isArray(data)) return '-';

    const row = data.find((r: string[]) => r[0] === itemName);
    if (!row || row.length < 2) return '-';

    // Most recent quarter value
    const val = row[1];
    return val !== null && val !== undefined ? String(val) : '-';
  } catch {
    return '-';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  }

  try {
    // Fetch all metrics in parallel
    const [marketCap, debtEquity, currentRatio, roe, totalCashRaw, fcfRaw] = await Promise.all([
      fetchSnapshotMetric(ticker, 'Market Cap'),
      fetchSnapshotMetric(ticker, 'Debt/Eq'),
      fetchSnapshotMetric(ticker, 'Current Ratio'),
      fetchSnapshotMetric(ticker, 'ROE'),
      fetchStatementValue(ticker, 'BSQ', 'Cash & Short Term Investments'),
      fetchStatementValue(ticker, 'CFQ', 'Free Cash Flow'),
    ]);

    return NextResponse.json({
      marketCap,
      debtEquity,
      currentRatio,
      roe,
      totalCash: totalCashRaw,
      fcf: fcfRaw,
    });
  } catch (err) {
    return NextResponse.json(
      { marketCap: '-', debtEquity: '-', currentRatio: '-', roe: '-', totalCash: '-', fcf: '-', error: String(err) },
      { status: 200 }
    );
  }
}
