import { getTableCategory } from '@/lib/queue/position';

export interface SampleData {
  party_size: number;
  dow: number; // 0 to 6
  hour: number; // 0 to 23
  queue_len_at_join: number;
  tables_free_at_join: number;
  actual_wait_min?: number;
}

/**
 * Extracts a normalized numeric feature vector for linear / ridge regression.
 * Vector layout:
 * [0] Intercept: 1
 * [1] Queue length: queue_len / 10
 * [2..4] Party size category one-hot: (cat 2, cat 4, cat 6+)
 * [5..11] Day of week one-hot (dow 0 to 6)
 * [12] Sin(2*pi*hour/24)
 * [13] Cos(2*pi*hour/24)
 * [14] Tables free: tables_free / 10
 */
export function extractFeatures(sample: SampleData): number[] {
  const cat = getTableCategory(sample.party_size);
  const catOneHot = [cat === '2' ? 1 : 0, cat === '4' ? 1 : 0, cat === '6' ? 1 : 0];

  const dowOneHot = [0, 0, 0, 0, 0, 0, 0];
  const dowIndex = Math.max(0, Math.min(6, Math.floor(sample.dow)));
  dowOneHot[dowIndex] = 1;

  const hourRad = (2 * Math.PI * sample.hour) / 24;
  const sinHour = Math.sin(hourRad);
  const cosHour = Math.cos(hourRad);

  return [
    1, // Intercept
    sample.queue_len_at_join / 10,
    ...catOneHot,
    ...dowOneHot,
    sinHour,
    cosHour,
    sample.tables_free_at_join / 10,
  ];
}
