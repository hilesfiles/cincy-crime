import type { PoliceBudgetData } from "./budget";
import type { CrimeMetricKey } from "./crime/metrics";

export type PoliceActualYear = {
  fiscalYear: number;
  gaapActual: number;
  originalBudget: number;
  finalBudget: number;
  budgetBasisActual: number;
  budgetBasisVariance: number;
  sourceUrl: string;
  budgetSchedulePdfPage: number;
  gaapStatementPdfPage: number;
};

export type PoliceActualsData = {
  metadata: {
    generatedAt: string;
    coverage: { firstFiscalYear: number; lastFiscalYear: number };
    headlineDefinition: string;
    budgetBasisDefinition: string;
    scopeNote: string;
    allocationWarning: string;
    latestAvailableNote: string;
  };
  years: PoliceActualYear[];
};

export function actualAllocation(actuals: PoliceActualsData, budgetData: PoliceBudgetData, fiscalYear: number, metric: CrimeMetricKey) {
  const actual = actuals.years.find((row) => row.fiscalYear === fiscalYear) ?? null;
  const period = budgetData.crimePeriods.find((row) => row.fiscalYear === fiscalYear) ?? null;
  const cityIncidents = period?.cityCounts[metric] ?? 0;
  if (!actual || !period || cityIncidents <= 0) return null;
  const averagePerIncident = actual.gaapActual / cityIncidents;
  const neighborhoods = period.neighborhoods.map((row) => {
    const incidents = row.counts[metric] ?? 0;
    const attributedActual = incidents * averagePerIncident;
    return { ...row, incidents, incidentShare: incidents / cityIncidents, attributedActual, attributedPerResident: row.population ? attributedActual / row.population : null };
  });
  const unassignedIncidents = period.unassignedCounts[metric] ?? 0;
  return {
    actual,
    period,
    cityIncidents,
    averagePerIncident,
    neighborhoods,
    unassignedIncidents,
    unassignedActual: unassignedIncidents * averagePerIncident,
    assignedActual: neighborhoods.reduce((sum, row) => sum + row.attributedActual, 0),
  };
}
