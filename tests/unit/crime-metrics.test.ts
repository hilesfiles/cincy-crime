import { describe, expect, it } from "vitest";
import { metricAvailableInYear, metricChange, metricCount, metricRate } from "../../lib/crime/metrics";
import type { Counts } from "../../lib/crime/summary";

const counts = (categories: Counts["categories"]): Counts => ({ violent: 20, property: 80, totalPart1: 100, categories });

describe("shared crime metrics", () => {
  it("reads aggregate and discrete offense counts", () => {
    const value = counts({ homicide: 3, robbery: 7 });
    expect(metricCount(value, "totalPart1")).toBe(100);
    expect(metricCount(value, "homicide")).toBe(3);
  });

  it("normalizes current split theft rows into larceny/theft", () => {
    expect(metricCount(counts({ theft_from_auto: 12, personal_other_theft: 18, motor_vehicle_theft: 9 }), "larceny_theft")).toBe(30);
    expect(metricCount(counts({ larceny_theft: 42 }), "larceny_theft")).toBe(42);
  });

  it("keeps late-start categories unavailable before the STARS transition", () => {
    expect(metricAvailableInYear("homicide", 2011)).toBe(true);
    expect(metricAvailableInYear("motor_vehicle_theft", 2023)).toBe(false);
    expect(metricAvailableInYear("strangulation", 2024)).toBe(true);
  });

  it("calculates selected-category rates and changes", () => {
    const current = counts({ robbery: 15 });
    const prior = counts({ robbery: 10 });
    expect(metricRate(current, 5_000, "robbery")).toBe(3);
    expect(metricChange(current, prior, "robbery").value).toBe(50);
  });
});
