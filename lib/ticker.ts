/**
 * Detects Korean stock tickers (6-char codes starting with a digit)
 * and appends ".KS" for Yahoo Finance lookups.
 * Examples: 447770 → 447770.KS, 0131V0 → 0131V0.KS
 * US tickers (AAPL, MSFT, etc.) are returned unchanged.
 */
export function toYahooTicker(ticker: string): string {
  if (!ticker) return ticker;
  // Already has a market suffix (.KS, .KQ, .T, etc.)
  if (ticker.includes('.')) return ticker;
  // Korean stock codes: exactly 6 chars, first char is a digit
  if (/^\d[A-Z0-9]{5}$/i.test(ticker)) return `${ticker}.KS`;
  return ticker;
}

export function isKoreanTicker(ticker: string): boolean {
  const base = ticker.split('.')[0];
  return /^\d[A-Z0-9]{5}$/i.test(base);
}
