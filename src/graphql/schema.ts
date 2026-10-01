import { createGraphQLError, createSchema } from "graphql-yoga";
import {
  CityNotFoundError,
  ExternalProviderError,
  type CityForecastResult,
} from "../app/index.js";
import type { GraphQLContext } from "./context.js";

export const typeDefs = /* GraphQL */ `
  enum Activity {
    skiing
    surfing
    outdoor_sightseeing
    indoor_sightseeing
  }

  type Query {
    """
    Basic liveness check for the GraphQL API.
    """
    health: String!

    """
    Resolve a city by name and return its next 7 local calendar days
    with normalized weather and activity scores.
    """
    city(name: String!): City!
  }

  type City {
    name: String!
    country: String
    latitude: Float!
    longitude: Float!
    timezone: String
    forecast: [DailyForecast!]!
  }

  type DailyForecast {
    """
    Local calendar date in YYYY-MM-DD form.
    """
    date: String!
    weather: Weather!
    activities: [ActivityScore!]!
  }

  """
  Normalized daily weather fields used by scoring.
  Cloud cover and precipitation probability are intentionally omitted
  from the MVP domain model.
  """
  type Weather {
    temperatureMin: Float!
    temperatureMax: Float!
    precipitationSum: Float!
    snowfallSum: Float!
    windSpeedMax: Float!
    waveHeightMax: Float
    wavePeriodMax: Float
  }

  type ActivityScore {
    activity: Activity!
    score: Int!
    reasons: [String!]!
  }
`;

export const resolvers = {
  Query: {
    health: (): string => "ok",

    city: async (
      _parent: unknown,
      args: { name: string },
      context: GraphQLContext,
    ) => {
      try {
        return await context.cityForecastService.getCityForecastByName(
          args.name,
        );
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
  },

  City: {
    name: (parent: CityForecastResult) => parent.city.name,
    country: (parent: CityForecastResult) => parent.city.country,
    latitude: (parent: CityForecastResult) => parent.city.latitude,
    longitude: (parent: CityForecastResult) => parent.city.longitude,
    timezone: (parent: CityForecastResult) => parent.city.timezone,
    forecast: (parent: CityForecastResult) => parent.forecast,
  },

  DailyForecast: {
    date: (parent: CityForecastResult["forecast"][number]) => parent.date,
    weather: (parent: CityForecastResult["forecast"][number]) => parent.weather,
    activities: (parent: CityForecastResult["forecast"][number]) =>
      parent.activities,
  },

  Weather: {
    temperatureMin: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.temperatureMinC,
    temperatureMax: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.temperatureMaxC,
    precipitationSum: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.precipitationSumMm,
    snowfallSum: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.snowfallSumCm,
    windSpeedMax: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.windSpeedMaxKmh,
    waveHeightMax: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.waveHeightMaxM,
    wavePeriodMax: (
      parent: CityForecastResult["forecast"][number]["weather"],
    ) => parent.wavePeriodMaxS,
  },
};

export const schema = createSchema<GraphQLContext>({
  typeDefs,
  resolvers,
});

function toGraphQLError(error: unknown): Error {
  if (error instanceof CityNotFoundError) {
    return createGraphQLError(error.message, {
      extensions: { code: error.code },
    });
  }

  if (error instanceof ExternalProviderError) {
    return createGraphQLError(error.message, {
      extensions: { code: error.code },
    });
  }

  return createGraphQLError("Unexpected server error", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
    originalError: error instanceof Error ? error : undefined,
  });
}
