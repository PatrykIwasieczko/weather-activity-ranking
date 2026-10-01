import { describe, expect, it } from "vitest";
import { scoreOutdoorSightseeing } from "../../src/activities/index.js";
import { conditions, expectScoreInRange } from "./helpers.js";

describe("scoreOutdoorSightseeing", () => {
  it("scores mild dry calm days highly", () => {
    const result = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: 22,
        temperatureMinC: 16,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 12,
      }),
    );

    expect(result.activity).toBe("outdoor_sightseeing");
    expectScoreInRange(result.score);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toContain(
      "Temperatures are comfortable for outdoor sightseeing",
    );
    expect(result.reasons).toContain("Dry conditions favor outdoor sightseeing");
  });

  it("scores hot wet windy days poorly", () => {
    const result = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: 38,
        temperatureMinC: 30,
        precipitationSumMm: 25,
        windSpeedMaxKmh: 60,
      }),
    );

    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.reasons).toContain(
      "Temperatures are uncomfortable for outdoor sightseeing",
    );
    expect(result.reasons).toContain(
      "Precipitation may disrupt outdoor sightseeing",
    );
  });

  it("treats zero precipitation as best for outdoor sightseeing", () => {
    const dry = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: 20,
        temperatureMinC: 14,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const wet = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: 20,
        temperatureMinC: 14,
        precipitationSumMm: 20,
        windSpeedMaxKmh: 10,
      }),
    );

    expect(dry.score).toBeGreaterThan(wet.score);
  });

  it("handles extreme temperatures and strong wind boundaries", () => {
    const freezing = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: -8,
        temperatureMinC: -12,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const ideal = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: 22,
        temperatureMinC: 16,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const windy = scoreOutdoorSightseeing(
      conditions({
        temperatureMaxC: 22,
        temperatureMinC: 16,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 55,
      }),
    );

    expect(freezing.score).toBeLessThan(ideal.score);
    expect(windy.score).toBeLessThan(ideal.score);
    expect(windy.reasons).toContain("Strong winds may reduce outdoor comfort");
  });
});
