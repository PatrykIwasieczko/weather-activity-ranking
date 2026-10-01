import { describe, expect, it } from "vitest";
import {
  createForecastClient,
  OpenMeteoError,
} from "../../src/weather/open-meteo/index.js";
import { createMockHttpGet } from "./open-meteo/test-helpers.js";

describe("Open-Meteo HTTP timeout handling", () => {
  it("maps abort/timeout errors to OpenMeteoError timeout kind", async () => {
    const client = createForecastClient({
      timeoutMs: 5,
      httpGet: createMockHttpGet((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("The operation was aborted due to timeout");
            error.name = "TimeoutError";
            reject(error);
          });
        });
      }),
    });

    await expect(
      client.getDailyForecast({ latitude: 52.52, longitude: 13.41 }),
    ).rejects.toMatchObject({
      name: "OpenMeteoError",
      kind: "timeout",
    } satisfies Partial<OpenMeteoError>);
  });
});
