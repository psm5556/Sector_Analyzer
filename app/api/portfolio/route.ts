import { NextResponse } from 'next/server';
import { PortfolioItem } from '@/lib/types';

export const revalidate = 3600;

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;

  if (!sheetId || !sheetName) {
    return NextResponse.json({ error: 'Google Sheets credentials not configured' }, { status: 500 });
  }

  const encodedName = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: ${res.status}` }, { status: 500 });
    }

    const csv = await res.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Empty sheet' }, { status: 500 });
    }

    // Skip header row, parse each row
    const items: PortfolioItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length >= 5) {
        const ticker = cols[4]?.trim().replace(/^"|"$/g, '');
        if (ticker && ticker !== '') {
          items.push({
            team: cols[0]?.trim().replace(/^"|"$/g, '') || '',
            assetType: cols[1]?.trim().replace(/^"|"$/g, '') || '',
            sector: cols[2]?.trim().replace(/^"|"$/g, '') || '',
            company: cols[3]?.trim().replace(/^"|"$/g, '') || '',
            ticker,
          });
        }
      }
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
