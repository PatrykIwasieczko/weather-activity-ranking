export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

export type GeocodedLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  country: string | null;
  admin1: string | null;
  timezone: string | null;
  elevationMeters: number | null;
  population: number | null;
};

export type DailyWeather = {
  /** Local calendar date in `YYYY-MM-DD` form. */
  date: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationSumMm: number;
  snowfallSumCm: number;
  windSpeedMaxKmh: number;
};

export type WeatherForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  days: DailyWeather[];
};

/**
 * Marine conditions for a calendar day.
 * Null wave fields mean Open-Meteo returned no usable marine data
 * for that day (common for inland locations).
 */
export type DailyMarineConditions = {
  date: string;
  waveHeightMaxM: number | null;
  wavePeriodMaxS: number | null;
};

export type MarineForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  days: DailyMarineConditions[];
};
