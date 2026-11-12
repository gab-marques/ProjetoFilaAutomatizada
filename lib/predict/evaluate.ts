import { SampleData } from './features';

export interface EvalMetrics {
  mae: number;
  rmse: number;
  sampleCount: number;
  maeByPartyCategory?: Record<string, number>;
}

export function calculateMAE(actuals: number[], predictions: number[]): number {
  if (actuals.length === 0) return 0;
  const sumDiff = actuals.reduce((acc, y, i) => acc + Math.abs(y - predictions[i]), 0);
  return Number((sumDiff / actuals.length).toFixed(2));
}

export function calculateRMSE(actuals: number[], predictions: number[]): number {
  if (actuals.length === 0) return 0;
  const sumSq = actuals.reduce((acc, y, i) => acc + Math.pow(y - predictions[i], 2), 0);
  return Number(Math.sqrt(sumSq / actuals.length).toFixed(2));
}

export function evaluateModel(
  testSamples: SampleData[],
  predictFn: (sample: SampleData) => number,
): EvalMetrics {
  const actuals: number[] = [];
  const preds: number[] = [];

  for (const s of testSamples) {
    if (s.actual_wait_min !== undefined) {
      actuals.push(s.actual_wait_min);
      preds.push(predictFn(s));
    }
  }

  return {
    mae: calculateMAE(actuals, preds),
    rmse: calculateRMSE(actuals, preds),
    sampleCount: actuals.length,
  };
}
