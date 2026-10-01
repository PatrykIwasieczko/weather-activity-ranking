import { describe, expect, it } from "vitest";
import { scoreSurfing } from "../../src/activities/index.js";
import { conditions, expectScoreInRange } from "./helpers.js";

describe("scoreSurfing", () => {
  it("returns score 0 with an explicit reason when marine data is missing", () => {
    const bothMissing = scoreSurfing(
      conditions({
        waveHeightMaxM: null,
        wavePeriodMaxS: null,
        windSpeedMaxKmh: 10,
      }),
    );
    const heightMissing = scoreSurfing(
      conditions({
        waveHeightMaxM: null,
        wavePeriodMaxS: 10,
        windSpeedMaxKmh: 10,
      }),
    );
    const periodMissing = scoreSurfing(
      conditions({
        waveHeightMaxM: 1.5,
        wavePeriodMaxS: null,
        windSpeedMaxKmh: 10,
      }),
    );

    for (const result of [bothMissing, heightMissing, periodMissing]) {
      expect(result.activity).toBe("surfing");
      expect(result.score).toBe(0);
      expect(result.reasons).toEqual([
        "Marine conditions are unavailable for this location",
      ]);
    }
  });

  it("scores clearly good surf conditions highly", () => {
    const result = scoreSurfing(
      conditions({
        waveHeightMaxM: 1.6,
        wavePeriodMaxS: 12,
        windSpeedMaxKmh: 12,
      }),
    );

    expectScoreInRange(result.score);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toContain("Wave heights look suitable for surfing");
    expect(result.reasons).toContain("Wave periods look favorable");
  });

  it("scores clearly poor surf conditions low", () => {
    const result = scoreSurfing(
      conditions({
        waveHeightMaxM: 0.1,
        wavePeriodMaxS: 3,
        windSpeedMaxKmh: 50,
      }),
    );

    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.reasons).toContain("Wave heights look poor for surfing");
    expect(result.reasons).toContain(
      "Short wave periods may reduce surf quality",
    );
    expect(result.reasons).toContain("Strong winds may reduce surf quality");
  });

  it("handles wave-height boundaries and oversized swell", () => {
    const tiny = scoreSurfing(
      conditions({
        waveHeightMaxM: 0.2,
        wavePeriodMaxS: 10,
        windSpeedMaxKmh: 10,
      }),
    );
    const ideal = scoreSurfing(
      conditions({
        waveHeightMaxM: 1.5,
        wavePeriodMaxS: 10,
        windSpeedMaxKmh: 10,
      }),
    );
    const huge = scoreSurfing(
      conditions({
        waveHeightMaxM: 5,
        wavePeriodMaxS: 10,
        windSpeedMaxKmh: 10,
      }),
    );

    expect(tiny.score).toBeLessThan(ideal.score);
    expect(huge.score).toBeLessThan(ideal.score);
  });

  it("does not invent a surfing score from wind alone", () => {
    const result = scoreSurfing(
      conditions({
        waveHeightMaxM: null,
        wavePeriodMaxS: null,
        windSpeedMaxKmh: 5,
      }),
    );

    expect(result.score).toBe(0);
  });

  it("clamps excellent marine + wind conditions to at most 100", () => {
    const result = scoreSurfing(
      conditions({
        waveHeightMaxM: 2,
        wavePeriodMaxS: 20,
        windSpeedMaxKmh: 0,
      }),
    );

    expectScoreInRange(result.score);
    expect(result.score).toBe(100);
  });
});
