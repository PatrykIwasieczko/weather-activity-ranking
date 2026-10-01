import { describe, expect, it } from "vitest";
import { createCityForecastService } from "../../src/app/index.js";
import { OpenMeteoError } from "../../src/weather/open-meteo/errors.js";
import {
  createForecastMock,
  createGeocodingMock,
  createMarineMock,
  createMemoryCityRepository,
  createMemoryForecastRepository,
  sevenMarineDays,
  sevenWeatherDays,
  zakopaneLocation,
} from "../graphql/test-helpers.js";

describe("city forecast service", () => {
  it("geocodes, persists, and scores a refreshed forecast", async () => {
    const service = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast: createForecastMock(sevenWeatherDays("2026-10-01")),
      marine: createMarineMock(sevenMarineDays("2026-10-01")),
      cities: createMemoryCityRepository(),
      forecasts: createMemoryForecastRepository(),
      now: () => new Date("2026-10-01T10:00:00.000Z"),
    });

    const result = await service.getCityForecastByName("Zakopane");

    expect(result.city.name).toBe("Zakopane");
    expect(result.forecast).toHaveLength(7);
    expect(result.forecast[0]?.activities).toHaveLength(4);
  });

  it("tolerates marine provider failure by storing null wave fields", async () => {
    const service = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast: createForecastMock(sevenWeatherDays("2026-10-01")),
      marine: createMarineMock("fail"),
      cities: createMemoryCityRepository(),
      forecasts: createMemoryForecastRepository(),
      now: () => new Date("2026-10-01T10:00:00.000Z"),
    });

    const result = await service.getCityForecastByName("Zakopane");
    expect(result.forecast[0]?.weather.waveHeightMaxM).toBeNull();
    expect(
      result.forecast[0]?.activities.find(
        (activity) => activity.activity === "surfing",
      )?.score,
    ).toBe(0);
  });

  it("throws when geocoding fails and no city can be resolved", async () => {
    const service = createCityForecastService({
      geocoding: createGeocodingMock(() => {
        throw new OpenMeteoError("geocoding down", "timeout");
      }),
      forecast: createForecastMock(sevenWeatherDays("2026-10-01")),
      marine: createMarineMock(sevenMarineDays("2026-10-01")),
      cities: createMemoryCityRepository(),
      forecasts: createMemoryForecastRepository(),
    });

    await expect(service.getCityForecastByName("Zakopane")).rejects.toMatchObject({
      code: "EXTERNAL_PROVIDER_ERROR",
    });
  });
});
