# Weather Activity Ranking

Backend service that accepts a city name and returns the **next 7 local calendar days** (today plus six) with normalized weather and heuristic suitability scores for:

- skiing
- surfing
- outdoor sightseeing
- indoor sightseeing

Weather comes from [Open-Meteo](https://open-meteo.com/). Forecasts are persisted in PostgreSQL and refreshed lazily when stale.

Scores are **not** professional weather, ski, or surf advice.

## Architecture overview

Modular monolith with clear boundaries:

```text
GraphQL (transport)
    → app/city-forecast-service (orchestration, refresh)
        → persistence (City, DailyForecast)
        → weather/open-meteo (Geocoding, Forecast, Marine clients)
        → activities (pure scoring)
```

- **GraphQL** resolves `city(name)` and maps errors; no scoring or HTTP to Open-Meteo in resolvers.
- **App service** geocodes when needed, checks freshness, refreshes Open-Meteo, persists, scores.
- **Persistence** stores normalized daily fields and `fetchedAt` per city/date.
- **Activities** are pure functions over `DailyConditions`.

## Technology stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 22+ (ESM, TypeScript strict) |
| API | GraphQL Yoga |
| Database | PostgreSQL 16 (Docker Compose) |
| ORM | Prisma 6.x |
| Tests | Vitest |
| External data | Open-Meteo Geocoding, Forecast, and Marine APIs |

## Prerequisites

- Node.js 22+
- Docker (Docker Desktop or engine) for local PostgreSQL

Ensure Docker is running before starting the API or running persistence tests.

## Environment variables

Copy the example file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `PORT` | HTTP port for GraphQL (default `4000`) |

Development uses Node’s built-in `--env-file=.env` (see `npm run dev` / `npm start`).

## Run PostgreSQL

```bash
npm run db:up
```

Stop:

```bash
npm run db:down
```

Default credentials match `.env.example` (`weather` / `weather`, database `weather_activity`, port `5432`).

## Migrations and Prisma client

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

Apply migrations against the database defined in `DATABASE_URL`.

## Start the service

Development (watch + reload):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

GraphQL endpoint: `http://localhost:4000/graphql`

Health check:

```graphql
query {
  health
}
```

## Run tests

```bash
npm run typecheck
npm test
```

Repository tests need PostgreSQL up (`npm run db:up`). Open-Meteo is mocked in unit tests.

## Example GraphQL query

```graphql
query CityForecast {
  city(name: "Warsaw") {
    name
    country
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

## Example response

Illustrative shape (values depend on Open-Meteo and when you query):

```json
{
  "data": {
    "city": {
      "name": "Warsaw",
      "country": "Poland",
      "timezone": "Europe/Warsaw",
      "forecast": [
        {
          "date": "2026-10-05",
          "weather": {
            "temperatureMin": 8.2,
            "temperatureMax": 15.1,
            "precipitationSum": 0.0,
            "snowfallSum": 0.0,
            "windSpeedMax": 18.4,
            "waveHeightMax": null,
            "wavePeriodMax": null
          },
          "activities": [
            {
              "activity": "skiing",
              "score": 0,
              "reasons": ["Temperatures are unsuitable for skiing"]
            },
            {
              "activity": "surfing",
              "score": 0,
              "reasons": ["Marine conditions are unavailable for this location"]
            },
            {
              "activity": "outdoor_sightseeing",
              "score": 72,
              "reasons": ["Dry conditions favor outdoor sightseeing"]
            },
            {
              "activity": "indoor_sightseeing",
              "score": 28,
              "reasons": ["Indoor sightseeing conditions look mixed"]
            }
          ]
        }
      ]
    }
  }
}
```

GraphQL returns seven days; the snippet shows one day for brevity.

### Error examples

| Situation | GraphQL extension code |
| --- | --- |
| Unknown city name | `CITY_NOT_FOUND` |
| Open-Meteo failure with no cached forecast | `EXTERNAL_PROVIDER_ERROR` |
| PostgreSQL unreachable | `INTERNAL_SERVER_ERROR` |

## Activity scoring overview

Each activity gets an integer **0–100** score and human-readable **reasons**.

| Activity | Main inputs | Weights (see `docs/scoring.md`) |
| --- | --- | --- |
| Skiing | snowfall, temperature, wind, non-snow precipitation | 40 / 25 / 20 / 15 |
| Surfing | wave height, wave period, wind | 50 / 30 / 20 |
| Outdoor sightseeing | temperature, precipitation, wind | 40 / 40 / 20 |
| Indoor sightseeing | precipitation, temperature (inverted comfort), wind | 60 / 30 / 10 |

Surfing requires both marine fields; if either is null, score is **0** with an explicit reason. Wind for surfing uses forecast `wind_speed_10m_max`, not the Marine API.

Skiing applies a warm-temperature viability gate so calm dry weather cannot produce a mid-range score on warm days without snow.

Implementation: `src/activities/`. Details and thresholds: [`docs/scoring.md`](docs/scoring.md).

## Forecast refresh behavior

1. Look up city by name in the database (case-insensitive).
2. If a **complete** 7-day window exists and every row’s `fetchedAt` is **≤ 6 hours** old, return it **without** calling Open-Meteo.
3. Otherwise fetch Forecast (+ Marine; marine failure is soft → null wave fields), upsert rows, score, return.
4. If refresh fails but a complete older window exists, return that stale data.
5. If refresh fails and there is no complete window, return `EXTERNAL_PROVIDER_ERROR`.

First request for a new city name geocodes via Open-Meteo (`count=1`, best match).

## Important assumptions

Documented in [`docs/assumptions.md`](docs/assumptions.md). Highlights:

- “7 days” = today + 6 following **local** calendar days (city timezone, or UTC if missing).
- City disambiguation uses the top geocoding result only (no country/region parameter).
- Normalized fields only in the database; raw Open-Meteo payloads are not stored.
- No cloud cover or precipitation probability in the API.
- Heuristic scores for ranking/explanation, not safety guidance.

## Known limitations

- **Concurrent stale refresh:** parallel requests for the same city can each hit Open-Meteo (no locks/queues).
- **Name aliases:** `"Krakow"` vs stored `"Kraków"` bypasses DB cache and re-geocodes.
- **Duplicate display names:** `findByName` returns the most recently updated matching row.
- **Inland / marine:** wave fields may be null; surfing scores 0.
- **Docker required locally:** API and DB tests fail if PostgreSQL is not running.
- **No mutations, auth, or frontend** in the MVP.

## Possible improvements (out of scope)

- Request coalescing or locking for refresh; background refresh jobs
- Geocoding by country/region; cache by `openMeteoId` after alias resolution
- Stale-data age surfaced in GraphQL; structured logging/metrics
- Configurable scoring thresholds; snowpack / resort models for skiing
- Map Prisma/DB errors to a dedicated client-facing error code
- Rate limiting and production hardening

## Documentation

- [`docs/assumptions.md`](docs/assumptions.md) — product assumptions
- [`docs/scoring.md`](docs/scoring.md) — scoring model and thresholds
- [`docs/decision-log.md`](docs/decision-log.md) — design evolution
- [`AGENTS.md`](AGENTS.md) — assignment constraints and architecture rules

## npm scripts

| Script | Description |
| --- | --- |
| `npm run dev` | GraphQL server with reload |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run compiled server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest |
| `npm run db:up` / `db:down` | Docker Compose PostgreSQL |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Apply migrations |
| `npm run prisma:studio` | Prisma Studio |
