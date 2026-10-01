import { describe, expect, it } from "vitest";
import {
  createMarineClient,
  mapMarineResponse,
  MARINE_DAILY_VARIABLES,
} from "../../../src/weather/open-meteo/index.js";
import {
  createMockHttpGet,
  expectOpenMeteoError,
  jsonResponse,
} from "./test-helpers.js";

const validMarineBody = {
  latitude: 54.541664,
  longitude: 10.2083435,
  timezone: "Europe/Berlin",
  daily: {
    time: ["2026-10-01", "2026-10-02"],
    wave_height_max: [0.7, 0.14],
    wave_period_max: [3.7, 2.7],
  },
};

describe("Open-Meteo marine client", () => {
  it("maps a successful daily marine response", async () => {
    const httpGet = createMockHttpGet((url) => {
      expect(url.origin).toBe("https://marine-api.open-meteo.com");
      expect(url.pathname).toBe("/v1/marine");
      expect(url.searchParams.get("daily")).toBe(
        MARINE_DAILY_VARIABLES.join(","),
      );
      expect(url.searchParams.get("forecast_days")).toBe("7");
      expect(url.searchParams.get("timezone")).toBe("auto");
      expect(url.searchParams.get("cell_selection")).toBe("sea");

      return jsonResponse(validMarineBody);
    });

    const client = createMarineClient({ httpGet });
    const forecast = await client.getDailyMarineForecast({
      latitude: 54.54,
      longitude: 10.23,
    });

    expect(forecast).toEqual({
      latitude: 54.541664,
      longitude: 10.2083435,
      timezone: "Europe/Berlin",
      days: [
        {
          date: "2026-10-01",
          waveHeightMaxM: 0.7,
          wavePeriodMaxS: 3.7,
        },
        {
          date: "2026-10-02",
          waveHeightMaxM: 0.14,
          wavePeriodMaxS: 2.7,
        },
      ],
    });
  });

  it("preserves null marine values instead of inventing numbers", async () => {
    const client = createMarineClient({
      httpGet: createMockHttpGet(() =>
        jsonResponse({
          latitude: 52.52,
          longitude: 13.41,
          timezone: "Europe/Berlin",
          daily: {
            time: ["2026-10-01"],
            wave_height_max: [null],
            wave_period_max: [null],
          },
        }),
      ),
    });

    const forecast = await client.getDailyMarineForecast({
      latitude: 52.52,
      longitude: 13.41,
    });

    expect(forecast.days).toEqual([
      {
        date: "2026-10-01",
        waveHeightMaxM: null,
        wavePeriodMaxS: null,
      },
    ]);
  });

  it("throws on HTTP failures", async () => {
    const client = createMarineClient({
      httpGet: createMockHttpGet(() =>
        jsonResponse(
          {
            error: true,
            reason: "Cannot initialize WeatherVariable from invalid String value",
          },
          { status: 400 },
        ),
      ),
    });

    await expectOpenMeteoError(
      client.getDailyMarineForecast({ latitude: 54.54, longitude: 10.23 }),
      {
        kind: "provider",
        status: 400,
      },
    );
  });

  it("throws when required marine series are missing", () => {
    expect(() =>
      mapMarineResponse({
        latitude: 54.54,
        longitude: 10.23,
        timezone: "Europe/Berlin",
        daily: {
          time: ["2026-10-01"],
          wave_height_max: [1.2],
          // wave_period_max missing
        },
      }),
    ).toThrow(/wave_period_max/);
  });

  it("throws when marine series contain invalid values", () => {
    expect(() =>
      mapMarineResponse({
        latitude: 54.54,
        longitude: 10.23,
        timezone: "Europe/Berlin",
        daily: {
          time: ["2026-10-01"],
          wave_height_max: ["tall"],
          wave_period_max: [3],
        },
      }),
    ).toThrow(/wave_height_max/);
  });
});
