import { getTableCategory } from '@/lib/queue/position';
import { SampleData } from './features';

export interface MAParams {
  level1: Record<string, number>; // dow_hour_cat -> avg
  level2: Record<string, number>; // dow_hour -> avg
  level3: Record<string, number>; // cat -> avg
  globalAvg: number;
}

export class BaselineMovingAverage {
  private params: MAParams;

  constructor(params?: MAParams) {
    this.params = params || {
      level1: {},
      level2: {},
      level3: {},
      globalAvg: 25,
    };
  }

  public fit(samples: SampleData[]): MAParams {
    const l1Sum: Record<string, { sum: number; count: number }> = {};
    const l2Sum: Record<string, { sum: number; count: number }> = {};
    const l3Sum: Record<string, { sum: number; count: number }> = {};
    let totalSum = 0;
    let totalCount = 0;

    for (const s of samples) {
      if (s.actual_wait_min === undefined) continue;
      const wait = s.actual_wait_min;
      const cat = getTableCategory(s.party_size);
      const k1 = `${s.dow}_${s.hour}_${cat}`;
      const k2 = `${s.dow}_${s.hour}`;
      const k3 = cat;

      l1Sum[k1] = l1Sum[k1] || { sum: 0, count: 0 };
      l1Sum[k1].sum += wait;
      l1Sum[k1].count += 1;

      l2Sum[k2] = l2Sum[k2] || { sum: 0, count: 0 };
      l2Sum[k2].sum += wait;
      l2Sum[k2].count += 1;

      l3Sum[k3] = l3Sum[k3] || { sum: 0, count: 0 };
      l3Sum[k3].sum += wait;
      l3Sum[k3].count += 1;

      totalSum += wait;
      totalCount += 1;
    }

    const level1: Record<string, number> = {};
    for (const [k, v] of Object.entries(l1Sum)) {
      if (v.count >= 2) level1[k] = Math.round(v.sum / v.count);
    }

    const level2: Record<string, number> = {};
    for (const [k, v] of Object.entries(l2Sum)) {
      if (v.count >= 2) level2[k] = Math.round(v.sum / v.count);
    }

    const level3: Record<string, number> = {};
    for (const [k, v] of Object.entries(l3Sum)) {
      if (v.count >= 2) level3[k] = Math.round(v.sum / v.count);
    }

    this.params = {
      level1,
      level2,
      level3,
      globalAvg: totalCount > 0 ? Math.round(totalSum / totalCount) : 25,
    };

    return this.params;
  }

  public predict(sample: SampleData): number {
    const cat = getTableCategory(sample.party_size);
    const k1 = `${sample.dow}_${sample.hour}_${cat}`;
    if (this.params.level1[k1] !== undefined) return this.params.level1[k1];

    const k2 = `${sample.dow}_${sample.hour}`;
    if (this.params.level2[k2] !== undefined) return this.params.level2[k2];

    if (this.params.level3[cat] !== undefined) return this.params.level3[cat];

    return this.params.globalAvg;
  }

  public getParams(): MAParams {
    return this.params;
  }
}
