import { describe, expect, it, vi } from "vitest";
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

const FROM_DATE = "2026-10-01";
const FRESH_NOW = new Date("2026-10-01T10:00:00.000Z");
const LATER_SAME_DAY = new Date("2026-10-01T12:00:00.000Z");
const STALE_NOW = new Date("2026-10-01T17:00:00.000Z"); // +7h from fetchedAt at 10:00

async function seedFreshCityForecast(options?: {
  fetchedAt?: Date;
  temperatureMaxC?: number;
}) {
  const cities = createMemoryCityRepository();
  const forecasts = createMemoryForecastRepository();
  const location = zakopaneLocation();
  const fetchedAt = options?.fetchedAt ?? FRESH_NOW;

  const city = await cities.upsert({
    openMeteoId: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    countryCode: location.countryCode,
    country: location.country,
    admin1: location.admin1,
    timezone: location.timezone,
    elevationMeters: location.elevationMeters,
    population: location.population,
  });

  const days = sevenWeatherDays(FROM_DATE).map((day, index) => ({
    ...day,
    temperatureMaxC: options?.temperatureMaxC ?? day.temperatureMaxC,
    fetchedAt,
    waveHeightMaxM: 1.2,
    wavePeriodMaxS: 8 + index * 0.1,
  }));

  await forecasts.upsertMany({ cityId: city.id, forecasts: days });

  return { cities, forecasts, city };
}

describe("lazy forecast refresh", () => {
  it("uses a fresh persisted forecast without calling Open-Meteo", async () => {
    const { cities, forecasts } = await seedFreshCityForecast();

    const geocoding = createGeocodingMock([zakopaneLocation()]);
    const forecast = createForecastMock(sevenWeatherDays(FROM_DATE));
    const marine = createMarineMock(sevenMarineDays(FROM_DATE));

    const search = vi.spyOn(geocoding, "search");
    const getDailyForecast = vi.spyOn(forecast, "getDailyForecast");
    const getDailyMarineForecast = vi.spyOn(marine, "getDailyMarineForecast");

    const service = createCityForecastService({
      geocoding,
      forecast,
      marine,
      cities,
      forecasts,
      now: () => LATER_SAME_DAY,
    });

    const result = await service.getCityForecastByName("Zakopane");

    expect(result.forecast).toHaveLength(7);
    expect(search).not.toHaveBeenCalled();
    expect(getDailyForecast).not.toHaveBeenCalled();
    expect(getDailyMarineForecast).not.toHaveBeenCalled();
  });

  it("refreshes when the persisted forecast is stale", async () => {
    const { cities, forecasts } = await seedFreshCityForecast({
      fetchedAt: FRESH_NOW,
      temperatureMaxC: 1,
    });

    const forecast = createForecastMock(
      sevenWeatherDays(FROM_DATE).map((day) => ({
        ...day,
        temperatureMaxC: 25,
      })),
    );
    const getDailyForecast = vi.spyOn(forecast, "getDailyForecast");
    const geocoding = createGeocodingMock([zakopaneLocation()]);
    const search = vi.spyOn(geocoding, "search");

    const service = createCityForecastService({
      geocoding,
      forecast,
      marine: createMarineMock(sevenMarineDays(FROM_DATE)),
      cities,
      forecasts,
      now: () => STALE_NOW,
    });

    const result = await service.getCityForecastByName("Zakopane");

    expect(search).not.toHaveBeenCalled();
    expect(getDailyForecast).toHaveBeenCalledTimes(1);
    expect(result.forecast[0]?.weather.temperatureMaxC).toBe(25);
  });

  it("fetches and persists when no forecast exists yet", async () => {
    const cities = createMemoryCityRepository();
    const forecasts = createMemoryForecastRepository();
    const forecast = createForecastMock(sevenWeatherDays(FROM_DATE));
    const getDailyForecast = vi.spyOn(forecast, "getDailyForecast");

    const service = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast,
      marine: createMarineMock(sevenMarineDays(FROM_DATE)),
      cities,
      forecasts,
      now: () => FRESH_NOW,
    });

    const result = await service.getCityForecastByName("Zakopane");

    expect(getDailyForecast).toHaveBeenCalledTimes(1);
    expect(result.forecast).toHaveLength(7);
    expect(forecasts.store).toHaveLength(7);
  });

  it("persists the refreshed forecast after a successful refresh", async () => {
    const { cities, forecasts, city } = await seedFreshCityForecast({
      fetchedAt: FRESH_NOW,
      temperatureMaxC: 3,
    });

    const service = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast: createForecastMock(
        sevenWeatherDays(FROM_DATE).map((day) => ({
          ...day,
          temperatureMaxC: 18,
        })),
      ),
      marine: createMarineMock(sevenMarineDays(FROM_DATE)),
      cities,
      forecasts,
      now: () => STALE_NOW,
    });

    await service.getCityForecastByName("Zakopane");

    const stored = await forecasts.findForCityRange({
      cityId: city.id,
      fromDate: FROM_DATE,
      dayCount: 7,
    });

    expect(stored).toHaveLength(7);
    expect(stored[0]?.temperatureMaxC).toBe(18);
    expect(stored[0]?.fetchedAt).toEqual(STALE_NOW);
  });

  it("returns existing data when refresh fails but a complete forecast exists", async () => {
    const { cities, forecasts } = await seedFreshCityForecast({
      fetchedAt: FRESH_NOW,
      temperatureMaxC: 11,
    });

    const forecast = createForecastMock(() => {
      throw new OpenMeteoError("forecast down", "timeout");
    });
    const getDailyForecast = vi.spyOn(forecast, "getDailyForecast");

    const service = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast,
      marine: createMarineMock(sevenMarineDays(FROM_DATE)),
      cities,
      forecasts,
      now: () => STALE_NOW,
    });

    const result = await service.getCityForecastByName("Zakopane");

    expect(getDailyForecast).toHaveBeenCalledTimes(1);
    expect(result.forecast).toHaveLength(7);
    expect(result.forecast[0]?.weather.temperatureMaxC).toBe(11);
  });

  it("errors when refresh fails and no complete forecast exists", async () => {
    const cities = createMemoryCityRepository();
    const forecasts = createMemoryForecastRepository();

    const service = createCityForecastService({
      geocoding: createGeocodingMock([zakopaneLocation()]),
      forecast: createForecastMock(() => {
        throw new OpenMeteoError("forecast down", "http", { status: 503 });
      }),
      marine: createMarineMock(sevenMarineDays(FROM_DATE)),
      cities,
      forecasts,
      now: () => FRESH_NOW,
    });

    await expect(service.getCityForecastByName("Zakopane")).rejects.toMatchObject({
      code: "EXTERNAL_PROVIDER_ERROR",
    });
    expect(forecasts.store).toHaveLength(0);
  });
});
