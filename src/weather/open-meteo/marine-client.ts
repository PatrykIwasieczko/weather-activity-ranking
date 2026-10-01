import type {
  DailyMarineConditions,
  GeoCoordinates,
  MarineForecast,
} from "../domain.js";
import { OpenMeteoError } from "./errors.js";
import {
  isNullableNumberArray,
  isRecord,
  isStringArray,
  requestOpenMeteoJson,
  requireFiniteNumber,
  requireString,
  type OpenMeteoRequestOptions,
} from "./http.js";
import {
  MARINE_DAILY_VARIABLES,
  type OpenMeteoMarineResponse,
} from "./marine-types.js";

const MARINE_BASE_URL = "https://marine-api.open-meteo.com/v1/marine";
const DEFAULT_FORECAST_DAYS = 7;

export type MarineRequestParams = GeoCoordinates & {
  timezone?: string;
  forecastDays?: number;
};

export type MarineClient = {
  getDailyMarineForecast: (
    params: MarineRequestParams,
  ) => Promise<MarineForecast>;
};

export function createMarineClient(
  options: OpenMeteoRequestOptions = {},
): MarineClient {
  return {
    async getDailyMarineForecast(params) {
      const forecastDays = params.forecastDays ?? DEFAULT_FORECAST_DAYS;
      if (!Number.isInteger(forecastDays) || forecastDays < 1) {
        throw new OpenMeteoError(
          "forecastDays must be a positive integer",
          "provider",
        );
      }

      const url = new URL(MARINE_BASE_URL);
      url.searchParams.set("latitude", String(params.latitude));
      url.searchParams.set("longitude", String(params.longitude));
      url.searchParams.set("daily", MARINE_DAILY_VARIABLES.join(","));
      url.searchParams.set("forecast_days", String(forecastDays));
      url.searchParams.set("timezone", params.timezone ?? "auto");
      // Prefer sea grid cells when coordinates are near a coast.
      url.searchParams.set("cell_selection", "sea");

      const body = await requestOpenMeteoJson(url, options);
      return mapMarineResponse(body);
    },
  };
}

export function mapMarineResponse(body: unknown): MarineForecast {
  if (!isRecord(body)) {
    throw new OpenMeteoError(
      "Open-Meteo marine response must be an object",
      "invalid_response",
    );
  }

  if (!isRecord(body.daily)) {
    throw new OpenMeteoError(
      "Open-Meteo marine response missing daily object",
      "invalid_response",
    );
  }

  const response = body as OpenMeteoMarineResponse;
  const daily = response.daily;

  if (!isStringArray(daily.time)) {
    throw new OpenMeteoError(
      "Open-Meteo marine daily.time must be a string array",
      "invalid_response",
    );
  }

  const waveHeightMax = requireNullableNumberSeries(
    daily.wave_height_max,
    "daily.wave_height_max",
    daily.time.length,
  );
  const wavePeriodMax = requireNullableNumberSeries(
    daily.wave_period_max,
    "daily.wave_period_max",
    daily.time.length,
  );

  const days: DailyMarineConditions[] = daily.time.map((date, index) => ({
    date,
    waveHeightMaxM: waveHeightMax[index] ?? null,
    wavePeriodMaxS: wavePeriodMax[index] ?? null,
  }));

  return {
    latitude: requireFiniteNumber(response.latitude, "latitude"),
    longitude: requireFiniteNumber(response.longitude, "longitude"),
    timezone: requireString(response.timezone, "timezone"),
    days,
  };
}

function requireNullableNumberSeries(
  value: unknown,
  fieldName: string,
  expectedLength: number,
): Array<number | null> {
  if (!isNullableNumberArray(value)) {
    throw new OpenMeteoError(
      `Open-Meteo marine ${fieldName} must be an array of numbers or null`,
      "invalid_response",
    );
  }

  if (value.length !== expectedLength) {
    throw new OpenMeteoError(
      `Open-Meteo marine ${fieldName} length (${value.length}) does not match daily.time (${expectedLength})`,
      "invalid_response",
    );
  }

  if (
    value.some(
      (item) => item !== null && !Number.isFinite(item),
    )
  ) {
    throw new OpenMeteoError(
      `Open-Meteo marine ${fieldName} contains non-finite values`,
      "invalid_response",
    );
  }

  return value;
}
