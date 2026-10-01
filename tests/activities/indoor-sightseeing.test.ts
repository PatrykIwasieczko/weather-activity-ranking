import { describe, expect, it } from "vitest";
import { scoreIndoorSightseeing } from "../../src/activities/index.js";
import { conditions, expectScoreInRange } from "./helpers.js";

describe("scoreIndoorSightseeing", () => {
  it("scores unpleasant outdoor weather as good for indoor sightseeing", () => {
    const result = scoreIndoorSightseeing(
      conditions({
        temperatureMaxC: 36,
        temperatureMinC: 28,
        precipitationSumMm: 25,
        windSpeedMaxKmh: 50,
      }),
    );

    expect(result.activity).toBe("indoor_sightseeing");
    expectScoreInRange(result.score);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons).toContain(
      "Wet weather makes indoor sightseeing more appealing",
    );
  });

  it("scores mild dry calm weather as weaker for indoor sightseeing", () => {
    const result = scoreIndoorSightseeing(
      conditions({
        temperatureMaxC: 22,
        temperatureMinC: 16,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 8,
      }),
    );

    expect(result.score).toBeLessThanOrEqual(35);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("rewards heavy precipitation and extreme temperatures", () => {
    const pleasant = scoreIndoorSightseeing(
      conditions({
        temperatureMaxC: 21,
        temperatureMinC: 17,
        precipitationSumMm: 0,
        windSpeedMaxKmh: 10,
      }),
    );
    const stormyHot = scoreIndoorSightseeing(
      conditions({
        temperatureMaxC: 35,
        temperatureMinC: 30,
        precipitationSumMm: 20,
        windSpeedMaxKmh: 40,
      }),
    );
    const stormyCold = scoreIndoorSightseeing(
      conditions({
        temperatureMaxC: -10,
        temperatureMinC: -18,
        precipitationSumMm: 20,
        windSpeedMaxKmh: 40,
      }),
    );

    expect(stormyHot.score).toBeGreaterThan(pleasant.score);
    expect(stormyCold.score).toBeGreaterThan(pleasant.score);
  });

  it("treats zero precipitation as less favorable than heavy rain", () => {
    const dry = scoreIndoorSightseeing(
      conditions({ precipitationSumMm: 0, windSpeedMaxKmh: 20 }),
    );
    const heavy = scoreIndoorSightseeing(
      conditions({ precipitationSumMm: 20, windSpeedMaxKmh: 20 }),
    );

    expect(heavy.score).toBeGreaterThan(dry.score);
  });
});
