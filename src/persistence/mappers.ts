import type { City, DailyForecast } from "@prisma/client";
import { formatDateOnly } from "./dates.js";
import type { CityRecord, DailyForecastRecord } from "./types.js";

export function toCityRecord(city: City): CityRecord {
  return {
    id: city.id,
    openMeteoId: city.openMeteoId,
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    countryCode: city.countryCode,
    country: city.country,
    admin1: city.admin1,
    timezone: city.timezone,
    elevationMeters: city.elevationMeters,
    population: city.population,
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
  };
}

export function toDailyForecastRecord(
  forecast: DailyForecast,
): DailyForecastRecord {
  return {
    id: forecast.id,
    cityId: forecast.cityId,
    date: formatDateOnly(forecast.date),
    fetchedAt: forecast.fetchedAt,
    temperatureMaxC: forecast.temperatureMaxC,
    temperatureMinC: forecast.temperatureMinC,
    precipitationSumMm: forecast.precipitationSumMm,
    snowfallSumCm: forecast.snowfallSumCm,
    windSpeedMaxKmh: forecast.windSpeedMaxKmh,
    waveHeightMaxM: forecast.waveHeightMaxM,
    wavePeriodMaxS: forecast.wavePeriodMaxS,
    createdAt: forecast.createdAt,
    updatedAt: forecast.updatedAt,
  };
}
