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
