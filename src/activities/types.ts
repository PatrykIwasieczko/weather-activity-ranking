export const ACTIVITIES = [
  "skiing",
  "surfing",
  "outdoor_sightseeing",
  "indoor_sightseeing",
] as const;

export type Activity = (typeof ACTIVITIES)[number];

/**
 * Normalized daily conditions used by activity scorers.
 * Independent of Prisma, GraphQL, and Open-Meteo response shapes.
 */
export type DailyConditions = {
  /** Local calendar date in `YYYY-MM-DD` form. */
  date: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationSumMm: number;
  snowfallSumCm: number;
  windSpeedMaxKmh: number;
  /** Null when marine data is unavailable. */
  waveHeightMaxM: number | null;
  /** Null when marine data is unavailable. */
  wavePeriodMaxS: number | null;
};

export type ActivityScore = {
  activity: Activity;
  /** Integer suitability score constrained to 0–100. */
  score: number;
  reasons: string[];
};

export type FactorContribution = {
  name: string;
  score: number;
  weight: number;
};
