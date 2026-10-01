import {
  buildReasons,
  combineWeightedScores,
  meanTemperatureC,
  scoreFalling,
  scorePlateau,
  scoreRising,
} from "./helpers.js";
import type { ActivityScore, DailyConditions } from "./types.js";

/** Snowfall (cm): none is poor; ~10 cm+ is excellent for the MVP heuristic. */
const SNOWFALL_ZERO_CM = 0;
const SNOWFALL_FULL_CM = 10;

/** Mean temperature (°C): cold winter band is preferred for skiing. */
const SKI_TEMP_ZERO_LOW_C = -25;
const SKI_TEMP_FULL_LOW_C = -12;
const SKI_TEMP_FULL_HIGH_C = -1;
const SKI_TEMP_ZERO_HIGH_C = 8;

/** Max wind (km/h): calm/moderate preferred. */
const SKI_WIND_FULL_KMH = 20;
const SKI_WIND_ZERO_KMH = 60;

/** Precipitation sum (mm): wetter days reduce outdoor skiing comfort. */
const SKI_PRECIP_FULL_MM = 0;
const SKI_PRECIP_ZERO_MM = 25;

export function scoreSkiing(day: DailyConditions): ActivityScore {
  const meanTempC = meanTemperatureC(day);

  const snowfallScore = scoreRising(
    day.snowfallSumCm,
    SNOWFALL_ZERO_CM,
    SNOWFALL_FULL_CM,
  );
  const temperatureScore = scorePlateau(
    meanTempC,
    SKI_TEMP_ZERO_LOW_C,
    SKI_TEMP_FULL_LOW_C,
    SKI_TEMP_FULL_HIGH_C,
    SKI_TEMP_ZERO_HIGH_C,
  );
  const windScore = scoreFalling(
    day.windSpeedMaxKmh,
    SKI_WIND_FULL_KMH,
    SKI_WIND_ZERO_KMH,
  );
  const precipitationScore = scoreFalling(
    day.precipitationSumMm,
    SKI_PRECIP_FULL_MM,
    SKI_PRECIP_ZERO_MM,
  );

  const factors = [
    { name: "snowfall", score: snowfallScore, weight: 0.4 },
    { name: "temperature", score: temperatureScore, weight: 0.25 },
    { name: "wind", score: windScore, weight: 0.2 },
    { name: "precipitation", score: precipitationScore, weight: 0.15 },
  ] as const;

  return {
    activity: "skiing",
    score: combineWeightedScores(factors),
    reasons: buildReasons(
      [
        {
          score: snowfallScore,
          good: "Fresh snowfall is expected",
          bad: "Little or no snowfall is expected",
        },
        {
          score: temperatureScore,
          good: "Temperatures are suitable for skiing",
          bad: "Temperatures are unsuitable for skiing",
        },
        {
          score: windScore,
          good: "Winds look manageable for skiing",
          bad: "Strong winds may reduce comfort",
        },
        {
          score: precipitationScore,
          good: "Precipitation looks limited",
          bad: "Wet conditions may reduce comfort",
        },
      ],
      "Skiing conditions look mixed",
    ),
  };
}
