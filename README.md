# Weather Activity Ranking

Backend service that ranks the next 7 days for skiing, surfing,
outdoor sightseeing, and indoor sightseeing based on Open-Meteo data.

## Stack

- Node.js + TypeScript
- GraphQL Yoga
- PostgreSQL + Prisma
- Vitest
- Docker Compose

## Prerequisites

- Node.js 22+
- Docker / Docker Compose

## Setup

```bash
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
```

## Development

```bash
npm run dev
```

GraphQL endpoint: `http://localhost:4000/graphql`

Health check query:

```graphql
query {
  health
}
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the GraphQL server with reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run db:up` | Start PostgreSQL via Docker Compose |
| `npm run db:down` | Stop PostgreSQL |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create/apply Prisma migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## Project layout

```text
src/
  index.ts              # HTTP + GraphQL Yoga entrypoint
  graphql/schema.ts     # GraphQL schema (health query for now)
  db/prisma.ts          # Prisma client
prisma/
  schema.prisma         # Database schema
tests/
  health.test.ts        # Health query smoke test
```

> Work in progress. Open-Meteo integration, activity scoring, and the final GraphQL schema are not implemented yet.
