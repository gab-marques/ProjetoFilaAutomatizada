import { describe, it, expect } from 'vitest';
import { RidgeRegression } from '@/lib/predict/linreg';
import { BaselineMovingAverage } from '@/lib/predict/baselineMA';
import { predictBaselineRule } from '@/lib/predict/baselineRule';
import { calculateMAE, calculateRMSE } from '@/lib/predict/evaluate';
import { POST } from '@/app/api/retrain/route';
import { NextRequest } from 'next/server';

describe('Prediction Models & Ridge Regression (lib/predict/)', () => {
  it('should accurately calculate MAE and RMSE with known arrays', () => {
    const actuals = [10, 20, 30, 40];
    const preds = [12, 18, 31, 38]; // diffs: 2, 2, 1, 2 -> mean = 7/4 = 1.75

    expect(calculateMAE(actuals, preds)).toBe(1.75);
    // sq diffs: 4, 4, 1, 4 -> mean = 13/4 = 3.25 -> sqrt = 1.802...
    expect(calculateRMSE(actuals, preds)).toBe(1.8);
  });

  it('should fit ridge regression and make sensible wait predictions', () => {
    // Generate synthetic linear pattern where wait = 5 * queue_len + 15
    const samples = [];
    for (let q = 0; q <= 10; q++) {
      samples.push({
        party_size: 2,
        dow: 1,
        hour: 12,
        queue_len_at_join: q,
        tables_free_at_join: Math.max(0, 5 - q),
        actual_wait_min: 5 * q + 15,
      });
    }

    const model = new RidgeRegression();
    model.fit(samples, 0.01);

    // Predict for queue_len = 4 -> expected around 5*4 + 15 = 35 min
    const pred4 = model.predict({
      party_size: 2,
      dow: 1,
      hour: 12,
      queue_len_at_join: 4,
      tables_free_at_join: 1,
    });

    expect(Math.abs(pred4 - 35)).toBeLessThanOrEqual(2);
  });

  it('Baseline Moving Average should correctly use hierarchical fallback', () => {
    const ma = new BaselineMovingAverage();
    ma.fit([
      { party_size: 2, dow: 5, hour: 20, queue_len_at_join: 5, tables_free_at_join: 0, actual_wait_min: 40 },
      { party_size: 2, dow: 5, hour: 20, queue_len_at_join: 6, tables_free_at_join: 0, actual_wait_min: 50 },
      { party_size: 4, dow: 2, hour: 13, queue_len_at_join: 2, tables_free_at_join: 2, actual_wait_min: 15 },
      { party_size: 4, dow: 2, hour: 13, queue_len_at_join: 2, tables_free_at_join: 2, actual_wait_min: 25 },
    ]);

    // Exact match (Friday 20h, party size 2) -> avg(40, 50) = 45
    expect(
      ma.predict({ party_size: 2, dow: 5, hour: 20, queue_len_at_join: 0, tables_free_at_join: 0 }),
    ).toBe(45);

    // Partial match (Tuesday 13h) -> avg(15, 25) = 20
    expect(
      ma.predict({ party_size: 4, dow: 2, hour: 13, queue_len_at_join: 0, tables_free_at_join: 0 }),
    ).toBe(20);

    // Unseen combination -> should fallback to category or global average
    const unseen = ma.predict({ party_size: 6, dow: 0, hour: 3, queue_len_at_join: 0, tables_free_at_join: 0 });
    expect(unseen).toBeGreaterThanOrEqual(15);
  });

  it('Baseline Rule should compute wait based on table turnaround and queue length', () => {
    const wait = predictBaselineRule(
      {
        party_size: 4,
        dow: 5,
        hour: 20,
        queue_len_at_join: 8,
        tables_free_at_join: 0,
      },
      { '4': 8 }, // 8 tables for 4
    );

    // 8 groups ahead / 8 tables = 1 cycle * (50/2) = 25 min
    expect(wait).toBe(25);
  });

  it('POST /api/retrain should reject unauthorized requests without secret', async () => {
    const req = new NextRequest('http://localhost:3000/api/retrain', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/retrain should train and return MAE with valid secret', async () => {
    const req = new NextRequest('http://localhost:3000/api/retrain', {
      method: 'POST',
      headers: { 'x-tick-secret': 'mock-tick-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('linreg');
    expect(json.mae_holdout).toBeGreaterThan(0);
    expect(json.n_samples).toBeGreaterThan(0);
  });
});
