import { describe, expect, it } from "vitest";
import {
  forecastDateWindow,
  isCompleteForecastWindow,
  isFreshForecastWindow,
  localDateString,
} from "../../src/app/freshness.js";

describe("forecast freshness helpers", () => {
  it("builds a 7-day local date window", () => {
    expect(forecastDateWindow("2026-10-01")).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
  });

  it("detects complete and incomplete windows", () => {
    const dates = forecastDateWindow("2026-10-01").map((date) => ({ date }));
    expect(isCompleteForecastWindow(dates, "2026-10-01")).toBe(true);
    expect(isCompleteForecastWindow(dates.slice(0, 6), "2026-10-01")).toBe(
      false,
    );
  });

  it("detects freshness using fetchedAt timestamps", () => {
    const now = new Date("2026-10-01T12:00:00.000Z");
    const fresh = [
      { fetchedAt: new Date("2026-10-01T10:00:00.000Z") },
      { fetchedAt: new Date("2026-10-01T11:00:00.000Z") },
    ];
    const stale = [
      { fetchedAt: new Date("2026-09-30T12:00:00.000Z") },
      { fetchedAt: new Date("2026-10-01T11:00:00.000Z") },
    ];

    expect(isFreshForecastWindow(fresh, now)).toBe(true);
    expect(isFreshForecastWindow(stale, now)).toBe(false);
  });

  it("formats local calendar dates for a timezone", () => {
    expect(
      localDateString(
        "Europe/Warsaw",
        new Date("2026-10-01T21:30:00.000Z"),
      ),
    ).toBe("2026-10-01");
    expect(
      localDateString(
        "Europe/Warsaw",
        new Date("2026-10-01T22:30:00.000Z"),
      ),
    ).toBe("2026-10-02");
  });
});
