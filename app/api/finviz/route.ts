import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';

const FINVIZ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://finviz.com/',
};

async function fetchSnapshotMetric(ticker: string, label: string): Promise<string> {
  const url = `https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`;
  try {
    const res = await fetch(url, { headers: FINVIZ_HEADERS, next: { revalidate: 86400 } });
    if (!res.ok) return '-';
    const html = await res.text();
    const root = parse(html);

    const table = root.querySelector('.snapshot-table2');
    if (!table) return '-';

    const cells = table.querySelectorAll('td');
    // Original iterates every 2 cells: label at i, value at i+1
    for (let i = 0; i < cells.length - 1; i += 2) {
      const cellLabel = cells[i].text.trim();
      if (cellLabel.toLowerCase() === label.toLowerCase()) {
        const raw = cells[i + 1].text.trim();
        // Strip trailing % sign and asterisks (matching original: split("*")[0].replace("%","").replace(",",""))
        return raw.split('*')[0].replace('%', '').replace(',', '');
      }
    }
    return '-';
  } catch {
    return '-';
  }
}

// Correct URL: https://finviz.com/api/statement.ashx?t={ticker}&so=F&s={s}
// Response: { "data": { "Item Name": [latest, prev, ...] } }
async function fetchStatementValue(ticker: string, statCode: string, itemName: string): Promise<string> {
  // statCode mapping matches original: BSQ→BQ, CFQ→CQ, CFA→CA, etc.
  const statMap: Record<string, string> = {
    ISQ: 'IQ', BSQ: 'BQ', CFQ: 'CQ',
    ISA: 'IA', BSA: 'BA', CFA: 'CA',
  };
  const s = statMap[statCode] || statCode;
  const url = `https://finviz.com/api/statement.ashx?t=${encodeURIComponent(ticker)}&so=F&s=${s}`;

  try {
    const res = await fetch(url, {
      headers: {
        ...FINVIZ_HEADERS,
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return '-';
    const json = await res.json();

    const data = json?.data;
    if (!data || typeof data !== 'object') return '-';

    const values: unknown[] = data[itemName];
    if (!Array.isArray(values) || values.length === 0) return '-';

    const val = values[0]; // Most recent value
    if (val === '-' || val === null || val === undefined) return '-';
    return String(val);
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
    const [marketCapRaw, debtEquityRaw, currentRatioRaw, roeRaw, totalCashRaw, fcfRaw] =
      await Promise.all([
        fetchSnapshotMetric(ticker, 'Market Cap'),
        fetchSnapshotMetric(ticker, 'Debt/Eq'),
        fetchSnapshotMetric(ticker, 'Current Ratio'),
        fetchSnapshotMetric(ticker, 'ROE'),
        // Balance Sheet Quarterly — Cash & Short Term Investments
        fetchStatementValue(ticker, 'BSQ', 'Cash & Short Term Investments'),
        // Cash Flow Annual — Free Cash Flow (matches original: CFA)
        fetchStatementValue(ticker, 'CFA', 'Free Cash Flow'),
      ]);

    // Original multiplies Debt/Eq and Current Ratio by 100 to convert ratio → percentage
    const debtEquity = multiplyBy100(debtEquityRaw);
    const currentRatio = multiplyBy100(currentRatioRaw);

    return NextResponse.json({
      marketCap: marketCapRaw,
      debtEquity,
      currentRatio,
      roe: roeRaw,
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

function multiplyBy100(raw: string): string {
  if (raw === '-') return '-';
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return String(Math.round(n * 100 * 100) / 100); // round to 2 decimals
}
