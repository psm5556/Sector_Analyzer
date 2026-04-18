# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Type-check and build for production
npm run lint       # Run ESLint
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
GOOGLE_SHEET_ID=<spreadsheet_id>
GOOGLE_SHEET_NAME=<sheet_name>
```

These are also set in Vercel's Environment Variables dashboard.

## Architecture

**This is a Next.js 14 (App Router) investment portfolio dashboard** deployed on Vercel. It replaces an older Streamlit app (`app.py` kept for reference).

### Data Flow

1. On mount, `Dashboard.tsx` fetches `/api/portfolio` → loads stock list from Google Sheets CSV export.
2. User sets date range and clicks "분석 시작" → `handleAnalyze` fires `analyzeOne()` for each stock with concurrency=8.
3. Each `analyzeOne()` calls two API routes in parallel: `/api/stock-price` (Yahoo Finance OHLC) and `/api/finviz` (scraped metrics).
4. Results are passed as `StockAnalysis[]` down to the three tab components.

### Key Design Decisions

- **All state lives in `Dashboard.tsx`** — tabs receive `results: StockAnalysis[]` as props and are purely presentational.
- **Charts are client-only** — all chart components use `'use client'` and are loaded with `dynamic(..., { ssr: false })` to avoid SSR issues with TradingView Lightweight Charts.
- **`/api/stock-ma`** is called separately (on demand) when a stock row is selected in PortfolioTab, since fetching 3 years of MA data for all 250+ stocks upfront would be too slow.
- **`lineWidth` in Lightweight Charts v4** must be typed as `1 | 2 | 3 | 4`, not `number`. Use `as const` or explicit casts at call sites.
- **Finviz scraping** uses `node-html-parser` on the server. The snapshot metrics come from `.snapshot-table2` table cells (label/value pairs). Financial statement values use `finviz.com/api.ashx`.

### Module Map

| Path | Responsibility |
|---|---|
| `lib/types.ts` | All TypeScript interfaces (`StockAnalysis`, `OHLCData`, etc.) |
| `lib/calculations.ts` | Pure functions: MA calc, daily/cumul returns, `buildAnalysis()` |
| `app/api/portfolio/route.ts` | Fetch Google Sheets CSV, parse into `PortfolioItem[]` |
| `app/api/stock-price/route.ts` | Yahoo Finance chart API → OHLC + volume |
| `app/api/stock-ma/route.ts` | Yahoo Finance 3yr data → OHLC + MA200/240/365 |
| `app/api/finviz/route.ts` | Scrape Finviz snapshot + `api.ashx` financial statements |
| `components/Dashboard.tsx` | Root client component: all state, analyze orchestration |
| `components/charts/CandlestickChart.tsx` | TradingView candlestick + MA line series + start-date marker |
| `components/charts/HistogramChart.tsx` | TradingView histogram series for daily/cumul % bars |
| `components/charts/TrendLineChart.tsx` | TradingView multi-line series for trend comparison |
| `components/charts/HeatmapGrid.tsx` | Custom HTML table heatmap (color-coded cells) |
| `components/tabs/PortfolioTab.tsx` | Table + per-stock chart panel (fetches MA data on selection) |
| `components/tabs/TrendTab.tsx` | Team/sector trend charts + sector deep-dive accordion |
| `components/tabs/HeatmapTab.tsx` | Heatmap controls + `HeatmapGrid` |
| `components/ui/DataTable.tsx` | Sortable/filterable portfolio table |
| `components/ui/Sidebar.tsx` | Date range + Y-axis controls + analyze button + progress bar |
