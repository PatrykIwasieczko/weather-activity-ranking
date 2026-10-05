import type { FactorContribution } from "./types.js";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to an integer and clamp to the public 0–100 score range. */
export function toScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clamp(Math.round(value), 0, 100);
}

export function meanTemperatureC(input: {
  temperatureMaxC: number;
  temperatureMinC: number;
}): number {
  return (input.temperatureMaxC + input.temperatureMinC) / 2;
}

/**
 * Rising suitability: at/below `zeroAt` → 0, at/above `fullAt` → 100.
 */
export function scoreRising(
  value: number,
  zeroAt: number,
  fullAt: number,
): number {
  if (fullAt <= zeroAt) {
    throw new Error("scoreRising requires fullAt > zeroAt");
  }
  if (value <= zeroAt) {
    return 0;
  }
  if (value >= fullAt) {
    return 100;
  }
  return ((value - zeroAt) / (fullAt - zeroAt)) * 100;
}

/**
 * Falling suitability: at/below `fullAt` → 100, at/above `zeroAt` → 0.
 */
export function scoreFalling(
  value: number,
  fullAt: number,
  zeroAt: number,
): number {
  if (zeroAt <= fullAt) {
    throw new Error("scoreFalling requires zeroAt > fullAt");
  }
  if (value <= fullAt) {
    return 100;
  }
  if (value >= zeroAt) {
    return 0;
  }
  return ((zeroAt - value) / (zeroAt - fullAt)) * 100;
}

/**
 * Plateau suitability with linear shoulders.
 * Outside [zeroLow, zeroHigh] → 0; inside [fullLow, fullHigh] → 100.
 */
export function scorePlateau(
  value: number,
  zeroLow: number,
  fullLow: number,
  fullHigh: number,
  zeroHigh: number,
): number {
  if (!(zeroLow < fullLow && fullLow <= fullHigh && fullHigh < zeroHigh)) {
    throw new Error("scorePlateau requires zeroLow < fullLow <= fullHigh < zeroHigh");
  }
  if (value <= zeroLow || value >= zeroHigh) {
    return 0;
  }
  if (value >= fullLow && value <= fullHigh) {
    return 100;
  }
  if (value < fullLow) {
    return scoreRising(value, zeroLow, fullLow);
  }
  return scoreFalling(value, fullHigh, zeroHigh);
}

/**
 * Inverted plateau: comfortable mid-range scores low; extremes score high.
 * Used by indoor sightseeing temperature.
 */
export function scoreInvertedPlateau(
  value: number,
  zeroLow: number,
  fullLow: number,
  fullHigh: number,
  zeroHigh: number,
): number {
  return 100 - scorePlateau(value, zeroLow, fullLow, fullHigh, zeroHigh);
}

export function combineWeightedScores(
  factors: ReadonlyArray<FactorContribution>,
): number {
  if (factors.length === 0) {
    return 0;
  }

  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("combineWeightedScores requires positive total weight");
  }

  const weighted =
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) /
    totalWeight;

  return toScore(weighted);
}

export type ReasonCandidate = {
  score: number;
  good: string;
  bad: string;
  /** Inclusive threshold for a positive reason. Default 70. */
  goodAt?: number;
  /** Inclusive threshold for a negative reason. Default 40. */
  badAt?: number;
};

/**
 * Collect human-readable reasons for factors that materially affect the score.
 * If no factor crosses the good/bad thresholds, return the neutral fallback
 * instead of inventing a positive/negative claim from a middling factor.
 */
export function buildReasons(
  candidates: ReadonlyArray<ReasonCandidate>,
  fallbackNeutral: string,
): string[] {
  const reasons: string[] = [];

  for (const candidate of candidates) {
    const goodAt = candidate.goodAt ?? 70;
    const badAt = candidate.badAt ?? 40;

    if (candidate.score >= goodAt) {
      reasons.push(candidate.good);
    } else if (candidate.score <= badAt) {
      reasons.push(candidate.bad);
    }
  }

  if (reasons.length > 0) {
    return reasons;
  }

  return [fallbackNeutral];
}
