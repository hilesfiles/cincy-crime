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
    expect(actuals.years.map((row) => row.fiscalYear)).toEqual(Array.from({ length: 11 }, (_, index) => 2014 + index));
    for (const row of actuals.years) {
      expect(row.finalBudget - row.budgetBasisActual).toBe(row.budgetBasisVariance);
      expect(row.gaapActual).toBeGreaterThan(0);
    }
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
    expect(initiatives.records).toHaveLength(66);
    expect(initiatives.records.reduce((sum, row) => sum + row.amount, 0)).toBe(3_776_800);
    for (const record of initiatives.records) {
      expect(initiativeAllocatedAmount(record)).toBeLessThanOrEqual(record.amount);
      const weights = record.neighborhoods.map((row) => row.weight).filter((weight): weight is number => weight !== undefined);
      if (weights.length > 0) expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 8);
    }
  });

  it("assigns only the explicitly documented neighborhood share", () => {
    expect(initiatives.records.reduce((sum, row) => sum + initiativeAllocatedAmount(row), 0)).toBeCloseTo(371_100, 4);
    expect(initiatives.records.filter((row) => row.geographyStatus === "outside_city").reduce((sum, row) => sum + row.amount, 0)).toBe(35_000);
  });
});
