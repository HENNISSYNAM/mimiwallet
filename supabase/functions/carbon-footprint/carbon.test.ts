import { describe, it, expect } from "vitest";
import {
  EMISSION_FACTORS,
  DEFAULT_FACTOR,
  factorFor,
  emissionsFor,
  computeFootprint,
  reductionTips,
  type CarbonTransaction,
} from "./carbon";

const tx = (
  amount: number,
  category: string | null,
  transaction_date = "2026-03-15",
  type = "expense"
): CarbonTransaction => ({ amount, category, transaction_date, type });

describe("factorFor", () => {
  it("returns the published factor for a known category", () => {
    expect(factorFor("Tiện ích")).toBe(EMISSION_FACTORS["Tiện ích"]);
  });

  it("falls back for unknown or missing categories", () => {
    expect(factorFor("Không có thật")).toBe(DEFAULT_FACTOR);
    expect(factorFor(null)).toBe(DEFAULT_FACTOR);
  });

  it("treats loan disbursement as non-emitting financing", () => {
    expect(factorFor("Giải ngân")).toBe(0);
  });
});

describe("emissionsFor", () => {
  it("scales linearly per million VND", () => {
    // 10,000,000 VND at 38 kg/million = 380 kg
    expect(emissionsFor(10_000_000, "Nhập hàng")).toBeCloseTo(380, 6);
  });

  it("uses magnitude, so a negative expense still emits", () => {
    expect(emissionsFor(-10_000_000, "Nhập hàng")).toBeCloseTo(380, 6);
  });
});

describe("computeFootprint", () => {
  it("counts only expenses, ignoring income and loans", () => {
    const fp = computeFootprint([
      tx(10_000_000, "Nhập hàng"),
      tx(50_000_000, null, "2026-03-01", "income"),
      tx(90_000_000, "Giải ngân", "2026-03-01", "loan"),
    ]);
    expect(fp.totalEmissions).toBeCloseTo(380, 2);
    expect(fp.totalSpend).toBe(10_000_000);
    expect(fp.totalRevenue).toBe(50_000_000);
  });

  it("keeps the category split reconciled with the total", () => {
    const fp = computeFootprint([
      tx(10_000_000, "Nhập hàng"),
      tx(5_000_000, "Tiện ích"),
      tx(20_000_000, "Vận hành"),
    ]);
    const summed = fp.byCategory.reduce((s, c) => s + c.emissions, 0);
    expect(summed).toBeCloseTo(fp.totalEmissions, 1);
  });

  it("ranks categories by emissions, not by spend", () => {
    // Utilities spend less but emit more per dong than payroll.
    const fp = computeFootprint([
      tx(100_000_000, "Lương"), // 100 * 4 = 400
      tx(20_000_000, "Tiện ích"), // 20 * 52 = 1040
    ]);
    expect(fp.byCategory[0].category).toBe("Tiện ích");
  });

  it("buckets by calendar month in order", () => {
    const fp = computeFootprint([
      tx(1_000_000, "Vận hành", "2026-03-20"),
      tx(1_000_000, "Vận hành", "2026-01-10"),
      tx(1_000_000, "Vận hành", "2026-02-05"),
    ]);
    expect(fp.byMonth.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("expresses intensity per million VND of revenue", () => {
    const fp = computeFootprint([
      tx(10_000_000, "Nhập hàng"), // 380 kg
      tx(100_000_000, null, "2026-03-01", "income"),
    ]);
    // 380 kg over 100 million revenue = 3.8 kg per million
    expect(fp.intensityPerRevenue).toBeCloseTo(3.8, 2);
  });

  it("reports zero intensity rather than dividing by zero revenue", () => {
    const fp = computeFootprint([tx(10_000_000, "Nhập hàng")]);
    expect(fp.intensityPerRevenue).toBe(0);
  });

  it("returns an empty, zeroed footprint for no transactions", () => {
    const fp = computeFootprint([]);
    expect(fp.totalEmissions).toBe(0);
    expect(fp.byCategory).toEqual([]);
    expect(fp.byMonth).toEqual([]);
  });
});

describe("reductionTips", () => {
  it("targets the company's largest emitting category first", () => {
    const fp = computeFootprint([
      tx(50_000_000, "Tiện ích"),
      tx(1_000_000, "Lương"),
    ]);
    const tips = reductionTips(fp);
    expect(tips[0].category).toBe("Tiện ích");
    expect(tips[0].share).toBeGreaterThan(90);
  });

  it("says nothing when there are no emissions to cut", () => {
    expect(reductionTips(computeFootprint([]))).toEqual([]);
  });
});
