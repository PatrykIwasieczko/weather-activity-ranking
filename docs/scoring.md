# Activity Scoring

All activity scores are integers from 0 to 100.

The scoring system is intentionally simple and explainable. It is a heuristic rather than a scientifically validated model.

Each activity combines several normalized factors using weighted averages.

## General approach

Each weather factor is converted to a 0–100 suitability score.

The activity score is calculated as:

```text
sum(factorScore × factorWeight)
```

The final value is rounded to an integer and constrained to the range 0–100.

Temperature factors use the daily mean:

```text
(temperatureMaxC + temperatureMinC) / 2
```

Reasons are generated from factors that materially influence the result
(typically factor scores ≥ 70 or ≤ 40). If none qualify, a single neutral
fallback sentence is used (for example “Outdoor sightseeing conditions look mixed”)
instead of describing middling factors as clearly good or bad.

Implementation lives in `src/activities/` as pure functions over `DailyConditions`.

---

## Skiing

### Factors

| Factor        | Weight |
| ------------- | -----: |
| Snowfall      |    40% |
| Temperature   |    25% |
| Wind          |    20% |
| Precipitation |    15% |

### MVP thresholds

| Factor        | Heuristic |
| ------------- | --------- |
| Snowfall      | 0 cm → 0; 10 cm+ → 100 (linear) |
| Temperature   | Full score for mean about -12°C to -1°C; 0 at ≤ -25°C or ≥ 8°C |
| Wind          | Full score at ≤ 20 km/h max; 0 at ≥ 60 km/h |
| Precipitation | Full score at 0 mm non-snow precip; 0 at ≥ 25 mm |

Non-snow precipitation is approximated as:

```text
max(0, precipitationSumMm - snowfallSumCm / 7)
```

because Open-Meteo `precipitation_sum` includes snow water equivalent.

### Warm-temperature viability gate

After the weighted average, skiing applies a warm-side viability factor:

- mean temperature ≤ about −1°C → factor `1` (no change)
- mean temperature between about −1°C and 8°C → factor = `temperatureScore / 100`
- mean temperature ≥ 8°C → factor `0` (final skiing score is `0`)

This prevents calm, dry weather from producing a mid-range skiing score on warm days where skiing (including artificial snow) is not realistic.

Extreme cold is not zeroed by this gate; it still uses the normal weighted model (temperature factor already scores poorly there).

When the warm gate zeros the score, reasons omit positive wind/precipitation messages.

### Rationale

Snowfall is the most important factor because fresh snow is generally relevant to skiing conditions.

Temperature affects comfort and whether conditions are suitable for snow. Above the winter band it is treated as a hard constraint, not only a 25% weight.

Strong wind can reduce comfort and potentially affect skiing conditions.

Precipitation is included separately from snowfall because precipitation can make outdoor activity less comfortable even when it does not produce useful snow.

Cloud cover is not used in the MVP.

---

## Outdoor sightseeing

### Factors

| Factor        | Weight |
| ------------- | -----: |
| Temperature   |    40% |
| Precipitation |    40% |
| Wind          |    20% |

### MVP thresholds

| Factor        | Heuristic |
| ------------- | --------- |
| Temperature   | Full score for mean about 15–24°C; 0 at ≤ -5°C or ≥ 35°C |
| Precipitation | Full score at 0 mm; 0 at ≥ 20 mm |
| Wind          | Full score at ≤ 20 km/h max; 0 at ≥ 55 km/h |

### Rationale

Comfortable temperatures and low precipitation are the primary considerations.

Wind is included as a secondary factor.

Cloud cover is not used because the MVP does not attempt to model subjective preferences for sunny versus cloudy sightseeing.

---

## Indoor sightseeing

### Factors

| Factor        | Weight |
| ------------- | -----: |
| Precipitation |    60% |
| Temperature   |    30% |
| Wind          |    10% |

### MVP thresholds

| Factor        | Heuristic |
| ------------- | --------- |
| Precipitation | Higher precipitation increases score; ~20 mm → 100 |
| Temperature   | Inverted outdoor comfort: mild means (~10–24°C) score low; cold/hot extremes score high |
| Wind          | Higher max wind increases score; ≤ 10 km/h → low; ≥ 55 km/h → 100 |

### Rationale

Indoor sightseeing becomes relatively more attractive when outdoor conditions are unpleasant.

Precipitation is therefore the strongest factor.

Temperature rewards both cold and hot extremes, while moderate temperatures produce a lower indoor suitability score.

Wind has a smaller influence.

---

## Surfing

### Factors

| Factor      | Weight |
| ----------- | -----: |
| Wave height |    50% |
| Wave period |    30% |
| Wind        |    20% |

### Missing marine data

If `waveHeightMaxM` or `wavePeriodMaxS` is null, surfing returns:

- score `0`
- reason: `Marine conditions are unavailable for this location`

No weighted surfing score is invented from wind alone.

### MVP thresholds

| Factor      | Heuristic |
| ----------- | --------- |
| Wave height | Full score about 1.0–2.5 m; 0 at ≤ 0.2 m or ≥ 5.0 m |
| Wave period | 4 s → 0; 12 s+ → 100 (linear) |
| Wind        | Full score at ≤ 15 km/h max; 0 at ≥ 45 km/h |

### Rationale

Wave conditions are the primary driver of the generic surfing score.

Wave period is used as an additional indicator of wave quality.

Wind is included as a secondary factor and comes from forecast wind, not the Marine API.

The MVP does not account for surf break orientation, swell direction, tides, local hazards, or surfer skill.

### Thresholds

Surfing thresholds are intentionally approximate and should be treated as configurable heuristics rather than authoritative surf forecasting rules.

---

## Reasons

Reasons should describe meaningful factors rather than expose implementation details.

Good:

```text
Fresh snowfall is expected
Temperatures are suitable for skiing
Strong winds may reduce comfort
```

Avoid:

```text
snowfallScore = 80
windScore = 42
```

The exact wording should remain concise and understandable to a non-technical consumer.

---

## Future improvements

Potential future improvements include:

- configurable scoring thresholds
- location-specific activity models
- more detailed marine conditions
- visibility
- elevation
- local surf-break information
- historical validation of scores
- user-specific activity preferences

These are outside the MVP scope.
