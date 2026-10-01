import { addDays } from "../persistence/dates.js";
import type { DailyForecastRecord } from "../persistence/types.js";

export const FORECAST_DAYS = 7;
export const FRESHNESS_MS = 6 * 60 * 60 * 1000;

export function localDateString(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function forecastDateWindow(
  fromDate: string,
  dayCount = FORECAST_DAYS,
): string[] {
  return Array.from({ length: dayCount }, (_, index) => addDays(fromDate, index));
}

export function isCompleteForecastWindow(
  forecasts: ReadonlyArray<Pick<DailyForecastRecord, "date">>,
  fromDate: string,
  dayCount = FORECAST_DAYS,
): boolean {
  const expected = forecastDateWindow(fromDate, dayCount);
  if (forecasts.length !== expected.length) {
    return false;
  }

  const dates = new Set(forecasts.map((forecast) => forecast.date));
  return expected.every((date) => dates.has(date));
}

export function isFreshForecastWindow(
  forecasts: ReadonlyArray<Pick<DailyForecastRecord, "fetchedAt">>,
  now: Date,
  freshnessMs = FRESHNESS_MS,
): boolean {
  if (forecasts.length === 0) {
    return false;
  }

  return forecasts.every(
    (forecast) => now.getTime() - forecast.fetchedAt.getTime() <= freshnessMs,
  );
}
