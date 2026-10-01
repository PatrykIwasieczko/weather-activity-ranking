import type { DailyWeather, GeoCoordinates, WeatherForecast } from "../domain.js";
import { OpenMeteoError } from "./errors.js";
import {
  FORECAST_DAILY_VARIABLES,
  type OpenMeteoForecastResponse,
} from "./forecast-types.js";
import {
  isNumberArray,
  isRecord,
  isStringArray,
  requestOpenMeteoJson,
  requireFiniteNumber,
  requireString,
  type OpenMeteoRequestOptions,
} from "./http.js";

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_FORECAST_DAYS = 7;

export type ForecastRequestParams = GeoCoordinates & {
  timezone?: string;
  forecastDays?: number;
};

export type ForecastClient = {
  getDailyForecast: (
    params: ForecastRequestParams,
  ) => Promise<WeatherForecast>;
};

export function createForecastClient(
  options: OpenMeteoRequestOptions = {},
): ForecastClient {
  return {
    async getDailyForecast(params) {
      const forecastDays = params.forecastDays ?? DEFAULT_FORECAST_DAYS;
      if (!Number.isInteger(forecastDays) || forecastDays < 1) {
        throw new OpenMeteoError(
          "forecastDays must be a positive integer",
          "provider",
        );
      }

      const url = new URL(FORECAST_BASE_URL);
      url.searchParams.set("latitude", String(params.latitude));
      url.searchParams.set("longitude", String(params.longitude));
      url.searchParams.set("daily", FORECAST_DAILY_VARIABLES.join(","));
      url.searchParams.set("forecast_days", String(forecastDays));
      url.searchParams.set("timezone", params.timezone ?? "auto");

      const body = await requestOpenMeteoJson(url, options);
      return mapForecastResponse(body);
    },
  };
}

export function mapForecastResponse(body: unknown): WeatherForecast {
  if (!isRecord(body)) {
    throw new OpenMeteoError(
      "Open-Meteo forecast response must be an object",
      "invalid_response",
    );
  }

  if (!isRecord(body.daily)) {
    throw new OpenMeteoError(
      "Open-Meteo forecast response missing daily object",
      "invalid_response",
    );
  }

  const response = body as OpenMeteoForecastResponse;
  const daily = response.daily;

  if (!isStringArray(daily.time)) {
    throw new OpenMeteoError(
      "Open-Meteo forecast daily.time must be a string array",
      "invalid_response",
    );
  }

  const temperatureMax = requireNumberSeries(
    daily.temperature_2m_max,
    "daily.temperature_2m_max",
    daily.time.length,
  );
  const temperatureMin = requireNumberSeries(
    daily.temperature_2m_min,
    "daily.temperature_2m_min",
    daily.time.length,
  );
  const precipitationSum = requireNumberSeries(
    daily.precipitation_sum,
    "daily.precipitation_sum",
    daily.time.length,
  );
  const snowfallSum = requireNumberSeries(
    daily.snowfall_sum,
    "daily.snowfall_sum",
    daily.time.length,
  );
  const windSpeedMax = requireNumberSeries(
    daily.wind_speed_10m_max,
    "daily.wind_speed_10m_max",
    daily.time.length,
  );

  const days: DailyWeather[] = daily.time.map((date, index) => ({
    date,
    temperatureMaxC: temperatureMax[index]!,
    temperatureMinC: temperatureMin[index]!,
    precipitationSumMm: precipitationSum[index]!,
    snowfallSumCm: snowfallSum[index]!,
    windSpeedMaxKmh: windSpeedMax[index]!,
  }));

  return {
    latitude: requireFiniteNumber(response.latitude, "latitude"),
    longitude: requireFiniteNumber(response.longitude, "longitude"),
    timezone: requireString(response.timezone, "timezone"),
    days,
  };
}

function requireNumberSeries(
  value: unknown,
  fieldName: string,
  expectedLength: number,
): number[] {
  if (!isNumberArray(value)) {
    throw new OpenMeteoError(
      `Open-Meteo forecast ${fieldName} must be a number array`,
      "invalid_response",
    );
  }

  if (value.length !== expectedLength) {
    throw new OpenMeteoError(
      `Open-Meteo forecast ${fieldName} length (${value.length}) does not match daily.time (${expectedLength})`,
      "invalid_response",
    );
  }

  if (value.some((item) => !Number.isFinite(item))) {
    throw new OpenMeteoError(
      `Open-Meteo forecast ${fieldName} contains non-finite values`,
      "invalid_response",
    );
  }

  return value;
}
