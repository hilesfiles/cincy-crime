import { describe, expect, it } from "vitest";
import { aggregateMarginOfError, interpolatePopulation, ratioMarginOfError } from "../../lib/demographics";

describe("demographic denominator and uncertainty helpers", () => {
  it("interpolates linearly between decennial anchors", () => {
    expect(interpolatePopulation(1000, 1200, 2015)).toBe(1100);
    expect(interpolatePopulation(1000, 1200, 2011)).toBe(1020);
  });

  it("combines independent margins of error by root-sum-of-squares", () => {
    expect(aggregateMarginOfError([{ weight: 1, marginOfError: 30 }, { weight: 1, marginOfError: 40 }])).toBe(50);
    expect(aggregateMarginOfError([{ weight: 0.5, marginOfError: 60 }, { weight: 0.5, marginOfError: 80 }])).toBe(50);
  });

  it("does not invent a margin when a component is unavailable", () => {
    expect(aggregateMarginOfError([{ weight: 1, marginOfError: null }])).toBeNull();
    expect(ratioMarginOfError({ estimate: 20, marginOfError: null }, { estimate: 100, marginOfError: 10 })).toBeNull();
  });

  it("uses the Census proportion-MOE approximation for subset percentages", () => {
    expect(ratioMarginOfError({ estimate: 20, marginOfError: 4 }, { estimate: 100, marginOfError: 10 })).toBeCloseTo(Math.sqrt(12), 6);
    expect(ratioMarginOfError({ estimate: 90, marginOfError: 1 }, { estimate: 100, marginOfError: 10 })).toBeCloseTo(Math.sqrt(82), 6);
  });
});
