import { scoreAllActivities } from "../activities/index.js";
import type { DailyConditions } from "../activities/types.js";
import type {
  CityRepository,
  ForecastRepository,
} from "../persistence/index.js";
import type {
  CityRecord,
  DailyForecastRecord,
  UpsertDailyForecastInput,
} from "../persistence/types.js";
import { OpenMeteoError } from "../weather/open-meteo/errors.js";
import type {
  ForecastClient,
  GeocodingClient,
  MarineClient,
} from "../weather/open-meteo/index.js";
import { CityNotFoundError, ExternalProviderError } from "./errors.js";
import {
  FORECAST_DAYS,
  FRESHNESS_MS,
  forecastDateWindow,
  isCompleteForecastWindow,
  isFreshForecastWindow,
  localDateString,
} from "./freshness.js";
import type { CityForecastDay, CityForecastResult } from "./types.js";

export type CityForecastService = {
  getCityForecastByName: (name: string) => Promise<CityForecastResult>;
};

export type CityForecastServiceDeps = {
  geocoding: GeocodingClient;
  forecast: ForecastClient;
  marine: MarineClient;
  cities: CityRepository;
  forecasts: ForecastRepository;
  now?: () => Date;
  freshnessMs?: number;
};

/**
 * Lazy-refresh orchestrator:
 * 1. Prefer a persisted city + 7-day forecast when complete and fresh (≤ 6h).
 * 2. Otherwise fetch Forecast/Marine from Open-Meteo, persist, and return.
 * 3. If refresh fails but a complete older window exists, return that window.
 *
 * Known MVP limitation: concurrent requests for the same stale city can each
 * trigger a duplicate Open-Meteo refresh. No locks/queues in the MVP.
 */
export function createCityForecastService(
  deps: CityForecastServiceDeps,
): CityForecastService {
  const now = deps.now ?? (() => new Date());
  const freshnessMs = deps.freshnessMs ?? FRESHNESS_MS;

  return {
    async getCityForecastByName(name) {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        throw new CityNotFoundError(name);
      }

      const currentTime = now();

      const knownCity = await deps.cities.findByName(trimmed);
      if (knownCity) {
        return resolveForecastForCity(deps, knownCity, currentTime, freshnessMs);
      }

      const city = await resolveCityFromGeocoding(deps, trimmed);
      return resolveForecastForCity(deps, city, currentTime, freshnessMs);
    },
  };
}

async function resolveCityFromGeocoding(
  deps: CityForecastServiceDeps,
  name: string,
): Promise<CityRecord> {
  const geocodingResults = await mapProviderCall(() =>
    deps.geocoding.search({ name, count: 1 }),
  );

  const match = geocodingResults[0];
  if (!match) {
    throw new CityNotFoundError(name);
  }

  return deps.cities.upsert({
    openMeteoId: match.id,
    name: match.name,
    latitude: match.latitude,
    longitude: match.longitude,
    countryCode: match.countryCode,
    country: match.country,
    admin1: match.admin1,
    timezone: match.timezone,
    elevationMeters: match.elevationMeters,
    population: match.population,
  });
}

async function resolveForecastForCity(
  deps: CityForecastServiceDeps,
  city: CityRecord,
  currentTime: Date,
  freshnessMs: number,
): Promise<CityForecastResult> {
  // Keep window calculation and Open-Meteo timezone identical when unknown.
  const timeZone = city.timezone ?? "UTC";
  const fromDate = localDateString(timeZone, currentTime);

  const existing = await deps.forecasts.findForCityRange({
    cityId: city.id,
    fromDate,
    dayCount: FORECAST_DAYS,
  });

  const complete = isCompleteForecastWindow(existing, fromDate);
  const fresh =
    complete && isFreshForecastWindow(existing, currentTime, freshnessMs);

  if (fresh) {
    return {
      city,
      forecast: toCityForecastDays(existing),
    };
  }

  try {
    const refreshed = await refreshAndPersist(deps, city, currentTime, timeZone);
    const windowDays = selectForecastWindow(refreshed, fromDate);

    if (!isCompleteForecastWindow(windowDays, fromDate)) {
      throw new ExternalProviderError(
        "Provider returned an incomplete 7-day forecast window",
      );
    }

    return {
      city,
      forecast: toCityForecastDays(windowDays),
    };
  } catch (error) {
    if (complete) {
      return {
        city,
        forecast: toCityForecastDays(existing),
      };
    }

    if (error instanceof ExternalProviderError) {
      throw error;
    }

    // Preserve non-provider failures (e.g. persistence errors) as-is.
    throw error;
  }
}

async function refreshAndPersist(
  deps: CityForecastServiceDeps,
  city: CityRecord,
  fetchedAt: Date,
  timeZone: string,
): Promise<DailyForecastRecord[]> {
  const weather = await mapProviderCall(() =>
    deps.forecast.getDailyForecast({
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: timeZone,
      forecastDays: FORECAST_DAYS,
    }),
  );

  const marine = await deps.marine
    .getDailyMarineForecast({
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: timeZone,
      forecastDays: FORECAST_DAYS,
    })
    .catch(() => null);

  const marineByDate = new Map(
    (marine?.days ?? []).map((day) => [day.date, day]),
  );

  const forecasts: UpsertDailyForecastInput[] = weather.days.map((day) => {
    const marineDay = marineByDate.get(day.date);
    return {
      date: day.date,
      fetchedAt,
      temperatureMaxC: day.temperatureMaxC,
      temperatureMinC: day.temperatureMinC,
      precipitationSumMm: day.precipitationSumMm,
      snowfallSumCm: day.snowfallSumCm,
      windSpeedMaxKmh: day.windSpeedMaxKmh,
      waveHeightMaxM: marineDay?.waveHeightMaxM ?? null,
      wavePeriodMaxS: marineDay?.wavePeriodMaxS ?? null,
    };
  });

  return deps.forecasts.upsertMany({
    cityId: city.id,
    forecasts,
  });
}

function selectForecastWindow(
  forecasts: ReadonlyArray<DailyForecastRecord>,
  fromDate: string,
): DailyForecastRecord[] {
  const byDate = new Map(forecasts.map((forecast) => [forecast.date, forecast]));
  return forecastDateWindow(fromDate)
    .map((date) => byDate.get(date))
    .filter((forecast): forecast is DailyForecastRecord => forecast !== undefined);
}

function toCityForecastDays(
  forecasts: ReadonlyArray<DailyForecastRecord>,
): CityForecastDay[] {
  return [...forecasts]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((forecast) => {
      const conditions: DailyConditions = {
        date: forecast.date,
        temperatureMaxC: forecast.temperatureMaxC,
        temperatureMinC: forecast.temperatureMinC,
        precipitationSumMm: forecast.precipitationSumMm,
        snowfallSumCm: forecast.snowfallSumCm,
        windSpeedMaxKmh: forecast.windSpeedMaxKmh,
        waveHeightMaxM: forecast.waveHeightMaxM,
        wavePeriodMaxS: forecast.wavePeriodMaxS,
      };

      return {
        date: forecast.date,
        weather: {
          temperatureMinC: forecast.temperatureMinC,
          temperatureMaxC: forecast.temperatureMaxC,
          precipitationSumMm: forecast.precipitationSumMm,
          snowfallSumCm: forecast.snowfallSumCm,
          windSpeedMaxKmh: forecast.windSpeedMaxKmh,
          waveHeightMaxM: forecast.waveHeightMaxM,
          wavePeriodMaxS: forecast.wavePeriodMaxS,
        },
        activities: scoreAllActivities(conditions),
      };
    });
}

async function mapProviderCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      throw new ExternalProviderError(error.message, { cause: error });
    }
    throw error;
  }
}
