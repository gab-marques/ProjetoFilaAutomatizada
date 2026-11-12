import { getTableCategory } from '@/lib/queue/position';
import { SampleData } from './features';

const BASELINE_TURNOVER_MIN: Record<string, number> = {
  '2': 35,
  '4': 50,
  '6': 65,
};

const DEFAULT_TABLES_COUNT: Record<string, number> = {
  '2': 6,
  '4': 8,
  '6': 2,
};

export function predictBaselineRule(
  sample: SampleData,
  tablesBySize: Record<string, number> = DEFAULT_TABLES_COUNT,
): number {
  const cat = getTableCategory(sample.party_size);
  const tables = tablesBySize[cat] || 4;
  const turnover = BASELINE_TURNOVER_MIN[cat] || 45;

  if (sample.queue_len_at_join <= 0) {
    return Math.max(3, 10 - sample.tables_free_at_join);
  }

  const cycles = Math.ceil(sample.queue_len_at_join / tables);
  return Math.max(5, Math.round(cycles * (turnover / 2)));
}
