import type { PercentChange } from "../analytics/periods";

export type Counts = { violent: number; property: number; totalPart1: number; categories: Partial<Record<string, number>> };
export type Periods = { currentYtd: Counts; priorYtd: Counts; current28: Counts; previous28: Counts };
export type NeighborhoodSummary = Periods & {
  id: string; slug: string; name: string; sourceName: string;
  changes: { violentYtd: PercentChange; propertyYtd: PercentChange; totalYtd: PercentChange; violent28: PercentChange };
};
export type CrimeSummary = {
  metadata: { sourceSystem: string; datasetId: string; title: string; retrievedAt: string; cutoff: string; sourceCoverage: { min_date: string; max_date: string; count: string }; unit: string; mappingVersion: string };
  windows: { ytd: { comparisonStart: string; comparisonEnd: string; priorStart: string; priorEnd: string }; rolling28: { currentStart: string; currentEnd: string; previousStart: string; previousEnd: string } };
  city: Periods;
  neighborhoods: NeighborhoodSummary[];
};

export function formatChange(change: PercentChange) {
  if (change.kind === "new-activity") return "New activity";
  const value = change.value ?? 0;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
