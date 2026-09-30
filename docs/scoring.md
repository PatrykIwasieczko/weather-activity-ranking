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

Reasons are generated from the factors that materially influence the result.

---

## Skiing

### Factors

| Factor        | Weight |
| ------------- | -----: |
| Snowfall      |    40% |
| Temperature   |    25% |
| Wind          |    20% |
| Precipitation |    15% |

### Rationale

Snowfall is the most important factor because fresh snow is generally relevant to skiing conditions.

Temperature affects comfort and whether conditions are suitable for snow.

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

### Rationale

Wave conditions are the primary driver of the generic surfing score.

Wave period is used as an additional indicator of wave quality.

Wind is included as a secondary factor.

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
