export function usdToSyp(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

export function sypToUsd(syp: number, rate: number): number {
  if (rate === 0) return 0;
  return parseFloat((syp / rate).toFixed(2));
}

export type TrendDirection = 'up' | 'down' | 'neutral';

export function getTrend(current: number, previous?: number): TrendDirection {
  if (previous === undefined || previous === null) return 'neutral';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}
