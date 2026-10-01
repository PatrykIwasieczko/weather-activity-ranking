import { scoreIndoorSightseeing } from "./indoor-sightseeing.js";
import { scoreOutdoorSightseeing } from "./outdoor-sightseeing.js";
import { scoreSkiing } from "./skiing.js";
import { scoreSurfing } from "./surfing.js";
import type { ActivityScore, DailyConditions } from "./types.js";

export function scoreAllActivities(day: DailyConditions): ActivityScore[] {
  return [
    scoreSkiing(day),
    scoreSurfing(day),
    scoreOutdoorSightseeing(day),
    scoreIndoorSightseeing(day),
  ];
}
