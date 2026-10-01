import {
  buildReasons,
  combineWeightedScores,
  scoreFalling,
  scorePlateau,
  scoreRising,
} from "./helpers.js";
import type { ActivityScore, DailyConditions } from "./types.js";

/** Wave height (m): small beginner/intermediate swell band for the MVP. */
const WAVE_HEIGHT_ZERO_LOW_M = 0.2;
const WAVE_HEIGHT_FULL_LOW_M = 1.0;
const WAVE_HEIGHT_FULL_HIGH_M = 2.5;
const WAVE_HEIGHT_ZERO_HIGH_M = 5.0;

/** Wave period (s): longer periods generally indicate better wave quality. */
const WAVE_PERIOD_ZERO_S = 4;
const WAVE_PERIOD_FULL_S = 12;

/** Wind (km/h): lighter wind preferred for cleaner conditions. */
const SURF_WIND_FULL_KMH = 15;
const SURF_WIND_ZERO_KMH = 45;

function hasMeaningfulMarineData(day: DailyConditions): boolean {
  return day.waveHeightMaxM !== null && day.wavePeriodMaxS !== null;
}

export function scoreSurfing(day: DailyConditions): ActivityScore {
  if (!hasMeaningfulMarineData(day)) {
    return {
      activity: "surfing",
      score: 0,
      reasons: ["Marine conditions are unavailable for this location"],
    };
  }

  const waveHeightM = day.waveHeightMaxM as number;
  const wavePeriodS = day.wavePeriodMaxS as number;

  const waveHeightScore = scorePlateau(
    waveHeightM,
    WAVE_HEIGHT_ZERO_LOW_M,
    WAVE_HEIGHT_FULL_LOW_M,
    WAVE_HEIGHT_FULL_HIGH_M,
    WAVE_HEIGHT_ZERO_HIGH_M,
  );
  const wavePeriodScore = scoreRising(
    wavePeriodS,
    WAVE_PERIOD_ZERO_S,
    WAVE_PERIOD_FULL_S,
  );
  const windScore = scoreFalling(
    day.windSpeedMaxKmh,
    SURF_WIND_FULL_KMH,
    SURF_WIND_ZERO_KMH,
  );

  const factors = [
    { name: "wave_height", score: waveHeightScore, weight: 0.5 },
    { name: "wave_period", score: wavePeriodScore, weight: 0.3 },
    { name: "wind", score: windScore, weight: 0.2 },
  ] as const;

  return {
    activity: "surfing",
    score: combineWeightedScores(factors),
    reasons: buildReasons(
      [
        {
          score: waveHeightScore,
          good: "Wave heights look suitable for surfing",
          bad: "Wave heights look poor for surfing",
        },
        {
          score: wavePeriodScore,
          good: "Wave periods look favorable",
          bad: "Short wave periods may reduce surf quality",
        },
        {
          score: windScore,
          good: "Winds look manageable for surfing",
          bad: "Strong winds may reduce surf quality",
        },
      ],
      "Surfing conditions look mixed",
    ),
  };
}
