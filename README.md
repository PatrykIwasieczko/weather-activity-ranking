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

Example query:

```graphql
query {
  city(name: "Zakopane") {
    name
    country
    latitude
    longitude
    timezone
    forecast {
      date
      weather {
        temperatureMin
        temperatureMax
        precipitationSum
        snowfallSum
        windSpeedMax
        waveHeightMax
        wavePeriodMax
      }
      activities {
        activity
        score
        reasons
      }
    }
  }
}
```

Health check:

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
  index.ts
  app/                     # City forecast orchestration service
  graphql/                 # Schema + resolvers (transport only)
  db/prisma.ts
  weather/open-meteo/
  persistence/
  activities/
prisma/
  schema.prisma
tests/
```

The GraphQL `city` query looks up a persisted city/forecast first. Fresh 7-day data (≤ 6 hours) is returned without calling Open-Meteo. Missing or stale data is refreshed synchronously, persisted, and then returned. If refresh fails but an older complete forecast exists, that forecast is returned.

Known MVP limitation: concurrent requests for the same stale city can cause duplicate Open-Meteo calls.
