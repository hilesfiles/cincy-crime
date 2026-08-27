import { describe, expect, it } from "vitest";
import map from "../../data/processed/geography/neighborhood-map.json";
import geography from "../../data/reports/geography-validation.json";
import crosswalk from "../../data/manifests/neighborhood-crosswalk.json";
import summary from "../../data/processed/crime/cpd-neighborhood-summary.json";
import historical from "../../data/processed/crime/historical-annual.json";
import cpdReports from "../../data/reports/cpd-neighborhood-validation.json";
import population from "../../data/reports/population-validation.json";
import unmapped from "../../data/reports/unmapped-offenses.json";
import budget from "../../data/processed/budget/police-budget.json";
import budgetValidation from "../../data/reports/budget-validation.json";

describe("processed data", () => {
  it("preserves the definitive 51-name to 50-feature crosswalk", () => {
    expect(map.regions).toHaveLength(50); expect(geography.status).toBe("pass"); expect(crosswalk.civicNeighborhoodCount).toBe(51); expect(geography.actualCombinedRegionCount).toBe(3);
  });
  it("has unique stable ids and slugs", () => {
    expect(new Set(map.regions.map((row) => row.id)).size).toBe(map.regions.length);
    expect(new Set(map.regions.map((row) => row.slug)).size).toBe(map.regions.length);
  });
  it("resolves all published STARS categories", () => { expect(unmapped.count).toBe(0); });
  it("has one current aggregate and population rate per map region", () => {
    expect(cpdReports.reportCount).toBe(51); expect(summary.neighborhoods).toHaveLength(map.regions.length); expect(summary.metadata.cutoff).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(summary.neighborhoods.every((row) => row.population > 0 && typeof row.rates.violentYtdPer1000 === "number")).toBe(true);
    expect(population.civicProfileCount).toBe(51);
  });
  it("publishes validated annual and same-date historical periods", () => {
    expect(historical.metadata.annualYears).toEqual(Array.from({ length: 15 }, (_, index) => 2011 + index));
    expect(historical.metadata.sameDateYtdYears.at(-1)).toBe(2026);
    expect(historical.periods.annual).toHaveLength(15);
    expect(historical.periods.annual.every((period) => period.neighborhoods.length === 50 && period.reconciliation.status === "pass")).toBe(true);
  });
  it("publishes a reconciled fiscal-year police budget allocation panel", () => {
    expect(budget.budgets.find((row) => row.fiscalYear === 2013)?.status).toBe("transition_stub");
    expect(budget.budgets.find((row) => row.fiscalYear === 2005)?.total).toBeNull();
    expect(budget.crimePeriods).toHaveLength(12);
    expect(budgetValidation.reconciledPeriods).toBe(budget.crimePeriods.length);
    expect(budget.crimePeriods.every((period) => period.neighborhoods.length === 50)).toBe(true);
  });
});
