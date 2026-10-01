export type CityRecord = {
  id: string;
  openMeteoId: number;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  country: string | null;
  admin1: string | null;
  timezone: string | null;
  elevationMeters: number | null;
  population: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertCityInput = {
  openMeteoId: number;
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

export type DailyForecastRecord = {
  id: string;
  cityId: string;
  /** Local calendar date in `YYYY-MM-DD` form. */
  date: string;
  fetchedAt: Date;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationSumMm: number;
  snowfallSumCm: number;
  windSpeedMaxKmh: number;
  waveHeightMaxM: number | null;
  wavePeriodMaxS: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertDailyForecastInput = {
  date: string;
  fetchedAt: Date;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationSumMm: number;
  snowfallSumCm: number;
  windSpeedMaxKmh: number;
  waveHeightMaxM: number | null;
  wavePeriodMaxS: number | null;
};
