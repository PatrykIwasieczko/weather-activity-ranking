import { expect } from "vitest";
import type { DailyConditions } from "../../src/activities/index.js";

export function conditions(
  overrides: Partial<DailyConditions> = {},
): DailyConditions {
  return {
    date: "2026-10-01",
    temperatureMaxC: 20,
    temperatureMinC: 10,
    precipitationSumMm: 0,
    snowfallSumCm: 0,
    windSpeedMaxKmh: 10,
    waveHeightMaxM: null,
    wavePeriodMaxS: null,
    ...overrides,
  };
}

export function expectScoreInRange(score: number): void {
  expect(Number.isInteger(score)).toBe(true);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
}
