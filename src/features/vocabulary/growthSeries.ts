import type { DailySavedWordCount } from '@/db/repositories/savedWords';

export const VOCABULARY_GROWTH_DAYS = 30;

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fillGrowthSeries(
  counts: DailySavedWordCount[],
  nowMs: number = Date.now(),
  days: number = VOCABULARY_GROWTH_DAYS,
): DailySavedWordCount[] {
  const byDate = new Map(counts.map((entry) => [entry.date, entry.count]));
  const now = new Date(nowMs);
  const series: DailySavedWordCount[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = dateKey(date);
    series.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  return series;
}
