/**
 * Provider-specific shapes for Open-Meteo Marine API daily responses.
 *
 * Docs: https://open-meteo.com/en/docs/marine-weather-api
 *
 * Note: the Marine API does not expose wind. Surfing wind comes from the
 * Forecast API (`wind_speed_10m_max`) in this project.
 */
export type OpenMeteoMarineResponse = {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone: string;
  timezone_abbreviation?: string;
  elevation?: number;
  daily_units?: Record<string, string>;
  daily: OpenMeteoMarineDaily;
};

export type OpenMeteoMarineDaily = {
  time: string[];
  wave_height_max: Array<number | null>;
  wave_period_max: Array<number | null>;
};

/** Daily marine variables required by the surfing score. */
export const MARINE_DAILY_VARIABLES = [
  "wave_height_max",
  "wave_period_max",
] as const;
