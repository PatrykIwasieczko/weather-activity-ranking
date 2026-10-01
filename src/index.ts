import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { createCityForecastService } from "./app/index.js";
import { prisma } from "./db/prisma.js";
import type { GraphQLContext } from "./graphql/context.js";
import { schema } from "./graphql/schema.js";
import {
  createCityRepository,
  createForecastRepository,
} from "./persistence/index.js";
import {
  createForecastClient,
  createGeocodingClient,
  createMarineClient,
} from "./weather/open-meteo/index.js";

const port = Number(process.env.PORT ?? 4000);

const cityForecastService = createCityForecastService({
  geocoding: createGeocodingClient(),
  forecast: createForecastClient(),
  marine: createMarineClient(),
  cities: createCityRepository(prisma),
  forecasts: createForecastRepository(prisma),
});

const yoga = createYoga<GraphQLContext>({
  schema,
  context: (): GraphQLContext => ({
    cityForecastService,
  }),
});

const server = createServer(yoga);

server.listen(port, () => {
  console.info(`GraphQL server ready at http://localhost:${port}/graphql`);
});
