# AGENTS.md

## Project

Build a backend service that accepts a city or town and ranks the next 7 days for:

- Skiing
- Surfing
- Outdoor sightseeing
- Indoor sightseeing

Weather data comes from Open-Meteo and must be persisted rather than fetched on every request.

This is a take-home exercise for a Senior / Lead Engineer position.

The goal is not to maximize the amount of code. Prioritize clear engineering decisions, maintainability, correctness, and explicit assumptions.

## Technology

- Node.js
- TypeScript
- GraphQL Yoga
- PostgreSQL
- Prisma
- Vitest
- Docker Compose

Use the versions selected during project setup unless there is a strong reason to change them.

## Core architecture

Use a modular monolith.

Keep these responsibilities separate:

- GraphQL: API/transport layer
- Cities: city lookup and geocoding
- Weather: Open-Meteo integration and forecast orchestration
- Activities: pure activity scoring/domain logic
- Persistence: Prisma repositories/database access
- Refresh: forecast freshness and refresh behavior

GraphQL resolvers should not contain weather scoring logic or direct Open-Meteo HTTP calls.

## External API

Open-Meteo is the external weather provider.

Use:

- Open-Meteo Geocoding API for resolving city names
- Open-Meteo Forecast API for general weather
- Open-Meteo Marine API for surfing-related data

Before implementing API clients, verify the current official Open-Meteo documentation and response format.

Do not invent API fields.

Treat external APIs as unreliable:

- handle HTTP failures
- handle timeouts
- validate unexpected responses
- do not silently turn missing data into plausible values

Keep provider-specific response models separate from internal domain models.

## Persistence

Persist normalized weather data in PostgreSQL.

Do not store the complete provider response as the primary data model for the MVP.

Forecast data is associated with a city and date.

A city/date combination must be unique.

Store when the forecast was fetched so freshness can be evaluated.

## Forecast horizon

The service returns:

- today
- plus the following 6 days

Total: 7 calendar days.

## Activity scoring

Every activity receives a score from 0 to 100.

Every score must contain human-readable reasons explaining the main factors affecting it.

Example:

{
"score": 82,
"reasons": [
"Fresh snowfall is expected",
"Temperatures are suitable for skiing",
"Strong winds may reduce comfort"
]
}

Scores are heuristics. They are not professional weather, skiing, or surfing advice.

Keep scoring logic explicit and easy to modify.

Prefer pure functions for scoring.

Do not put database or HTTP calls inside scoring functions.

## Initial scoring model

### Skiing

Use:

- snowfall
- temperature
- wind
- precipitation

Initial weights:

- snowfall: 40%
- temperature: 25%
- wind: 20%
- precipitation: 15%

Cloud cover is intentionally not used in the MVP.

### Outdoor sightseeing

Use:

- temperature
- precipitation
- wind

Initial weights:

- temperature: 40%
- precipitation: 40%
- wind: 20%

Cloud cover is intentionally not used in the MVP.

### Indoor sightseeing

Use:

- precipitation
- temperature
- wind

Initial weights:

- precipitation: 60%
- temperature: 30%
- wind: 10%

The assumption is that indoor sightseeing becomes relatively more suitable when outdoor conditions are unpleasant.

### Surfing

Use marine conditions:

- wave height
- wave period
- wind

Initial weights:

- wave height: 50%
- wave period: 30%
- wind: 20%

Surfing is evaluated using general marine conditions around the city's coordinates.

The MVP does not account for:

- individual surf breaks
- beach orientation
- tides
- local hazards
- surfer skill level

If meaningful marine data is unavailable for the location, do not invent a surfing score.

## Scoring implementation

Use reusable normalization/scoring functions where appropriate.

Avoid creating an elaborate generic scoring framework.

The scoring code should be easy for another engineer to understand and modify.

Boundary conditions must be covered by tests.

## Forecast refresh

The MVP uses lazy refresh:

1. Look for persisted forecast.
2. If the forecast is fresh, return it.
3. If it is missing or stale, fetch from Open-Meteo.
4. Persist the new forecast.
5. Return it.

Use a 6-hour freshness threshold unless a later documented decision changes it.

Known MVP limitation:

Concurrent requests for the same stale city may cause duplicate provider requests.

Do not introduce Redis, queues, distributed locks, or background workers for the MVP.

If time remains after the core functionality works, stale-data fallback and concurrency protection can be considered as improvements.

## City lookup

The GraphQL API accepts a city name.

Use Open-Meteo geocoding to resolve it.

For the MVP, use the best relevant geocoding result rather than building a complex city disambiguation system.

A future version could accept country or region information.

## Indoor sightseeing scope

Indoor sightseeing does not recommend actual attractions.

It only evaluates whether weather conditions make indoor activities relatively suitable.

Do not integrate attraction APIs.

## GraphQL

Keep the public schema small.

Prefer domain-oriented GraphQL types rather than exposing Prisma models directly.

The main query should allow a caller to request a city and receive its 7-day forecast and activity scores.

Include the normalized weather data used for the scoring.

Do not add mutations unless there is a concrete requirement.

## Testing

Use Vitest.

Prioritize tests for:

1. Activity scoring
2. Scoring boundary conditions
3. Open-Meteo response mapping
4. Forecast freshness
5. City lookup behavior
6. GraphQL behavior
7. External API failure handling

Mock external HTTP calls in unit tests.

Do not make tests depend on live Open-Meteo responses.

## Code quality

Prefer:

- small functions
- explicit types
- dependency injection where it improves testability
- pure domain functions
- descriptive names
- straightforward control flow

Avoid:

- unnecessary design patterns
- speculative abstractions
- generic utility dumping grounds
- inheritance-heavy designs
- premature optimization
- excessive framework abstractions

## Scope constraints

Do not add:

- frontend
- authentication
- user accounts
- Redis
- Kafka
- message queues
- microservices
- Kubernetes
- complex observability
- admin UI

unless a concrete requirement emerges that clearly justifies them.

## AI-assisted development

AI is explicitly allowed and expected for this exercise.

AI suggestions are inputs, not authoritative decisions.

For significant architectural or domain decisions:

1. Identify the question.
2. Consider alternatives.
3. Make the decision explicit.
4. Record it in `docs/decision-log.md`.

Do not record every trivial implementation detail.

The repository should show the evolution of important decisions rather than a dump of every AI conversation.

## Documentation

Maintain:

- `README.md` — how the service works and how to run it
- `docs/assumptions.md` — unresolved product questions and chosen assumptions
- `docs/scoring.md` — activity scoring model
- `docs/decision-log.md` — significant implementation/design decisions

When a meaningful design decision changes during implementation, update the appropriate document.

## Implementation workflow

Work in small, reviewable increments.

Before making a significant change:

1. Inspect the existing implementation.
2. Explain what will change and why.
3. Implement the smallest useful change.
4. Add/update tests.
5. Update documentation when the decision is significant.

Do not rewrite working code simply for stylistic reasons.

The project should remain runnable throughout development whenever practical.
