import {
  buildReasons,
  combineWeightedScores,
  meanTemperatureC,
  scoreFalling,
  scorePlateau,
} from "./helpers.js";
import type { ActivityScore, DailyConditions } from "./types.js";

/** Mean temperature (°C): mild outdoor comfort band. */
const OUTDOOR_TEMP_ZERO_LOW_C = -5;
const OUTDOOR_TEMP_FULL_LOW_C = 15;
const OUTDOOR_TEMP_FULL_HIGH_C = 24;
const OUTDOOR_TEMP_ZERO_HIGH_C = 35;

/** Precipitation (mm): dry days preferred. */
const OUTDOOR_PRECIP_FULL_MM = 0;
const OUTDOOR_PRECIP_ZERO_MM = 20;

/** Max wind (km/h). */
const OUTDOOR_WIND_FULL_KMH = 20;
const OUTDOOR_WIND_ZERO_KMH = 55;

export function scoreOutdoorSightseeing(day: DailyConditions): ActivityScore {
  const meanTempC = meanTemperatureC(day);

  const temperatureScore = scorePlateau(
    meanTempC,
    OUTDOOR_TEMP_ZERO_LOW_C,
    OUTDOOR_TEMP_FULL_LOW_C,
    OUTDOOR_TEMP_FULL_HIGH_C,
    OUTDOOR_TEMP_ZERO_HIGH_C,
  );
  const precipitationScore = scoreFalling(
    day.precipitationSumMm,
    OUTDOOR_PRECIP_FULL_MM,
    OUTDOOR_PRECIP_ZERO_MM,
  );
  const windScore = scoreFalling(
    day.windSpeedMaxKmh,
    OUTDOOR_WIND_FULL_KMH,
    OUTDOOR_WIND_ZERO_KMH,
  );

  const factors = [
    { name: "temperature", score: temperatureScore, weight: 0.4 },
    { name: "precipitation", score: precipitationScore, weight: 0.4 },
    { name: "wind", score: windScore, weight: 0.2 },
  ] as const;

  return {
    activity: "outdoor_sightseeing",
    score: combineWeightedScores(factors),
    reasons: buildReasons(
      [
        {
          score: temperatureScore,
          good: "Temperatures are comfortable for outdoor sightseeing",
          bad: "Temperatures are uncomfortable for outdoor sightseeing",
        },
        {
          score: precipitationScore,
          good: "Dry conditions favor outdoor sightseeing",
          bad: "Precipitation may disrupt outdoor sightseeing",
        },
        {
          score: windScore,
          good: "Winds look manageable outdoors",
          bad: "Strong winds may reduce outdoor comfort",
        },
      ],
      "Outdoor sightseeing conditions look mixed",
    ),
  };
}
