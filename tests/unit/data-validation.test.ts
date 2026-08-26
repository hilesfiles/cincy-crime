import { describe, expect, it } from "vitest";
import map from "../../data/processed/geography/neighborhood-map.json";
import geography from "../../data/reports/geography-validation.json";
import summary from "../../data/processed/crime/current-summary.json";
import unmapped from "../../data/reports/unmapped-offenses.json";

describe("processed data", () => {
  it("preserves the live official geometry count and flags the expectation mismatch", () => {
    expect(map.regions).toHaveLength(50); expect(geography.status).toBe("warning"); expect(geography.expectedFeatureCount).toBe(52);
  });
  it("has unique stable ids and slugs", () => {
    expect(new Set(map.regions.map((row) => row.id)).size).toBe(map.regions.length);
    expect(new Set(map.regions.map((row) => row.slug)).size).toBe(map.regions.length);
  });
  it("resolves all published STARS categories", () => { expect(unmapped.count).toBe(0); });
  it("has one crime summary per map region", () => { expect(summary.neighborhoods).toHaveLength(map.regions.length); expect(summary.metadata.cutoff).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
});
