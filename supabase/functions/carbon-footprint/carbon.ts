/**
 * Spend-based carbon accounting.
 *
 * This is the GHG Protocol Scope 3 "spend-based method": you multiply how much
 * money went into a category by an emission factor for that category. It is a
 * recognised methodology precisely because most SMEs have no meter readings,
 * fuel logs or supplier data — but they do have bank transactions.
 *
 * It is also, unavoidably, an ESTIMATE. Two companies spending the same amount
 * on "Nhập hàng" get the same number here even if one buys steel and the other
 * buys rice. Every surface that shows these figures must say so; the value is
 * in the trend and the relative split between categories, not in the absolute
 * tonnage. Overstating this would be worse than not shipping it.
 *
 * No Deno imports here on purpose — the edge function keeps its I/O in
 * index.ts so this arithmetic stays unit-testable under Vitest, the same split
 * credit-scoring/scoring.ts uses.
 */

/**
 * kg CO2e per 1,000,000 VND of spend.
 *
 * Derived from environmentally-extended input-output (EEIO) intensities for
 * emerging-market economies, converted to VND at a round 25,000 VND/USD and
 * rounded to two significant figures — false precision would imply a
 * measurement we did not make.
 *
 * Ordering reflects real physical intensity: goods and utilities carry embodied
 * energy, services and payroll carry far less, and a loan disbursement is a
 * financing movement rather than consumption, so it emits nothing.
 */
export const EMISSION_FACTORS: Record<string, number> = {
  'Nhập hàng': 38, // purchased goods — embodied manufacturing + freight
  'Tiện ích': 52, // utilities — grid electricity dominates, highest intensity
  'Vận hành': 21, // operations, rent, logistics
  'Đại lý': 15, // distribution/agency services
  'Lương': 4, // payroll — commuting and office use only
  'Giải ngân': 0, // loan disbursement is financing, not consumption
};

/** Applied to spend in a category we have no factor for. */
export const DEFAULT_FACTOR = 18;

export const FACTOR_SOURCE =
  'Hệ số phát thải theo phương pháp spend-based (EEIO), quy đổi 25.000 VND/USD';

export interface CarbonTransaction {
  amount: number;
  type: string;
  category: string | null;
  transaction_date: string;
}

export interface CategoryBreakdown {
  category: string;
  spend: number;
  /** kg CO2e */
  emissions: number;
  factor: number;
}

export interface MonthlyEmissions {
  month: string;
  emissions: number;
}

export interface CarbonFootprint {
  /** kg CO2e across the whole window. */
  totalEmissions: number;
  totalSpend: number;
  totalRevenue: number;
  /**
   * kg CO2e per million VND of revenue. This is the only figure that compares
   * meaningfully between companies — absolute tonnage just tracks size.
   */
  intensityPerRevenue: number;
  byCategory: CategoryBreakdown[];
  byMonth: MonthlyEmissions[];
}

export function factorFor(category: string | null): number {
  if (!category) return DEFAULT_FACTOR;
  return EMISSION_FACTORS[category] ?? DEFAULT_FACTOR;
}

/** Emissions in kg CO2e for a given VND amount in a given category. */
export function emissionsFor(amountVnd: number, category: string | null): number {
  const millions = Math.abs(amountVnd) / 1_000_000;
  return millions * factorFor(category);
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Only `expense` rows drive emissions. Income is what the company sold, and
 * counting it would double-count its customers' footprint; loan rows are
 * financing. Income is still summed separately to give the intensity ratio a
 * denominator.
 */
export function computeFootprint(transactions: CarbonTransaction[]): CarbonFootprint {
  const catMap = new Map<string, { spend: number; emissions: number; factor: number }>();
  const monthMap = new Map<string, number>();
  let totalEmissions = 0;
  let totalSpend = 0;
  let totalRevenue = 0;

  for (const t of transactions) {
    if (t.type === 'income') {
      totalRevenue += Math.abs(t.amount);
      continue;
    }
    if (t.type !== 'expense') continue; // loans excluded

    const category = t.category ?? 'Khác';
    const spend = Math.abs(t.amount);
    const factor = factorFor(t.category);
    const emissions = (spend / 1_000_000) * factor;

    totalSpend += spend;
    totalEmissions += emissions;

    const prev = catMap.get(category) ?? { spend: 0, emissions: 0, factor };
    prev.spend += spend;
    prev.emissions += emissions;
    catMap.set(category, prev);

    const month = t.transaction_date.slice(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) ?? 0) + emissions);
  }

  const byCategory: CategoryBreakdown[] = [...catMap.entries()]
    .map(([category, v]) => ({
      category,
      spend: v.spend,
      emissions: round(v.emissions),
      factor: v.factor,
    }))
    .sort((a, b) => b.emissions - a.emissions);

  const byMonth: MonthlyEmissions[] = [...monthMap.entries()]
    .map(([month, emissions]) => ({ month, emissions: round(emissions) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalEmissions: round(totalEmissions),
    totalSpend,
    totalRevenue,
    intensityPerRevenue:
      totalRevenue > 0 ? round(totalEmissions / (totalRevenue / 1_000_000)) : 0,
    byCategory,
    byMonth,
  };
}

/**
 * Reduction levers, ranked by how much of this company's own footprint they
 * touch. Generic advice ("use less energy") is worthless; pointing at the
 * category that is actually 60% of their emissions is not.
 */
export function reductionTips(fp: CarbonFootprint): { category: string; share: number; tip: string }[] {
  const TIPS: Record<string, string> = {
    'Tiện ích':
      'Điện chiếm phần lớn phát thải nhóm này: rà lại giờ vận hành thiết bị công suất lớn và cân nhắc điện mặt trời áp mái.',
    'Nhập hàng':
      'Ưu tiên nhà cung cấp nội địa và gộp đơn để giảm quãng vận chuyển — vừa giảm phát thải vừa giảm chi phí logistics.',
    'Vận hành':
      'Tối ưu tuyến giao hàng và giảm số chuyến rỗng; đây thường là khoản cắt được nhanh nhất.',
    'Đại lý': 'Số hóa quy trình với đại lý để giảm đi lại và giấy tờ.',
    'Lương': 'Khuyến khích đi chung xe hoặc làm việc linh hoạt để giảm phát thải đi lại.',
  };
  if (fp.totalEmissions <= 0) return [];
  return fp.byCategory
    .filter((c) => c.emissions > 0 && TIPS[c.category])
    .slice(0, 3)
    .map((c) => ({
      category: c.category,
      share: round((c.emissions / fp.totalEmissions) * 100, 1),
      tip: TIPS[c.category],
    }));
}
