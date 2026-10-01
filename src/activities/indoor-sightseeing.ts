import {
  buildReasons,
  combineWeightedScores,
  meanTemperatureC,
  scoreInvertedPlateau,
  scoreRising,
} from "./helpers.js";
import type { ActivityScore, DailyConditions } from "./types.js";

/**
 * Precipitation (mm): wetter outdoor weather increases indoor suitability.
 * A dry day still receives a low-but-nonzero baseline via the rising curve
 * starting below zero so 0 mm maps to a modest score rather than absolute zero.
 */
const INDOOR_PRECIP_ZERO_MM = -2;
const INDOOR_PRECIP_FULL_MM = 20;

/**
 * Mean temperature (°C): inverted comfort band.
 * Mild temperatures score low for indoor preference; extremes score high.
 */
const INDOOR_TEMP_ZERO_LOW_C = -15;
const INDOOR_TEMP_FULL_LOW_C = 10;
const INDOOR_TEMP_FULL_HIGH_C = 24;
const INDOOR_TEMP_ZERO_HIGH_C = 38;

/** Max wind (km/h): stronger wind nudges people indoors. */
const INDOOR_WIND_ZERO_KMH = 10;
const INDOOR_WIND_FULL_KMH = 55;

export function scoreIndoorSightseeing(day: DailyConditions): ActivityScore {
  const meanTempC = meanTemperatureC(day);

  const precipitationScore = scoreRising(
    day.precipitationSumMm,
    INDOOR_PRECIP_ZERO_MM,
    INDOOR_PRECIP_FULL_MM,
  );
  const temperatureScore = scoreInvertedPlateau(
    meanTempC,
    INDOOR_TEMP_ZERO_LOW_C,
    INDOOR_TEMP_FULL_LOW_C,
    INDOOR_TEMP_FULL_HIGH_C,
    INDOOR_TEMP_ZERO_HIGH_C,
  );
  const windScore = scoreRising(
    day.windSpeedMaxKmh,
    INDOOR_WIND_ZERO_KMH,
    INDOOR_WIND_FULL_KMH,
  );

  const factors = [
    { name: "precipitation", score: precipitationScore, weight: 0.6 },
    { name: "temperature", score: temperatureScore, weight: 0.3 },
    { name: "wind", score: windScore, weight: 0.1 },
  ] as const;

  return {
    activity: "indoor_sightseeing",
    score: combineWeightedScores(factors),
    reasons: buildReasons(
      [
        {
          score: precipitationScore,
          good: "Wet weather makes indoor sightseeing more appealing",
          bad: "Dry weather reduces the relative appeal of indoor sightseeing",
        },
        {
          score: temperatureScore,
          good: "Uncomfortable outdoor temperatures favor indoor sightseeing",
          bad: "Mild temperatures make indoor sightseeing less necessary",
        },
        {
          score: windScore,
          good: "Strong winds increase the appeal of staying indoors",
          bad: "Light winds do little to favor indoor sightseeing",
        },
      ],
      "Indoor sightseeing conditions look mixed",
    ),
  };
}
