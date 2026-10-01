import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createCityRepository,
  createForecastRepository,
  type UpsertCityInput,
  type UpsertDailyForecastInput,
} from "../../src/persistence/index.js";

const prisma = new PrismaClient();
const cities = createCityRepository(prisma);
const forecasts = createForecastRepository(prisma);

const berlin: UpsertCityInput = {
  openMeteoId: 2950159,
  name: "Berlin",
  latitude: 52.52437,
  longitude: 13.41053,
  countryCode: "DE",
  country: "Germany",
  admin1: "State of Berlin",
  timezone: "Europe/Berlin",
  elevationMeters: 74,
  population: 3426354,
};

function forecastDay(
  date: string,
  overrides: Partial<UpsertDailyForecastInput> = {},
): UpsertDailyForecastInput {
  return {
    date,
    fetchedAt: new Date("2026-10-01T12:00:00.000Z"),
    temperatureMaxC: 20,
    temperatureMinC: 10,
    precipitationSumMm: 0,
    snowfallSumCm: 0,
    windSpeedMaxKmh: 12,
    waveHeightMaxM: null,
    wavePeriodMaxS: null,
    ...overrides,
  };
}

describe("persistence repositories", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.dailyForecast.deleteMany();
    await prisma.city.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and finds a city by open-meteo id and name", async () => {
    const created = await cities.upsert(berlin);

    expect(created.id).toBeTruthy();
    expect(created.openMeteoId).toBe(2950159);
    expect(created.name).toBe("Berlin");

    await expect(cities.findByOpenMeteoId(2950159)).resolves.toEqual(created);
    await expect(cities.findById(created.id)).resolves.toEqual(created);
    await expect(cities.findByName("berlin")).resolves.toMatchObject({
      id: created.id,
      name: "Berlin",
    });
  });

  it("updates an existing city on upsert", async () => {
    const created = await cities.upsert(berlin);
    const updated = await cities.upsert({
      ...berlin,
      population: 3_500_000,
      name: "Berlin",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.population).toBe(3_500_000);

    const rows = await prisma.city.count();
    expect(rows).toBe(1);
  });

  it("upserts forecast rows and retrieves a 7-day window", async () => {
    const city = await cities.upsert(berlin);
    const fetchedAt = new Date("2026-10-01T08:00:00.000Z");

    const days = Array.from({ length: 7 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return forecastDay(`2026-10-${day}`, {
        fetchedAt,
        temperatureMaxC: 15 + index,
        waveHeightMaxM: index === 0 ? null : 0.5 + index * 0.1,
        wavePeriodMaxS: index === 0 ? null : 3 + index * 0.2,
      });
    });

    const saved = await forecasts.upsertMany({
      cityId: city.id,
      forecasts: days,
    });

    expect(saved).toHaveLength(7);
    expect(saved[0]).toMatchObject({
      date: "2026-10-01",
      waveHeightMaxM: null,
      wavePeriodMaxS: null,
      fetchedAt,
    });
    expect(saved[1]).toMatchObject({
      date: "2026-10-02",
      waveHeightMaxM: 0.6,
      wavePeriodMaxS: 3.2,
    });

    const window = await forecasts.findForCityRange({
      cityId: city.id,
      fromDate: "2026-10-01",
      dayCount: 7,
    });

    expect(window.map((row) => row.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
  });

  it("updates existing city/date forecasts on upsert", async () => {
    const city = await cities.upsert(berlin);

    await forecasts.upsertMany({
      cityId: city.id,
      forecasts: [
        forecastDay("2026-10-01", {
          precipitationSumMm: 1,
          fetchedAt: new Date("2026-10-01T08:00:00.000Z"),
        }),
      ],
    });

    const refreshedAt = new Date("2026-10-01T14:00:00.000Z");
    const [updated] = await forecasts.upsertMany({
      cityId: city.id,
      forecasts: [
        forecastDay("2026-10-01", {
          precipitationSumMm: 5.5,
          snowfallSumCm: 2,
          fetchedAt: refreshedAt,
          waveHeightMaxM: 1.2,
          wavePeriodMaxS: 8,
        }),
      ],
    });

    expect(updated?.precipitationSumMm).toBe(5.5);
    expect(updated?.snowfallSumCm).toBe(2);
    expect(updated?.fetchedAt).toEqual(refreshedAt);
    expect(updated?.waveHeightMaxM).toBe(1.2);
    expect(updated?.wavePeriodMaxS).toBe(8);

    const count = await prisma.dailyForecast.count({
      where: { cityId: city.id },
    });
    expect(count).toBe(1);
  });

  it("enforces uniqueness of city/date pairs", async () => {
    const city = await cities.upsert(berlin);
    const date = parseDateOnlyForTest("2026-10-01");

    await prisma.dailyForecast.create({
      data: {
        cityId: city.id,
        date,
        fetchedAt: new Date(),
        temperatureMaxC: 1,
        temperatureMinC: 0,
        precipitationSumMm: 0,
        snowfallSumCm: 0,
        windSpeedMaxKmh: 1,
      },
    });

    await expect(
      prisma.dailyForecast.create({
        data: {
          cityId: city.id,
          date,
          fetchedAt: new Date(),
          temperatureMaxC: 2,
          temperatureMinC: 0,
          precipitationSumMm: 0,
          snowfallSumCm: 0,
          windSpeedMaxKmh: 1,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

function parseDateOnlyForTest(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}
