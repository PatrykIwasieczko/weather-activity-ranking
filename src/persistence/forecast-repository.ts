import type { PrismaClient } from "@prisma/client";
import { addDays, parseDateOnly } from "./dates.js";
import { toDailyForecastRecord } from "./mappers.js";
import type {
  DailyForecastRecord,
  UpsertDailyForecastInput,
} from "./types.js";

const DEFAULT_FORECAST_DAYS = 7;

export type ForecastRepository = {
  /**
   * Returns persisted forecasts for `dayCount` local calendar days
   * starting at `fromDate` (inclusive), ordered by date ascending.
   */
  findForCityRange: (params: {
    cityId: string;
    fromDate: string;
    dayCount?: number;
  }) => Promise<DailyForecastRecord[]>;

  /**
   * Inserts or updates forecast rows for a city.
   * Existing city/date pairs are replaced with the provided values.
   */
  upsertMany: (params: {
    cityId: string;
    forecasts: UpsertDailyForecastInput[];
  }) => Promise<DailyForecastRecord[]>;
};

export function createForecastRepository(
  prisma: PrismaClient,
): ForecastRepository {
  return {
    async findForCityRange({ cityId, fromDate, dayCount = DEFAULT_FORECAST_DAYS }) {
      if (!Number.isInteger(dayCount) || dayCount < 1) {
        throw new Error("dayCount must be a positive integer");
      }

      const start = parseDateOnly(fromDate);
      const endExclusive = parseDateOnly(addDays(fromDate, dayCount));

      const rows = await prisma.dailyForecast.findMany({
        where: {
          cityId,
          date: {
            gte: start,
            lt: endExclusive,
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      return rows.map(toDailyForecastRecord);
    },

    async upsertMany({ cityId, forecasts }) {
      if (forecasts.length === 0) {
        return [];
      }

      const rows = await prisma.$transaction(
        forecasts.map((forecast) =>
          prisma.dailyForecast.upsert({
            where: {
              cityId_date: {
                cityId,
                date: parseDateOnly(forecast.date),
              },
            },
            create: {
              cityId,
              date: parseDateOnly(forecast.date),
              fetchedAt: forecast.fetchedAt,
              temperatureMaxC: forecast.temperatureMaxC,
              temperatureMinC: forecast.temperatureMinC,
              precipitationSumMm: forecast.precipitationSumMm,
              snowfallSumCm: forecast.snowfallSumCm,
              windSpeedMaxKmh: forecast.windSpeedMaxKmh,
              waveHeightMaxM: forecast.waveHeightMaxM,
              wavePeriodMaxS: forecast.wavePeriodMaxS,
            },
            update: {
              fetchedAt: forecast.fetchedAt,
              temperatureMaxC: forecast.temperatureMaxC,
              temperatureMinC: forecast.temperatureMinC,
              precipitationSumMm: forecast.precipitationSumMm,
              snowfallSumCm: forecast.snowfallSumCm,
              windSpeedMaxKmh: forecast.windSpeedMaxKmh,
              waveHeightMaxM: forecast.waveHeightMaxM,
              wavePeriodMaxS: forecast.wavePeriodMaxS,
            },
          }),
        ),
      );

      return rows
        .map(toDailyForecastRecord)
        .sort((left, right) => left.date.localeCompare(right.date));
    },
  };
}
