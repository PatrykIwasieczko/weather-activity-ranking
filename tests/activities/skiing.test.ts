import { describe, expect, it } from "vitest";
import { scoreSkiing } from "../../src/activities/index.js";
import { conditions, expectScoreInRange } from "./helpers.js";

describe("scoreSkiing", () => {
  it("scores clearly good ski conditions highly", () => {
    const result = scoreSkiing(
      conditions({
        temperatureMaxC: -2,
        temperatureMinC: -8,
        snowfallSumCm: 12,
        precipitationSumMm: 1,
        windSpeedMaxKmh: 15,
      }),
    );

    expect(result.activity).toBe("skiing");
    expectScoreInRange(result.score);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.reasons).toContain("Fresh snowfall is expected");
    expect(result.reasons).toContain("Temperatures are suitable for skiing");
  });

  it("scores clearly poor ski conditions low", () => {
    const result = scoreSkiing(
      conditions({
        temperatureMaxC: 20,
        temperatureMinC: 12,
        snowfallSumCm: 0,
        precipitationSumMm: 30,
        windSpeedMaxKmh: 70,
      }),
    );

    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.reasons).toContain("Little or no snowfall is expected");
    expect(result.reasons).toContain("Temperatures are unsuitable for skiing");
    expect(result.reasons).toContain("Strong winds may reduce comfort");
  });

  it("rewards snowfall boundaries explicitly", () => {
    const none = scoreSkiing(conditions({ snowfallSumCm: 0 }));
    const half = scoreSkiing(
      conditions({
        snowfallSumCm: 5,
        temperatureMaxC: -2,
        temperatureMinC: -8,
        windSpeedMaxKmh: 10,
        precipitationSumMm: 0,
      }),
    );
    const full = scoreSkiing(
      conditions({
        snowfallSumCm: 10,
        temperatureMaxC: -2,
        temperatureMinC: -8,
        windSpeedMaxKmh: 10,
        precipitationSumMm: 0,
      }),
    );

    expect(none.score).toBeLessThan(half.score);
    expect(half.score).toBeLessThan(full.score);
  });

  it("handles extreme cold and warm temperatures", () => {
    const extremeCold = scoreSkiing(
      conditions({
        temperatureMaxC: -30,
        temperatureMinC: -35,
        snowfallSumCm: 10,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const warm = scoreSkiing(
      conditions({
        temperatureMaxC: 15,
        temperatureMinC: 10,
        snowfallSumCm: 10,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const ideal = scoreSkiing(
      conditions({
        temperatureMaxC: -2,
        temperatureMinC: -8,
        snowfallSumCm: 10,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );

    expect(extremeCold.score).toBeLessThan(ideal.score);
    expect(warm.score).toBeLessThan(ideal.score);
    expect(warm.reasons).toContain("Temperatures are unsuitable for skiing");
  });

  it("penalizes heavy precipitation and strong wind", () => {
    const dryCalm = scoreSkiing(
      conditions({
        temperatureMaxC: -2,
        temperatureMinC: -8,
        snowfallSumCm: 8,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const wetWindy = scoreSkiing(
      conditions({
        temperatureMaxC: -2,
        temperatureMinC: -8,
        snowfallSumCm: 8,
        precipitationSumMm: 25,
        windSpeedMaxKmh: 60,
      }),
    );

    expect(wetWindy.score).toBeLessThan(dryCalm.score);
    expect(wetWindy.reasons).toContain("Strong winds may reduce comfort");
    expect(wetWindy.reasons).toContain("Wet conditions may reduce comfort");
  });

  it("clamps the final skiing score to 0–100", () => {
    const result = scoreSkiing(
      conditions({
        temperatureMaxC: -2,
        temperatureMinC: -8,
        snowfallSumCm: 100,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 0,
      }),
    );

    expectScoreInRange(result.score);
    expect(result.score).toBe(100);
  });
});
