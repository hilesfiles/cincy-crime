import { describe, expect, it } from "vitest";
import { comparisonMonthDayFromCutoff } from "../../scripts/data/fetch-historical";

describe("historical comparison cutoff", () => {
  it("derives the same-date month and day from the current CPD cutoff", () => {
    expect(comparisonMonthDayFromCutoff("2026-08-29")).toBe("08-29");
  });

  it("rejects malformed cutoff values", () => {
    expect(() => comparisonMonthDayFromCutoff("08-29-2026")).toThrow("Invalid CPD cutoff");
  });
});
