import { describe, expect, it } from "vitest";
import {
  clamp,
  combineWeightedScores,
  meanTemperatureC,
  scoreFalling,
  scoreInvertedPlateau,
  scorePlateau,
  scoreRising,
  toScore,
} from "../../src/activities/index.js";

describe("scoring helpers", () => {
  it("clamps and rounds scores to 0–100 integers", () => {
    expect(toScore(-5.2)).toBe(0);
    expect(toScore(100.4)).toBe(100);
    expect(toScore(82.4)).toBe(82);
    expect(toScore(82.5)).toBe(83);
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("computes mean temperature deterministically", () => {
    expect(meanTemperatureC({ temperatureMaxC: 10, temperatureMinC: 0 })).toBe(
      5,
    );
  });

  it("handles rising/falling/plateau boundaries", () => {
    expect(scoreRising(0, 0, 10)).toBe(0);
    expect(scoreRising(5, 0, 10)).toBe(50);
    expect(scoreRising(10, 0, 10)).toBe(100);
    expect(scoreRising(12, 0, 10)).toBe(100);

    expect(scoreFalling(0, 10, 40)).toBe(100);
    expect(scoreFalling(10, 10, 40)).toBe(100);
    expect(scoreFalling(25, 10, 40)).toBe(50);
    expect(scoreFalling(40, 10, 40)).toBe(0);
    expect(scoreFalling(50, 10, 40)).toBe(0);

    expect(scorePlateau(0, 0, 10, 20, 30)).toBe(0);
    expect(scorePlateau(5, 0, 10, 20, 30)).toBe(50);
    expect(scorePlateau(15, 0, 10, 20, 30)).toBe(100);
    expect(scorePlateau(25, 0, 10, 20, 30)).toBe(50);
    expect(scorePlateau(30, 0, 10, 20, 30)).toBe(0);

    expect(scoreInvertedPlateau(15, 0, 10, 20, 30)).toBe(0);
    expect(scoreInvertedPlateau(0, 0, 10, 20, 30)).toBe(100);
  });

  it("combines weighted factor scores and clamps", () => {
    expect(
      combineWeightedScores([
        { name: "a", score: 100, weight: 0.5 },
        { name: "b", score: 0, weight: 0.5 },
      ]),
    ).toBe(50);

    expect(
      combineWeightedScores([
        { name: "a", score: 1000, weight: 1 },
        { name: "b", score: 1000, weight: 1 },
      ]),
    ).toBe(100);
  });
});
