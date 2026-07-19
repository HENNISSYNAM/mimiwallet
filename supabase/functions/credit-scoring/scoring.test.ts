import { describe, it, expect } from "vitest";
import {
  clamp,
  normalize,
  sigmoid,
  linearRegressionSlope,
  coefficientOfVariation,
  computeCreditModel,
  creditLimitMultiplier,
  type CreditFeatures,
} from "./scoring";

describe("clamp", () => {
  it("keeps values within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("normalize", () => {
  it("maps standard (min < max) ranges linearly", () => {
    expect(normalize(0, 0, 1)).toBe(0);
    expect(normalize(1, 0, 1)).toBe(100);
    expect(normalize(0.5, 0, 1)).toBe(50);
  });

  it("clamps outside the domain", () => {
    expect(normalize(-1, 0, 1)).toBe(0);
    expect(normalize(2, 0, 1)).toBe(100);
  });

  it("handles inverted bounds (lower raw value = higher score)", () => {
    expect(normalize(0.3, 1.2, 0.3)).toBe(100);
    expect(normalize(1.2, 1.2, 0.3)).toBe(0);
    expect(normalize(0.75, 1.2, 0.3)).toBe(50);
  });

  it("returns 50 when min equals max to avoid divide-by-zero", () => {
    expect(normalize(5, 3, 3)).toBe(50);
  });
});

describe("sigmoid", () => {
  it("is 0.5 at x=0 and bounded in (0,1)", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
    expect(sigmoid(-10)).toBeLessThan(0.01);
  });
});

describe("linearRegressionSlope", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(linearRegressionSlope([])).toBe(0);
    expect(linearRegressionSlope([5])).toBe(0);
  });

  it("detects a perfectly increasing trend", () => {
    expect(linearRegressionSlope([1, 2, 3, 4, 5])).toBeCloseTo(1);
  });

  it("detects a perfectly decreasing trend", () => {
    expect(linearRegressionSlope([5, 4, 3, 2, 1])).toBeCloseTo(-1);
  });

  it("is ~0 for a flat series", () => {
    expect(linearRegressionSlope([3, 3, 3, 3])).toBeCloseTo(0);
  });
});

describe("coefficientOfVariation", () => {
  it("is 0 for identical values", () => {
    expect(coefficientOfVariation([10, 10, 10])).toBe(0);
  });

  it("is 0 for fewer than 2 points", () => {
    expect(coefficientOfVariation([10])).toBe(0);
  });

  it("is positive for varying values", () => {
    expect(coefficientOfVariation([5, 15, 10])).toBeGreaterThan(0);
  });
});

describe("computeCreditModel", () => {
  const bestCase: CreditFeatures = {
    revenueTrend: 0.2,
    expenseToIncomeRatio: 0.3,
    invoicePunctuality: 1,
    loanRepaymentRatio: 1,
    cashFlowVolatility: 0,
  };

  const worstCase: CreditFeatures = {
    revenueTrend: -0.2,
    expenseToIncomeRatio: 1.2,
    invoicePunctuality: 0,
    loanRepaymentRatio: 0,
    cashFlowVolatility: 1.5,
  };

  it("scores the best-case features near the top of the range", () => {
    const result = computeCreditModel(bestCase);
    expect(result.compositeScore).toBeCloseTo(100);
    expect(result.score).toBe(850);
    expect(result.probabilityOfDefault).toBeLessThan(0.1);
  });

  it("scores the worst-case features near the bottom of the range", () => {
    const result = computeCreditModel(worstCase);
    expect(result.compositeScore).toBeCloseTo(0);
    expect(result.score).toBe(300);
    expect(result.probabilityOfDefault).toBeGreaterThan(0.9);
  });

  it("keeps score within the 300-850 band and produces 5 weighted factors", () => {
    const mid: CreditFeatures = {
      revenueTrend: 0,
      expenseToIncomeRatio: 0.75,
      invoicePunctuality: 0.5,
      loanRepaymentRatio: 0.5,
      cashFlowVolatility: 0.75,
    };
    const result = computeCreditModel(mid);
    expect(result.score).toBeGreaterThanOrEqual(300);
    expect(result.score).toBeLessThanOrEqual(850);
    expect(result.factors).toHaveLength(5);
    const weightSum = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(weightSum).toBeCloseTo(1);
  });
});

describe("creditLimitMultiplier", () => {
  it("scales with score bands", () => {
    expect(creditLimitMultiplier(800)).toBe(3);
    expect(creditLimitMultiplier(700)).toBe(2);
    expect(creditLimitMultiplier(600)).toBe(1);
    expect(creditLimitMultiplier(400)).toBe(0.5);
  });
});
