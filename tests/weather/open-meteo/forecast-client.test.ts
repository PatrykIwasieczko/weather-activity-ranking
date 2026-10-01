import { describe, expect, it } from "vitest";
import {
  createForecastClient,
  FORECAST_DAILY_VARIABLES,
  mapForecastResponse,
} from "../../../src/weather/open-meteo/index.js";
import {
  createMockHttpGet,
  expectOpenMeteoError,
  jsonResponse,
} from "./test-helpers.js";

const validForecastBody = {
  latitude: 52.52,
  longitude: 13.419998,
  timezone: "Europe/Berlin",
  daily: {
    time: ["2026-10-01", "2026-10-02"],
    temperature_2m_max: [24.6, 18.5],
    temperature_2m_min: [14.4, 14.8],
    precipitation_sum: [0.0, 0.4],
    snowfall_sum: [0.0, 0.0],
    wind_speed_10m_max: [12.4, 10.2],
  },
};

describe("Open-Meteo forecast client", () => {
  it("maps a successful daily forecast response", async () => {
    const httpGet = createMockHttpGet((url) => {
      expect(url.origin).toBe("https://api.open-meteo.com");
      expect(url.pathname).toBe("/v1/forecast");
      expect(url.searchParams.get("latitude")).toBe("52.52");
      expect(url.searchParams.get("longitude")).toBe("13.41");
      expect(url.searchParams.get("daily")).toBe(
        FORECAST_DAILY_VARIABLES.join(","),
      );
      expect(url.searchParams.get("forecast_days")).toBe("7");
      expect(url.searchParams.get("timezone")).toBe("auto");

      return jsonResponse(validForecastBody);
    });

    const client = createForecastClient({ httpGet });
    const forecast = await client.getDailyForecast({
      latitude: 52.52,
      longitude: 13.41,
    });

    expect(forecast).toEqual({
      latitude: 52.52,
      longitude: 13.419998,
      timezone: "Europe/Berlin",
      days: [
        {
          date: "2026-10-01",
          temperatureMaxC: 24.6,
          temperatureMinC: 14.4,
          precipitationSumMm: 0.0,
          snowfallSumCm: 0.0,
          windSpeedMaxKmh: 12.4,
        },
        {
          date: "2026-10-02",
          temperatureMaxC: 18.5,
          temperatureMinC: 14.8,
          precipitationSumMm: 0.4,
          snowfallSumCm: 0.0,
          windSpeedMaxKmh: 10.2,
        },
      ],
    });
  });

  it("throws on HTTP failures", async () => {
    const client = createForecastClient({
      httpGet: createMockHttpGet(() =>
        jsonResponse(
          {
            error: true,
            reason: "Latitude must be in range of -90 to 90°. Given: 999.0.",
          },
          { status: 400 },
        ),
      ),
    });

    await expectOpenMeteoError(
      client.getDailyForecast({ latitude: 999, longitude: 13.41 }),
      {
        kind: "provider",
        status: 400,
        messageIncludes: "Latitude must be in range",
      },
    );
  });

  it("throws when a required daily series is missing", () => {
    expect(() =>
      mapForecastResponse({
        latitude: 52.52,
        longitude: 13.41,
        timezone: "Europe/Berlin",
        daily: {
          time: ["2026-10-01"],
          temperature_2m_max: [20],
          temperature_2m_min: [10],
          precipitation_sum: [0],
          // snowfall_sum missing
          wind_speed_10m_max: [5],
        },
      }),
    ).toThrow(/snowfall_sum/);
  });

  it("throws when daily series lengths do not match", () => {
    expect(() =>
      mapForecastResponse({
        ...validForecastBody,
        daily: {
          ...validForecastBody.daily,
          precipitation_sum: [0.0],
        },
      }),
    ).toThrow(/precipitation_sum length/);
  });

  it("throws when request transport fails", async () => {
    const client = createForecastClient({
      httpGet: createMockHttpGet(() => {
        throw new TypeError("network down");
      }),
    });

    await expectOpenMeteoError(
      client.getDailyForecast({ latitude: 52.52, longitude: 13.41 }),
      {
        kind: "http",
        messageIncludes: "Open-Meteo request failed",
      },
    );
  });
});
