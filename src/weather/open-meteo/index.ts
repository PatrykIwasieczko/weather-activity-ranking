export { OpenMeteoError, type OpenMeteoErrorKind } from "./errors.js";
export {
  createGeocodingClient,
  mapGeocodingResponse,
  type GeocodingClient,
  type GeocodingSearchParams,
} from "./geocoding-client.js";
export {
  createForecastClient,
  mapForecastResponse,
  type ForecastClient,
  type ForecastRequestParams,
} from "./forecast-client.js";
export {
  createMarineClient,
  mapMarineResponse,
  type MarineClient,
  type MarineRequestParams,
} from "./marine-client.js";
export {
  defaultHttpGet,
  type HttpGet,
  type OpenMeteoRequestOptions,
} from "./http.js";
export { FORECAST_DAILY_VARIABLES } from "./forecast-types.js";
export { MARINE_DAILY_VARIABLES } from "./marine-types.js";
