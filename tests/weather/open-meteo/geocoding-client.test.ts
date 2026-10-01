import { describe, expect, it } from "vitest";
import {
  createGeocodingClient,
  mapGeocodingResponse,
} from "../../../src/weather/open-meteo/index.js";
import {
  createMockHttpGet,
  expectOpenMeteoError,
  jsonResponse,
} from "./test-helpers.js";

describe("Open-Meteo geocoding client", () => {
  it("maps a successful search response to domain locations", async () => {
    const httpGet = createMockHttpGet((url) => {
      expect(url.origin).toBe("https://geocoding-api.open-meteo.com");
      expect(url.pathname).toBe("/v1/search");
      expect(url.searchParams.get("name")).toBe("Berlin");
      expect(url.searchParams.get("count")).toBe("1");
      expect(url.searchParams.get("language")).toBe("en");

      return jsonResponse({
        results: [
          {
            id: 2950159,
            name: "Berlin",
            latitude: 52.52437,
            longitude: 13.41053,
            elevation: 74.0,
            country_code: "DE",
            country: "Germany",
            admin1: "State of Berlin",
            timezone: "Europe/Berlin",
            population: 3426354,
          },
        ],
      });
    });

    const client = createGeocodingClient({ httpGet });
    const results = await client.search({ name: "Berlin", count: 1 });

    expect(results).toEqual([
      {
        id: 2950159,
        name: "Berlin",
        latitude: 52.52437,
        longitude: 13.41053,
        countryCode: "DE",
        country: "Germany",
        admin1: "State of Berlin",
        timezone: "Europe/Berlin",
        elevationMeters: 74.0,
        population: 3426354,
      },
    ]);
  });

  it("returns an empty list when the provider omits results", async () => {
    const client = createGeocodingClient({
      httpGet: createMockHttpGet(() =>
        jsonResponse({ generationtime_ms: 0.1 }),
      ),
    });

    await expect(client.search({ name: "zzzz" })).resolves.toEqual([]);
  });

  it("throws on HTTP failures", async () => {
    const client = createGeocodingClient({
      httpGet: createMockHttpGet(() =>
        jsonResponse(
          { error: true, reason: "Parameter count must be between 1 and 100." },
          { status: 400 },
        ),
      ),
    });

    await expectOpenMeteoError(client.search({ name: "Berlin", count: 999 }), {
      kind: "provider",
      status: 400,
      messageIncludes: "Parameter count must be between 1 and 100.",
    });
  });

  it("throws when a result is missing required fields", () => {
    expect(() =>
      mapGeocodingResponse({
        results: [
          {
            id: 1,
            name: "Broken",
            latitude: 1,
            // longitude missing
          },
        ],
      }),
    ).toThrow(/longitude/);
  });

  it("throws on malformed JSON payloads", async () => {
    const client = createGeocodingClient({
      httpGet: createMockHttpGet(
        () =>
          new Response("not-json", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    });

    await expectOpenMeteoError(client.search({ name: "Berlin" }), {
      kind: "invalid_response",
      status: 200,
    });
  });
});
