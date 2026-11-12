import { extractFeatures, SampleData } from './features';

export interface LinregParams {
  weights: number[];
  lambda: number;
}

/**
 * Inverts an N x N matrix using Gauss-Jordan elimination with partial pivoting.
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  // Augment with identity matrix
  const A: number[][] = matrix.map((row, i) => {
    const aug = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) aug[j] = row[j];
    aug[n + i] = 1;
    return aug;
  });

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    // Check for near-zero pivot
    if (Math.abs(A[i][i]) < 1e-12) {
      A[i][i] = 1e-12;
    }

    // Normalize pivot row
    const pivot = A[i][i];
    for (let j = 0; j < 2 * n; j++) {
      A[i][j] /= pivot;
    }

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }
  }

  // Extract right half
  return A.map((row) => row.slice(n));
}

/**
 * Multiplies an M x K matrix by a K x N matrix.
 */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const kLen = B.length;
  const n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));

  for (let i = 0; i < m; i++) {
    for (let k = 0; k < kLen; k++) {
      const aik = A[i][k];
      for (let j = 0; j < n; j++) {
        C[i][j] += aik * B[k][j];
      }
    }
  }
  return C;
}

export class RidgeRegression {
  private weights: number[];
  private lambda: number;

  constructor(params?: LinregParams) {
    this.weights = params?.weights || [];
    this.lambda = params?.lambda ?? 0.5;
  }

  /**
   * Fits weights using Ridge Normal Equations: w = (X^T * X + lambda * I)^(-1) * X^T * y
   */
  public fit(samples: SampleData[], lambda = 0.5): LinregParams {
    this.lambda = lambda;
    if (samples.length === 0) {
      this.weights = [20];
      return { weights: this.weights, lambda: this.lambda };
    }

    const X = samples.map((s) => extractFeatures(s));
    const y = samples.map((s) => s.actual_wait_min ?? 20);

    const n = X.length;
    const p = X[0].length;

    // Transpose X -> X_T (p x n)
    const X_T: number[][] = Array.from({ length: p }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        X_T[j][i] = X[i][j];
      }
    }

    // X_T * X (p x p)
    const XtX = matMul(X_T, X);

    // Add Ridge Regularization (lambda * I), don't regularize intercept (index 0)
    for (let j = 1; j < p; j++) {
      XtX[j][j] += this.lambda;
    }

    // Invert (XtX + lambda*I)
    const invXtX = invertMatrix(XtX);

    // X_T * y (p x 1)
    const Xty: number[][] = Array.from({ length: p }, () => [0]);
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += X_T[j][i] * y[i];
      }
      Xty[j][0] = sum;
    }

    // w = invXtX * Xty (p x 1)
    const w = matMul(invXtX, Xty);
    this.weights = w.map((row) => row[0]);

    return {
      weights: this.weights,
      lambda: this.lambda,
    };
  }

  public predict(sample: SampleData): number {
    if (this.weights.length === 0) return 20;

    const x = extractFeatures(sample);
    let pred = 0;
    for (let i = 0; i < this.weights.length && i < x.length; i++) {
      pred += this.weights[i] * x[i];
    }

    // Wait time cannot be negative; minimum 2 minutes
    return Math.max(2, Math.round(pred));
  }

  public getParams(): LinregParams {
    return {
      weights: this.weights,
      lambda: this.lambda,
    };
  }
}
