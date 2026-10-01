/**
 * Provider-specific shapes for Open-Meteo Geocoding API responses.
 * Keep these separate from application domain types.
 *
 * Docs: https://open-meteo.com/en/docs/geocoding-api
 */
export type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
  generationtime_ms?: number;
};

export type OpenMeteoGeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  timezone?: string;
  population?: number;
  postcodes?: string[];
  country_id?: number;
  admin1_id?: number;
  admin2_id?: number;
  admin3_id?: number;
  admin4_id?: number;
};
