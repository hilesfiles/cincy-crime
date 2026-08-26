import { describe, expect, it } from "vitest";
import { percentChange, ratePer1000, rolling28Windows, ytdWindows } from "../../lib/analytics/periods";

describe("period analytics", () => {
  it("builds comparable YTD windows", () => {
    expect(ytdWindows("2026-08-22")).toEqual({ comparisonStart: "2026-01-01", comparisonEnd: "2026-08-22", priorStart: "2025-01-01", priorEnd: "2025-08-22" });
  });
  it("builds adjacent inclusive 28-day windows", () => {
    expect(rolling28Windows("2026-08-22")).toEqual({ currentStart: "2026-07-26", currentEnd: "2026-08-22", previousStart: "2026-06-28", previousEnd: "2026-07-25" });
  });
  it("does not report infinity for a zero denominator", () => {
    expect(percentChange(4, 0)).toEqual({ kind: "new-activity", value: null });
    expect(percentChange(0, 0)).toEqual({ kind: "no-change", value: 0 });
  });
  it("returns unavailable rates without a valid population", () => {
    expect(ratePer1000(10, null)).toBeNull(); expect(ratePer1000(10, 0)).toBeNull(); expect(ratePer1000(10, 2000)).toBe(5);
  });
});
