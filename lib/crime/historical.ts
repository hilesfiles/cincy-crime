import { percentChange } from "../analytics/periods";
import type { Counts, CrimeSummary } from "./summary";

export type HistoricalNeighborhood = { id: string; slug: string; name: string; sourceName: string; members: string[]; counts: Counts; population: number | null; populationYear: number; rates: { violentPer1000: number | null } };
export type HistoricalPeriod = { year: number; periodType: "calendar_year" | "same_date_ytd"; start: string; end: string; status: string; sourceSystems: string[]; sourceGrain: string; city: Counts; unassigned: Counts; populationYear: number; rates: { violentPer1000: number | null }; reconciliation: { status: string; rule: string }; unmappedNeighborhoods: Array<{ label: string; count: number }>; unmappedOffenses: Array<{ label: string; count: number }>; neighborhoods: HistoricalNeighborhood[] };
export type HistoricalData = { metadata: { generatedAt: string; sourceRetrievedAt: string; geographyVersion: string; populationYear: number; annualYears: number[]; sameDateYtdYears: number[]; sameDateCutoff: string; transition: { date: string; note: string }; rateNote: string }; periods: { annual: HistoricalPeriod[]; sameDateYtd: HistoricalPeriod[] } };

const emptyCounts = (): Counts => ({ violent: 0, property: 0, totalPart1: 0, categories: {} });

export function annualAsCrimeSummary(historical: HistoricalData, current: CrimeSummary, year: number): CrimeSummary {
  const period = historical.periods.annual.find((row) => row.year === year) ?? historical.periods.annual.at(-1)!;
  const previous = historical.periods.annual.find((row) => row.year === period.year - 1);
  const previousById = new Map(previous?.neighborhoods.map((row) => [row.id, row]) ?? []);
  const neighborhoods = period.neighborhoods.map((row) => {
    const prior = previousById.get(row.id);
    const priorCounts = prior?.counts ?? emptyCounts();
    return {
      id: row.id, slug: row.slug, name: row.name, sourceName: row.sourceName, members: row.members,
      currentYtd: row.counts, priorYtd: priorCounts, current28: emptyCounts(), previous28: emptyCounts(), population: row.population, populationYear: row.populationYear, rates: { violentYtdPer1000: row.rates.violentPer1000 },
      changes: { violentYtd: percentChange(row.counts.violent, priorCounts.violent), propertyYtd: percentChange(row.counts.property, priorCounts.property), totalYtd: percentChange(row.counts.totalPart1, priorCounts.totalPart1), violent28: percentChange(0, 0) },
    };
  });
  const priorCity = previous?.city ?? emptyCounts();
  return {
    metadata: { ...current.metadata, sourceSystem: period.sourceSystems.join("+"), datasetId: period.sourceSystems.join("+"), title: `${period.year} historical reported crime`, retrievedAt: historical.metadata.sourceRetrievedAt, cutoff: period.end, sourceCoverage: { min_date: period.start, max_date: period.end, count: String(period.neighborhoods.length) }, unit: period.sourceGrain, provenanceLayer: "validated_historical" },
    windows: { ytd: { comparisonStart: period.start, comparisonEnd: period.end, priorStart: previous?.start ?? "", priorEnd: previous?.end ?? "" }, rolling28: { currentStart: "", currentEnd: "", previousStart: "", previousEnd: "" } },
    city: { currentYtd: period.city, priorYtd: priorCity, current28: emptyCounts(), previous28: emptyCounts(), population: current.city.population, rates: { violentYtdPer1000: period.rates.violentPer1000 } },
    neighborhoods,
  };
}

export function historicalPeriod(historical: HistoricalData, periodType: "annual" | "sameDateYtd", year: number) {
  return historical.periods[periodType].find((row) => row.year === year) ?? null;
}

