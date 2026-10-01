import { scoreAllActivities } from "../activities/index.js";
import type { DailyConditions } from "../activities/types.js";
import type {
  CityRepository,
  ForecastRepository,
} from "../persistence/index.js";
import type {
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

      const geocodingResults = await mapProviderCall(() =>
        deps.geocoding.search({ name: trimmed, count: 1 }),
      );

      const match = geocodingResults[0];
      if (!match) {
        throw new CityNotFoundError(trimmed);
      }

      const city = await deps.cities.upsert({
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

      const currentTime = now();
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
        const refreshed = await refreshAndPersist(deps, city, currentTime);
        return {
          city,
          forecast: toCityForecastDays(refreshed),
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

        throw new ExternalProviderError(
          "Failed to refresh weather forecast from provider",
          { cause: error },
        );
      }
    },
  };
}

async function refreshAndPersist(
  deps: CityForecastServiceDeps,
  city: CityForecastResult["city"],
  fetchedAt: Date,
): Promise<DailyForecastRecord[]> {
  const timezone = city.timezone ?? "auto";

  const weather = await mapProviderCall(() =>
    deps.forecast.getDailyForecast({
      latitude: city.latitude,
      longitude: city.longitude,
      timezone,
      forecastDays: FORECAST_DAYS,
    }),
  );

  const marine = await deps.marine
    .getDailyMarineForecast({
      latitude: city.latitude,
      longitude: city.longitude,
      timezone,
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
