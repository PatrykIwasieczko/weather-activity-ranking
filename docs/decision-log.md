# Decision Log

This is a chronological record of significant engineering and product decisions made during implementation.

The purpose is to show how the system evolved, including decisions to defer or reject ideas.

---

## 2026-09-30 — Initial architecture

### Context

The assignment requires a Node.js + GraphQL backend that evaluates the next seven days for four activities using persisted Open-Meteo weather data.

### Decision

Use a modular monolith with:

- Node.js + TypeScript
- GraphQL Yoga
- PostgreSQL
- Prisma
- Vitest

Keep external APIs, persistence, GraphQL, and activity scoring separated.

### Reason

The problem is small enough that microservices or additional infrastructure would add complexity without providing meaningful value.

---

## 2026-09-30 — Persist normalized weather data

### Question

Should the raw Open-Meteo response be stored?

### Decision

Store normalized application-level weather fields.

### Reason

The application needs a stable internal representation independent of the provider's response format.

Raw provider responses can be added later if debugging or auditing requires them.

---

## 2026-09-30 — MVP refresh strategy

### Question

Should forecast refresh happen synchronously, through a background job, or through a hybrid mechanism?

### Decision

Start with lazy refresh.

A request checks the age of persisted data and refreshes it when stale.

### Reason

This is the smallest implementation that satisfies the persistence requirement.

### Deferred improvement

A hybrid strategy with scheduled refresh and stale-data fallback may be added after the core MVP works.

---

## 2026-09-30 — Activity scoring

### Decision

Use a 0–100 weighted score with human-readable reasons.

### Reason

A numeric score allows days to be ranked while factor-specific reasons make the result explainable.

### Assumption

The scoring model is heuristic and is not presented as professional activity or weather advice.

---

## 2026-09-30 — Project bootstrap versions

### Question

Which library versions should the MVP start from, given current npm defaults include Prisma 7/8 platform changes?

### Decision

Pin:

- Prisma ORM + Client `6.19.3`
- TypeScript `5.9.x`
- GraphQL Yoga `5.x`
- Vitest `5.x`
- PostgreSQL `16` via Docker Compose

Use ESM (`"type": "module"`), NodeNext module resolution, and Node's built-in `--env-file` instead of adding `dotenv`.

### Reason

Prisma 7+ moves connection config into `prisma.config.ts` and can require driver adapters / Accelerate for the client engine. That is unnecessary complexity for a local PostgreSQL MVP.

Prisma 6 keeps the classic `schema.prisma` + `DATABASE_URL` workflow expected for this exercise.

---

## 2026-10-01 — Open-Meteo daily fields for MVP

### Question

Which Open-Meteo variables should the integration layer request?

### Decision

Forecast API daily variables:

- `temperature_2m_max`
- `temperature_2m_min`
- `precipitation_sum`
- `snowfall_sum`
- `wind_speed_10m_max`

Marine API daily variables:

- `wave_height_max`
- `wave_period_max`

Request 7 local calendar days with `timezone=auto` (or the geocoded timezone when available later). Prefer `cell_selection=sea` for marine requests.

Keep provider response types under `src/weather/open-meteo/*-types.ts` and map into `src/weather/domain.ts`.

Inject an `HttpGet` function so tests can mock transport without calling the live API.

### Reason

These are the documented daily fields that cover the MVP scoring inputs. Cloud cover is intentionally omitted. Temperature is stored as daily max/min rather than inventing a single “temperature” metric.

Wind for surfing is taken from the Forecast API because the Marine API does not provide wind.

---

## 2026-10-01 — Persistence schema for City and DailyForecast

### Question

How should normalized weather be stored for freshness checks and scoring?

### Decision

Introduce two Prisma models:

- `City` keyed by internal `id`, uniquely identified externally by `openMeteoId`
- `DailyForecast` with a unique `(cityId, date)` pair

`DailyForecast` stores MVP scoring inputs plus `fetchedAt`. Marine wave fields are nullable so inland locations can be persisted without inventing values.

Repositories map Prisma rows to persistence records (`CityRecord`, `DailyForecastRecord`) and accept plain upsert inputs, keeping Prisma models out of higher layers.

### Reason

This matches the assignment constraints: persist normalized data, enforce city/date uniqueness, track freshness, and keep provider payloads out of the database.

---

## 2026-10-01 — Explicit MVP scoring thresholds

### Question

`docs/scoring.md` defined weights but not numeric factor curves. What thresholds should the implementation use?

### Decision

Keep weights exactly as specified. Encode simple, deterministic curves in pure functions under `src/activities/`:

- rising / falling / plateau / inverted-plateau helpers
- daily mean temperature `(max + min) / 2`
- surfing short-circuits to score 0 when either marine field is null

Document the chosen thresholds in `docs/scoring.md` so another engineer can revise them without reverse-engineering tests.

### Reason

The assignment asks for explicit, easy-to-modify heuristics with tested boundary behavior. Inventing opaque magic numbers without documenting them would hide product assumptions.

---

## 2026-10-01 — GraphQL city forecast orchestration

### Question

How should the GraphQL layer obtain city weather and activity scores without embedding provider/scoring logic in resolvers?

### Decision

Introduce `createCityForecastService` as the application orchestrator:

1. Look up the city by name in the database when possible
2. If a complete 7-day forecast is fresh (≤ 6 hours), return it and do not call Open-Meteo
3. If the city is unknown, geocode via Open-Meteo and upsert
4. If the forecast is missing or stale, refresh Forecast + Marine APIs, persist, and return
5. If refresh fails but a complete older window exists, return that window

Resolvers only call the service and map domain errors to GraphQL error codes (`CITY_NOT_FOUND`, `EXTERNAL_PROVIDER_ERROR`).

Public Weather fields omit precipitation probability and cloud cover because they are outside the MVP domain model.

Marine refresh failures are soft: weather is still persisted with null wave fields.

### Known limitation

Concurrent requests for the same stale city can each trigger a duplicate Open-Meteo refresh. The MVP intentionally does not add locks, queues, or background workers.

### Reason

This keeps GraphQL as a transport layer and matches the modular monolith boundaries in `AGENTS.md`.

---

## 2026-10-02 — Skiing warm-temperature viability gate

### Question

A weighted skiing model can score ~35 on a warm, dry, calm day with no snow (e.g. Warsaw in autumn) because wind and precipitation still contribute 35% even when snowfall and temperature are both zero. Is that acceptable?

### Decision

Keep the existing factor weights, but multiply the weighted skiing score by a warm-side viability factor derived from temperature:

- at/below the full-score temperature band → no change
- between the full-score high and the zero-high threshold → scale by `temperatureScore / 100`
- at/above ~8°C mean → skiing score is `0`

When the gate zeros the score, omit misleading positive wind/precipitation reasons.

### Alternatives considered

1. Raise snowfall weight further — still leaves wind+precip able to inflate warm dry days.
2. Require snowfall > 0 for any non-zero score — rejects cold dry resort days that may still be ski-able with existing/base snow (MVP does not model snowpack).
3. Hard zero only at ≥ 8°C with no taper — simpler, but leaves a cliff at the boundary; the taper matches the existing temperature curve.

### Reason

Temperature is a hard constraint for skiing suitability, not only a 25% comfort factor. Secondary factors should refine winter days, not manufacture mid scores when skiing is impossible.
