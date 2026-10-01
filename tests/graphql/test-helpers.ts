import type {
  CityRepository,
  ForecastRepository,
} from "../../src/persistence/index.js";
import type {
  CityRecord,
  DailyForecastRecord,
  UpsertCityInput,
  UpsertDailyForecastInput,
} from "../../src/persistence/types.js";
import { addDays } from "../../src/persistence/dates.js";
import type {
  ForecastClient,
  GeocodingClient,
  MarineClient,
} from "../../src/weather/open-meteo/index.js";
import type { GeocodedLocation } from "../../src/weather/domain.js";
import type {
  MarineForecast,
  WeatherForecast,
} from "../../src/weather/domain.js";
import { OpenMeteoError } from "../../src/weather/open-meteo/errors.js";

export function createMemoryCityRepository(): CityRepository & {
  store: Map<string, CityRecord>;
} {
  const byOpenMeteoId = new Map<number, CityRecord>();
  const store = new Map<string, CityRecord>();

  return {
    store,
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findByOpenMeteoId(openMeteoId) {
      return byOpenMeteoId.get(openMeteoId) ?? null;
    },
    async findByName(name) {
      const trimmed = name.trim().toLowerCase();
      for (const city of store.values()) {
        if (city.name.toLowerCase() === trimmed) {
          return city;
        }
      }
      return null;
    },
    async upsert(input: UpsertCityInput) {
      const existing = byOpenMeteoId.get(input.openMeteoId);
      const now = new Date();
      const city: CityRecord = {
        id: existing?.id ?? `city_${input.openMeteoId}`,
        openMeteoId: input.openMeteoId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        countryCode: input.countryCode,
        country: input.country,
        admin1: input.admin1,
        timezone: input.timezone,
        elevationMeters: input.elevationMeters,
        population: input.population,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      store.set(city.id, city);
      byOpenMeteoId.set(city.openMeteoId, city);
      return city;
    },
  };
}

export function createMemoryForecastRepository(): ForecastRepository & {
  store: DailyForecastRecord[];
} {
  const store: DailyForecastRecord[] = [];

  return {
    store,
    async findForCityRange({ cityId, fromDate, dayCount = 7 }) {
      const end = addDays(fromDate, dayCount);
      return store
        .filter(
          (row) =>
            row.cityId === cityId && row.date >= fromDate && row.date < end,
        )
        .sort((left, right) => left.date.localeCompare(right.date));
    },
    async upsertMany({ cityId, forecasts }) {
      const saved: DailyForecastRecord[] = [];
      for (const forecast of forecasts) {
        const index = store.findIndex(
          (row) => row.cityId === cityId && row.date === forecast.date,
        );
        const now = new Date();
        const record = toRecord(cityId, forecast, now, store[index]);
        if (index >= 0) {
          store[index] = record;
        } else {
          store.push(record);
        }
        saved.push(record);
      }
      return saved.sort((left, right) => left.date.localeCompare(right.date));
    },
  };
}

function toRecord(
  cityId: string,
  forecast: UpsertDailyForecastInput,
  now: Date,
  existing?: DailyForecastRecord,
): DailyForecastRecord {
  return {
    id: existing?.id ?? `forecast_${cityId}_${forecast.date}`,
    cityId,
    date: forecast.date,
    fetchedAt: forecast.fetchedAt,
    temperatureMaxC: forecast.temperatureMaxC,
    temperatureMinC: forecast.temperatureMinC,
    precipitationSumMm: forecast.precipitationSumMm,
    snowfallSumCm: forecast.snowfallSumCm,
    windSpeedMaxKmh: forecast.windSpeedMaxKmh,
    waveHeightMaxM: forecast.waveHeightMaxM,
    wavePeriodMaxS: forecast.wavePeriodMaxS,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function zakopaneLocation(): GeocodedLocation {
  return {
    id: 753167,
    name: "Zakopane",
    latitude: 49.299,
    longitude: 19.9489,
    countryCode: "PL",
    country: "Poland",
    admin1: "Lesser Poland",
    timezone: "Europe/Warsaw",
    elevationMeters: 838,
    population: 27580,
  };
}

export function createGeocodingMock(
  results: GeocodedLocation[] | (() => GeocodedLocation[] | Promise<GeocodedLocation[]>),
): GeocodingClient {
  return {
    async search() {
      return typeof results === "function" ? await results() : results;
    },
  };
}

export function createForecastMock(
  days: WeatherForecast["days"] | (() => WeatherForecast | Promise<WeatherForecast>),
): ForecastClient {
  return {
    async getDailyForecast(params) {
      if (typeof days === "function") {
        return days();
      }
      return {
        latitude: params.latitude,
        longitude: params.longitude,
        timezone: params.timezone ?? "Europe/Warsaw",
        days,
      };
    },
  };
}

export function createMarineMock(
  days:
    | MarineForecast["days"]
    | (() => MarineForecast | Promise<MarineForecast>)
    | "fail",
): MarineClient {
  return {
    async getDailyMarineForecast(params) {
      if (days === "fail") {
        throw new OpenMeteoError("marine unavailable", "http", { status: 500 });
      }
      if (typeof days === "function") {
        return days();
      }
      return {
        latitude: params.latitude,
        longitude: params.longitude,
        timezone: params.timezone ?? "Europe/Warsaw",
        days,
      };
    },
  };
}

export function sevenWeatherDays(fromDate: string): WeatherForecast["days"] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(fromDate, index),
    temperatureMaxC: 10 + index,
    temperatureMinC: 0 + index,
    precipitationSumMm: index,
    snowfallSumCm: index === 0 ? 5 : 0,
    windSpeedMaxKmh: 10 + index,
  }));
}

export function sevenMarineDays(fromDate: string): MarineForecast["days"] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(fromDate, index),
    waveHeightMaxM: 1.2,
    wavePeriodMaxS: 8 + index * 0.1,
  }));
}

export async function executeGraphQL(options: {
  yoga: {
    // Yoga fetch has complex overloads; tests only need the RequestInit form.
    fetch: (url: string, init?: RequestInit) => PromiseLike<Response>;
  };
  query: string;
  variables?: Record<string, unknown>;
}) {
  const response = await options.yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: options.query,
      variables: options.variables,
    }),
  });

  const body = (await response.json()) as {
    data?: Record<string, unknown> | null;
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
  };

  return { status: response.status, body };
}
