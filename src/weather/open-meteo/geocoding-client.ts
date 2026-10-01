import type { GeocodedLocation } from "../domain.js";
import { OpenMeteoError } from "./errors.js";
import type { OpenMeteoGeocodingResponse } from "./geocoding-types.js";
import {
  isRecord,
  requestOpenMeteoJson,
  requireFiniteNumber,
  requireString,
  type OpenMeteoRequestOptions,
} from "./http.js";

const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export type GeocodingSearchParams = {
  name: string;
  count?: number;
  language?: string;
};

export type GeocodingClient = {
  search: (params: GeocodingSearchParams) => Promise<GeocodedLocation[]>;
};

export function createGeocodingClient(
  options: OpenMeteoRequestOptions = {},
): GeocodingClient {
  return {
    async search(params) {
      const trimmedName = params.name.trim();
      if (trimmedName.length === 0) {
        throw new OpenMeteoError(
          "Geocoding search name must not be empty",
          "provider",
        );
      }

      const url = new URL(GEOCODING_BASE_URL);
      url.searchParams.set("name", trimmedName);
      url.searchParams.set("count", String(params.count ?? 10));
      url.searchParams.set("language", params.language ?? "en");

      const body = await requestOpenMeteoJson(url, options);
      return mapGeocodingResponse(body);
    },
  };
}

export function mapGeocodingResponse(body: unknown): GeocodedLocation[] {
  if (!isRecord(body)) {
    throw new OpenMeteoError(
      "Open-Meteo geocoding response must be an object",
      "invalid_response",
    );
  }

  const response = body as OpenMeteoGeocodingResponse;

  if (response.results === undefined) {
    return [];
  }

  if (!Array.isArray(response.results)) {
    throw new OpenMeteoError(
      "Open-Meteo geocoding response.results must be an array when present",
      "invalid_response",
    );
  }

  return response.results.map((result, index) =>
    mapGeocodingResult(result, index),
  );
}

function mapGeocodingResult(
  result: unknown,
  index: number,
): GeocodedLocation {
  if (!isRecord(result)) {
    throw new OpenMeteoError(
      `Open-Meteo geocoding result at index ${index} must be an object`,
      "invalid_response",
    );
  }

  return {
    id: requireFiniteNumber(result.id, `results[${index}].id`),
    name: requireString(result.name, `results[${index}].name`),
    latitude: requireFiniteNumber(
      result.latitude,
      `results[${index}].latitude`,
    ),
    longitude: requireFiniteNumber(
      result.longitude,
      `results[${index}].longitude`,
    ),
    countryCode: optionalString(result.country_code),
    country: optionalString(result.country),
    admin1: optionalString(result.admin1),
    timezone: optionalString(result.timezone),
    elevationMeters: optionalNumber(result.elevation),
    population: optionalNumber(result.population),
  };
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
