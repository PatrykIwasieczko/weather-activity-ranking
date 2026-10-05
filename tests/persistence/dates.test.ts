import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateOnly,
  parseDateOnly,
} from "../../src/persistence/dates.js";

describe("persistence date helpers", () => {
  it("round-trips YYYY-MM-DD without timezone shifting", () => {
    const parsed = parseDateOnly("2026-10-01");
    expect(formatDateOnly(parsed)).toBe("2026-10-01");
  });

  it("adds days in UTC calendar space", () => {
    expect(addDays("2026-10-01", 6)).toBe("2026-10-07");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("rejects malformed and invalid calendar dates", () => {
    expect(() => parseDateOnly("01-10-2026")).toThrow(/YYYY-MM-DD/);
    expect(() => parseDateOnly("2026-02-31")).toThrow(/Invalid calendar date/);
    expect(() => parseDateOnly("2025-02-29")).toThrow(/Invalid calendar date/);
    expect(() => parseDateOnly("2026-13-01")).toThrow(/Invalid calendar date/);
  });
});
