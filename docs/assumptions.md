# Assumptions

This document records product questions that would normally be clarified with a product manager or domain expert.

The assumptions are intentionally explicit and may be revisited as the implementation progresses.

## Forecast period

**Question:** What does "next 7 days" mean?

**Assumption:** Include today and the following six calendar days.

---

## City resolution

**Question:** What should happen when multiple locations have the same name?

**Assumption:** Use the most relevant result returned by the Open-Meteo geocoding service.

**Future consideration:** Allow country or region to be supplied for disambiguation.

---

## Activity score

**Question:** What does "how good" mean?

**Assumption:** Each activity receives a heuristic score from 0 to 100 based on weather/marine conditions.

The score is not a scientific measurement or professional recommendation.

---

## Score explanation

**Question:** Should users be able to understand why a day received its score?

**Assumption:** Yes. Every activity score contains human-readable reasons describing the major positive and negative factors.

---

## Skiing

**Question:** Which weather factors matter?

**Assumption:** Skiing suitability is based on snowfall, temperature, wind, and precipitation.

Cloud cover is not included in the MVP because it is not considered sufficiently useful without a more complete visibility model.

---

## Outdoor sightseeing

**Question:** Does cloud cover materially affect the score?

**Assumption:** No. Temperature, precipitation, and wind are considered more directly relevant to basic outdoor sightseeing suitability.

---

## Indoor sightseeing

**Question:** Does weather matter for indoor sightseeing?

**Assumption:** Indoor sightseeing is relatively more suitable when outdoor conditions are unpleasant.

Rain/precipitation and uncomfortable temperatures therefore increase the score.

The service does not recommend actual indoor attractions.

---

## Surfing

**Question:** What does a city-level surfing score represent?

**Assumption:** It represents general marine conditions around the city's coordinates.

The MVP does not account for individual beaches, surf breaks, beach orientation, tides, local hazards, or surfer skill.

**Question:** What if meaningful marine data is unavailable?

**Assumption:** Do not invent a score. Return a score of 0 with a reason explaining that marine conditions are unavailable.

This behavior may be revisited if a better way to identify non-coastal locations is introduced.

**Question:** Where does surfing wind come from?

**Assumption:** Open-Meteo's Marine API does not expose wind variables. Surfing wind uses the Forecast API daily field `wind_speed_10m_max` for the same coordinates/date. Wave height and period come from the Marine API.

---

## Weather persistence

**Question:** Why persist forecasts instead of calling Open-Meteo for every request?

**Assumption:** Forecasts are persisted so GraphQL requests can normally be served from the database and the external provider is not called unnecessarily.

---

## Forecast freshness

**Question:** How long is a forecast considered fresh?

**Assumption:** Six hours.

This is a pragmatic MVP value rather than a claim about the exact rate at which weather forecasts become inaccurate.

---

## Provider outage

**Question:** What should happen if Open-Meteo is unavailable?

**MVP assumption:** If a refresh fails, the service may return the existing persisted forecast if one exists. If no forecast exists, the request should fail with an appropriate error.

---

## Forecast refresh concurrency

**Question:** What happens if multiple requests encounter the same stale forecast simultaneously?

**MVP assumption:** Duplicate provider requests are possible.

This is a known limitation and may be improved later with locking or background refresh.

---

## Data model

**Question:** Should the raw Open-Meteo response be persisted?

**Assumption:** No. The MVP stores normalized fields required by the application.

Provider-specific response formats remain inside the integration layer.

---

## Safety / recommendations

**Question:** Are these scores intended as professional weather or activity advice?

**Assumption:** No. They are heuristic activity-suitability scores for the purpose of this exercise.

---

## GraphQL weather fields

**Question:** Should the GraphQL weather payload include precipitation probability and cloud cover?

**Assumption:** No for the MVP. Those fields are not part of the persisted/scoring domain model, so the public schema exposes only the normalized fields we actually store and score on.
