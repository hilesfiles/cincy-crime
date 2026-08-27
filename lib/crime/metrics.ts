import { percentChange, ratePer1000, type PercentChange } from "../analytics/periods";
import type { Counts } from "./summary";

export type CrimeMetricKey =
  | "totalPart1"
  | "violent"
  | "property"
  | "homicide"
  | "rape"
  | "robbery"
  | "aggravated_assault"
  | "burglary"
  | "larceny_theft"
  | "motor_vehicle_theft"
  | "strangulation";

export type CrimeMetricDefinition = {
  key: CrimeMetricKey;
  label: string;
  shortLabel: string;
  group: "summary" | "violent" | "property" | "supplemental";
  availableFrom: number;
  note?: string;
};

export const crimeMetrics: CrimeMetricDefinition[] = [
  { key: "totalPart1", label: "Total Part I", shortLabel: "Part I", group: "summary", availableFrom: 2011 },
  { key: "violent", label: "Violent crime", shortLabel: "Violent", group: "summary", availableFrom: 2011 },
  { key: "property", label: "Property crime", shortLabel: "Property", group: "summary", availableFrom: 2011 },
  { key: "homicide", label: "Homicide", shortLabel: "Homicide", group: "violent", availableFrom: 2011 },
  { key: "rape", label: "Rape", shortLabel: "Rape", group: "violent", availableFrom: 2011 },
  { key: "robbery", label: "Robbery", shortLabel: "Robbery", group: "violent", availableFrom: 2011 },
  { key: "aggravated_assault", label: "Aggravated assault", shortLabel: "Agg. assault", group: "violent", availableFrom: 2011 },
  { key: "burglary", label: "Burglary / breaking and entering", shortLabel: "Burglary", group: "property", availableFrom: 2011 },
  { key: "larceny_theft", label: "Larceny / theft", shortLabel: "Larceny / theft", group: "property", availableFrom: 2011 },
  { key: "motor_vehicle_theft", label: "Motor vehicle theft", shortLabel: "Vehicle theft", group: "property", availableFrom: 2024, note: "Published separately beginning with STARS in 2024." },
  { key: "strangulation", label: "Strangulation", shortLabel: "Strangulation", group: "supplemental", availableFrom: 2024, note: "Preserved as a separate CPD category and not included in the Part I violent subtotal." },
];

export const crimeMetricKeys = new Set<CrimeMetricKey>(crimeMetrics.map((metric) => metric.key));

export function crimeMetric(key: CrimeMetricKey) {
  return crimeMetrics.find((metric) => metric.key === key) ?? crimeMetrics[1];
}

export function metricAvailableInYear(key: CrimeMetricKey, year: number) {
  return year >= crimeMetric(key).availableFrom;
}

export function metricCount(counts: Counts, key: CrimeMetricKey): number {
  if (key === "totalPart1" || key === "violent" || key === "property") return counts[key];
  if (key === "larceny_theft") {
    if (counts.categories.larceny_theft !== undefined) return counts.categories.larceny_theft;
    return (counts.categories.theft_from_auto ?? 0) + (counts.categories.personal_other_theft ?? 0);
  }
  return counts.categories[key] ?? 0;
}

export function metricRate(counts: Counts, population: number | null | undefined, key: CrimeMetricKey) {
  return ratePer1000(metricCount(counts, key), population ?? null);
}

export function metricChange(current: Counts, prior: Counts, key: CrimeMetricKey): PercentChange {
  return percentChange(metricCount(current, key), metricCount(prior, key));
}

export function changeNumber(change: PercentChange) {
  return change.kind === "new-activity" ? null : change.value;
}

export function formatMetricChange(change: PercentChange) {
  if (change.kind === "new-activity") return "New activity";
  const value = change.value ?? 0;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
