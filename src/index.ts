import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./graphql/schema.js";

const port = Number(process.env.PORT ?? 4000);

const yoga = createYoga({
  schema,
});

const server = createServer(yoga);

server.listen(port, () => {
  console.info(`GraphQL server ready at http://localhost:${port}/graphql`);
});
