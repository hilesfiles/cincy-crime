import { describe, expect, it } from "vitest";
import dataJson from "../../data/processed/budget/police-budget.json";
import { budgetAllocation, type PoliceBudgetData } from "../../lib/budget";

const data = dataJson as PoliceBudgetData;

describe("budget allocation", () => {
  it("attributes the complete budget across mapped and unassigned crime geography", () => {
    const allocation = budgetAllocation(data, 2025, "totalPart1")!;
    expect(allocation.assignedBudget + allocation.unassignedBudget).toBeCloseTo(allocation.budget.total!, 4);
    expect(allocation.neighborhoods.reduce((sum, row) => sum + row.incidents, 0) + allocation.unassignedIncidents).toBe(allocation.cityIncidents);
  });

  it("uses one citywide budget-per-crime rate for every neighborhood", () => {
    const allocation = budgetAllocation(data, 2024, "violent")!;
    for (const row of allocation.neighborhoods.filter((item) => item.incidents > 0)) expect(row.attributedBudget / row.incidents).toBeCloseTo(allocation.averagePerIncident, 8);
  });
});
