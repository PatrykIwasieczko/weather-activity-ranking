/**
 * Provider-specific shapes for Open-Meteo Forecast API daily responses.
 *
 * Docs: https://open-meteo.com/en/docs
 */
export type OpenMeteoForecastResponse = {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone: string;
  timezone_abbreviation?: string;
  elevation?: number;
  daily_units?: Record<string, string>;
  daily: OpenMeteoForecastDaily;
};

export type OpenMeteoForecastDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  wind_speed_10m_max: number[];
};

/** Daily variables requested for the MVP scoring model. */
export const FORECAST_DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "snowfall_sum",
  "wind_speed_10m_max",
] as const;
