import { computeConversionRate } from "./../services/analytics.service";

describe('computeConversionRate', () => {
  it('returns 0 when leadsCount is 0', () => {
    expect(computeConversionRate(5, 0)).toBe(0);
  });

  it('computes percentage correctly', () => {
    expect(computeConversionRate(5, 10)).toBe(50);
    expect(computeConversionRate(1, 3)).toBeCloseTo(33.33, 2);
    expect(computeConversionRate(0, 10)).toBe(0);
  });
});
