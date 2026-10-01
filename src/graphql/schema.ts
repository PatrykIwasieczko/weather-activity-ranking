import { createSchema } from "graphql-yoga";

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      """
      Basic liveness check for the GraphQL API.
      """
      health: String!
    }
  `,
  resolvers: {
    Query: {
      health: (): string => "ok",
    },
  },
});
