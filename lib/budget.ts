import type { CrimeMetricKey } from "./crime/metrics";

export type BudgetNeighborhood = {
  id: string;
  slug: string;
  name: string;
  population: number | null;
  counts: Record<CrimeMetricKey, number>;
};

export type BudgetCrimePeriod = {
  fiscalYear: number;
  start: string;
  end: string;
  sourceSystems: string[];
  sourceGrain: string;
  cityCounts: Record<CrimeMetricKey, number>;
  unassignedCounts: Record<CrimeMetricKey, number>;
  neighborhoods: BudgetNeighborhood[];
};

export type PoliceBudgetYear = {
  fiscalYear: number;
  total: number | null;
  personnel: number | null;
  nonPersonnel: number | null;
  status: "available" | "unavailable" | "transition_stub";
};

export type PoliceBudgetData = {
  metadata: {
    generatedAt: string;
    budgetDatasetId: string;
    budgetSourceUrl: string;
    budgetField: string;
    budgetDefinition: string;
    fiscalYearNote: string;
    allocationDefinition: string;
    allocationWarning: string;
    policeDepartments: string[];
    crimeCoverage: { firstFiscalYear: number; lastCompleteFiscalYear: number };
  };
  budgets: PoliceBudgetYear[];
  crimePeriods: BudgetCrimePeriod[];
};

export type BudgetAllocationRow = BudgetNeighborhood & {
  incidents: number;
  incidentShare: number;
  attributedBudget: number;
  attributedPerResident: number | null;
};

export function budgetAllocation(data: PoliceBudgetData, fiscalYear: number, metric: CrimeMetricKey) {
  const budget = data.budgets.find((row) => row.fiscalYear === fiscalYear) ?? null;
  const period = data.crimePeriods.find((row) => row.fiscalYear === fiscalYear) ?? null;
  const total = budget?.total ?? null;
  const cityIncidents = period?.cityCounts[metric] ?? 0;
  if (!budget || !period || total === null || cityIncidents <= 0) return null;
  const averagePerIncident = total / cityIncidents;
  const neighborhoods: BudgetAllocationRow[] = period.neighborhoods.map((row) => {
    const incidents = row.counts[metric] ?? 0;
    const attributedBudget = incidents * averagePerIncident;
    return { ...row, incidents, incidentShare: incidents / cityIncidents, attributedBudget, attributedPerResident: row.population ? attributedBudget / row.population : null };
  });
  const unassignedIncidents = period.unassignedCounts[metric] ?? 0;
  return {
    budget,
    period,
    cityIncidents,
    averagePerIncident,
    neighborhoods,
    unassignedIncidents,
    unassignedBudget: unassignedIncidents * averagePerIncident,
    assignedBudget: neighborhoods.reduce((sum, row) => sum + row.attributedBudget, 0),
  };
}
