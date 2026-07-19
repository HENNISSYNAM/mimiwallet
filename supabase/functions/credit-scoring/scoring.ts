// Pure feature-normalization and scoring math for the credit scoring model.
// No Deno/DB imports here on purpose — this file is also exercised directly
// by Vitest (scoring.test.ts) without any edge-runtime dependencies.

export interface MonthlyBucket {
  month: string; // "YYYY-MM"
  income: number;
  expense: number; // positive magnitude
}

export interface CreditFeatures {
  revenueTrend: number; // raw: relative monthly slope, e.g. 0.05 = +5%/month
  expenseToIncomeRatio: number; // raw ratio, e.g. 0.6
  invoicePunctuality: number; // raw fraction 0..1
  loanRepaymentRatio: number; // raw fraction 0..1
  cashFlowVolatility: number; // raw coefficient of variation
}

export interface FactorResult {
  factor_name: keyof CreditFeatures;
  raw_value: number;
  normalized_score: number; // 0..100
  weight: number;
}

export interface ScoringResult {
  factors: FactorResult[];
  compositeScore: number; // 0..100
  score: number; // 300..850
  probabilityOfDefault: number; // 0..1
}

export const CREDIT_MODEL_V1 = {
  version: "v1",
  weights: {
    revenueTrend: 0.25,
    expenseToIncomeRatio: 0.2,
    invoicePunctuality: 0.25,
    loanRepaymentRatio: 0.2,
    cashFlowVolatility: 0.1,
  },
  // Expert-elicited logistic-regression coefficients (v1 cold-start default —
  // no labeled default history exists yet on this platform to fit from).
  // Higher normalized feature score (0..1) => lower log-odds of default.
  logistic: {
    intercept: 4,
    revenueTrend: -1.5,
    expenseToIncomeRatio: -1.2,
    invoicePunctuality: -1.8,
    loanRepaymentRatio: -1.0,
    cashFlowVolatility: -0.8,
  },
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Min-max normalize a raw value into 0..100 against documented domain bounds. */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Least-squares slope of y over evenly-spaced x = 0..n-1. */
export function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function coefficientOfVariation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.abs(Math.sqrt(variance) / mean);
}

/** Domain bounds each raw feature is min-max normalized against. */
const BOUNDS = {
  revenueTrend: { min: -0.2, max: 0.2 }, // -20%..+20% relative monthly growth
  expenseToIncomeRatio: { min: 1.2, max: 0.3 }, // inverted: lower ratio = better
  invoicePunctuality: { min: 0, max: 1 },
  loanRepaymentRatio: { min: 0, max: 1 },
  cashFlowVolatility: { min: 1.5, max: 0 }, // inverted: lower volatility = better
};

export function computeCreditModel(features: CreditFeatures): ScoringResult {
  const factors: FactorResult[] = (Object.keys(features) as (keyof CreditFeatures)[]).map(
    (name) => {
      const bounds = BOUNDS[name];
      return {
        factor_name: name,
        raw_value: features[name],
        normalized_score: normalize(features[name], bounds.min, bounds.max),
        weight: CREDIT_MODEL_V1.weights[name],
      };
    }
  );

  const compositeScore = factors.reduce(
    (sum, f) => sum + f.normalized_score * f.weight,
    0
  );

  const score = Math.round(clamp(300 + (compositeScore / 100) * 550, 300, 850));

  const { logistic } = CREDIT_MODEL_V1;
  const linear =
    logistic.intercept +
    factors.reduce((sum, f) => {
      const x = f.normalized_score / 100; // 0..1
      return sum + logistic[f.factor_name] * x;
    }, 0);
  const probabilityOfDefault = sigmoid(linear);

  return { factors, compositeScore, score, probabilityOfDefault };
}

export function creditLimitMultiplier(score: number): number {
  if (score >= 750) return 3;
  if (score >= 650) return 2;
  if (score >= 550) return 1;
  return 0.5;
}
