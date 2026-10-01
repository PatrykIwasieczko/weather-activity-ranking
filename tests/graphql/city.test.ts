import { createYoga } from "graphql-yoga";
import { describe, expect, it, vi } from "vitest";
import {
  createCityForecastService,
} from "../../src/app/index.js";
import type { GraphQLContext } from "../../src/graphql/context.js";
import { schema } from "../../src/graphql/schema.js";
import { OpenMeteoError } from "../../src/weather/open-meteo/errors.js";
import {
  createForecastMock,
  createGeocodingMock,
  createMarineMock,
  createMemoryCityRepository,
  createMemoryForecastRepository,
  executeGraphQL,
  sevenMarineDays,
  sevenWeatherDays,
  zakopaneLocation,
} from "./test-helpers.js";

const CITY_QUERY = /* GraphQL */ `
  query CityForecast($name: String!) {
    city(name: $name) {
      name
      country
      latitude
      longitude
      timezone
      forecast {
        date
        weather {
          temperatureMin
          temperatureMax
          precipitationSum
          snowfallSum
          windSpeedMax
          waveHeightMax
          wavePeriodMax
        }
        activities {
          activity
          score
          reasons
        }
      }
    }
  }
`;

function createTestYoga(options?: {
  geocoding?: ReturnType<typeof createGeocodingMock>;
  forecast?: ReturnType<typeof createForecastMock>;
  marine?: ReturnType<typeof createMarineMock>;
  now?: Date;
}) {
  const fromDate = "2026-10-01";
  const now = options?.now ?? new Date("2026-10-01T10:00:00.000Z");

  const service = createCityForecastService({
    geocoding:
      options?.geocoding ?? createGeocodingMock([zakopaneLocation()]),
    forecast:
      options?.forecast ?? createForecastMock(sevenWeatherDays(fromDate)),
    marine: options?.marine ?? createMarineMock(sevenMarineDays(fromDate)),
    cities: createMemoryCityRepository(),
    forecasts: createMemoryForecastRepository(),
    now: () => now,
  });

  return createYoga<GraphQLContext>({
    schema,
    context: () => ({ cityForecastService: service }),
  });
}

describe("GraphQL city query", () => {
  it("returns city info, 7-day weather, and activity scores", async () => {
    const yoga = createTestYoga();

    const { status, body } = await executeGraphQL({
      yoga: yoga as never,
      query: CITY_QUERY,
      variables: { name: "Zakopane" },
    });

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();

    const city = body.data?.city as {
      name: string;
      country: string;
      forecast: Array<{
        date: string;
        weather: {
          temperatureMin: number;
          temperatureMax: number;
          snowfallSum: number;
          waveHeightMax: number | null;
        };
        activities: Array<{
          activity: string;
          score: number;
          reasons: string[];
        }>;
      }>;
    };

    expect(city.name).toBe("Zakopane");
    expect(city.country).toBe("Poland");
    expect(city.forecast).toHaveLength(7);
    expect(city.forecast[0]?.date).toBe("2026-10-01");
    expect(city.forecast[0]?.weather.snowfallSum).toBe(5);
    expect(city.forecast[0]?.weather.waveHeightMax).toBe(1.2);
    expect(city.forecast[0]?.activities.map((item) => item.activity)).toEqual([
      "skiing",
      "surfing",
      "outdoor_sightseeing",
      "indoor_sightseeing",
    ]);

    for (const day of city.forecast) {
      for (const activity of day.activities) {
        expect(activity.score).toBeGreaterThanOrEqual(0);
        expect(activity.score).toBeLessThanOrEqual(100);
        expect(activity.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns CITY_NOT_FOUND for unknown cities", async () => {
    const yoga = createTestYoga({
      geocoding: createGeocodingMock([]),
    });

    const { body } = await executeGraphQL({
      yoga: yoga as never,
      query: CITY_QUERY,
      variables: { name: "DefinitelyNotACityXYZ" },
    });

    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message).toContain("No city found");
    expect(body.errors?.[0]?.extensions?.code).toBe("CITY_NOT_FOUND");
  });

  it("returns EXTERNAL_PROVIDER_ERROR when provider refresh fails without cache", async () => {
    const yoga = createTestYoga({
      forecast: createForecastMock(() => {
        throw new OpenMeteoError("forecast down", "http", { status: 503 });
      }),
    });

    const { body } = await executeGraphQL({
      yoga: yoga as never,
      query: CITY_QUERY,
      variables: { name: "Zakopane" },
    });

    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.extensions?.code).toBe("EXTERNAL_PROVIDER_ERROR");
  });

  it("falls back to persisted forecast when refresh fails", async () => {
    const cities = createMemoryCityRepository();
    const forecasts = createMemoryForecastRepository();
    const fromDate = "2026-10-01";
    const now = new Date("2026-10-01T10:00:00.000Z");

    const warmService = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast: createForecastMock(sevenWeatherDays(fromDate)),
      marine: createMarineMock(sevenMarineDays(fromDate)),
      cities,
      forecasts,
      now: () => now,
    });

    await warmService.getCityForecastByName("Zakopane");

    const forecastMock = createForecastMock(() => {
      throw new OpenMeteoError("forecast down", "timeout");
    });
    const getDailyForecast = vi.spyOn(forecastMock, "getDailyForecast");

    const staleService = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast: forecastMock,
      marine: createMarineMock(sevenMarineDays(fromDate)),
      cities,
      forecasts,
      now: () => new Date("2026-10-01T20:00:00.000Z"),
      freshnessMs: 1,
    });

    const yoga = createYoga<GraphQLContext>({
      schema,
      context: () => ({ cityForecastService: staleService }),
    });

    const { body } = await executeGraphQL({
      yoga: yoga as never,
      query: CITY_QUERY,
      variables: { name: "Zakopane" },
    });

    expect(getDailyForecast).toHaveBeenCalled();
    expect(body.errors).toBeUndefined();
    const city = body.data?.city as { forecast: unknown[] };
    expect(city.forecast).toHaveLength(7);
  });

  it("keeps health query working", async () => {
    const yoga = createTestYoga();
    const { body } = await executeGraphQL({
      yoga: yoga as never,
      query: "{ health }",
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.health).toBe("ok");
  });
});
