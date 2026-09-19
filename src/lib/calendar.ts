export function tradingDays(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export const MARKET_START = "2019-01-02";
export const MARKET_END = "2026-09-18";
export const TRADING_DAYS = tradingDays(MARKET_START, MARKET_END);
export const LAST_DATE = TRADING_DAYS[TRADING_DAYS.length - 1]!;
export const PREV_DATE = TRADING_DAYS[TRADING_DAYS.length - 2]!;
