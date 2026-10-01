import { describe, expect, it } from "vitest";
import {
  ACTIVITIES,
  scoreAllActivities,
} from "../../src/activities/index.js";
import { conditions, expectScoreInRange } from "./helpers.js";

describe("scoreAllActivities", () => {
  it("returns one score per activity with clamped integers and reasons", () => {
    const results = scoreAllActivities(
      conditions({
        temperatureMaxC: 18,
        temperatureMinC: 12,
        precipitationSumMm: 2,
        snowfallSumCm: 0,
        windSpeedMaxKmh: 18,
        waveHeightMaxM: 1.4,
        wavePeriodMaxS: 9,
      }),
    );

    expect(results.map((result) => result.activity)).toEqual([...ACTIVITIES]);

    for (const result of results) {
      expectScoreInRange(result.score);
      expect(result.reasons.length).toBeGreaterThan(0);
      for (const reason of result.reasons) {
        expect(reason.includes("=")).toBe(false);
      }
    }
  });
});
