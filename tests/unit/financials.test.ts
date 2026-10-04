import { describe, expect, it } from "vitest";
import actualsJson from "../../data/processed/financials/police-actuals.json";
import initiativesJson from "../../data/processed/financials/initiative-ledger.json";
import budgetJson from "../../data/processed/budget/police-budget.json";
import { actualAllocation, type PoliceActualsData } from "../../lib/actuals";
import { initiativeAllocatedAmount, type InitiativeLedgerData } from "../../lib/initiatives";
import type { PoliceBudgetData } from "../../lib/budget";

const actuals = actualsJson as PoliceActualsData;
const initiatives = initiativesJson as InitiativeLedgerData;
const budget = budgetJson as PoliceBudgetData;

describe("financial actuals", () => {
  it("keeps a consecutive audited Police series with same-basis variance", () => {
    expect(actuals.years.map((row) => row.fiscalYear)).toEqual(Array.from({ length: 12 }, (_, index) => 2014 + index));
    for (const row of actuals.years) {
      expect(row.finalBudget - row.budgetBasisActual).toBe(row.budgetBasisVariance);
      expect(row.gaapActual).toBeGreaterThan(0);
    }
    expect(actuals.years.at(-1)).toMatchObject({
      fiscalYear: 2025,
      gaapActual: 194_262_000,
      originalBudget: 181_618_000,
      finalBudget: 194_804_000,
      budgetBasisActual: 192_936_000,
      budgetBasisVariance: 1_868_000,
    });
  });

  it("reconciles modeled neighborhood and unresolved geography to the audited city total", () => {
    for (const row of actuals.years) {
      const allocation = actualAllocation(actuals, budget, row.fiscalYear, "totalPart1");
      expect(allocation).not.toBeNull();
      expect((allocation?.assignedActual ?? 0) + (allocation?.unassignedActual ?? 0)).toBeCloseTo(row.gaapActual, 4);
    }
  });
});

describe("initiative ledger", () => {
  it("preserves published totals and does not over-allocate any record", () => {
    expect(initiatives.records).toHaveLength(83);
    expect(initiatives.records.reduce((sum, row) => sum + row.amount, 0)).toBe(4_120_277);
    for (const record of initiatives.records) {
      expect(initiativeAllocatedAmount(record)).toBeLessThanOrEqual(record.amount);
      const weights = record.neighborhoods.map((row) => row.weight).filter((weight): weight is number => weight !== undefined);
      if (weights.length > 0) expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 8);
    }
  });

  it("assigns only the explicitly documented neighborhood share", () => {
    expect(initiatives.records.reduce((sum, row) => sum + initiativeAllocatedAmount(row), 0)).toBeCloseTo(502_601, 4);
    expect(initiatives.records.filter((row) => row.geographyStatus === "outside_city").reduce((sum, row) => sum + row.amount, 0)).toBe(35_000);
  });

  it("preserves the 2026 published award cycles without inventing multi-neighborhood splits", () => {
    const awards = initiatives.records.filter((row) => row.id.startsWith("safe-clean-2026-"));
    expect(awards).toHaveLength(17);
    expect(awards.reduce((sum, row) => sum + row.amount, 0)).toBe(343_477);
    expect(awards.every((row) => row.fiscalYear === 2026 && row.amountType === "awarded" && row.sourcePage && row.sourceUrl)).toBe(true);
    expect(awards.filter((row) => row.geographyStatus === "shared_unallocated").every((row) => initiativeAllocatedAmount(row) === 0)).toBe(true);
    expect(awards.find((row) => row.id === "safe-clean-2026-jan-whitney-strong")?.geographyStatus).toBe("shared_unallocated");
    expect(awards.reduce((sum, row) => sum + initiativeAllocatedAmount(row), 0)).toBe(131_501);
    expect(awards.some((row) => row.amount === 549_060)).toBe(false);
  });
});
