export type PopulationMethod = "decennial_census" | "interpolated_decennial_anchors" | "acs_5year_allocated" | "latest_acs_carry_forward" | "decennial_carry_forward";

export type PopulationObservation = {
  year: number;
  estimate: number;
  marginOfError: number | null;
  method: PopulationMethod;
  sourceVintage: number;
};

export type DemographicEstimate = { estimate: number; marginOfError: number | null };

export type NeighborhoodDemographics = {
  id: string;
  slug: string;
  name: string;
  sourceName: string;
  members: string[];
  population: PopulationObservation[];
  latestAcs: { year: number; measures: Record<string, DemographicEstimate> } | null;
};

export type DemographicsData = {
  metadata: {
    generatedAt: string;
    geographyVersion: string;
    decennialAnchors: number[];
    acsYears: number[];
    latestAcsYear: number;
    currentPopulationYear: number;
    currentPopulationMethod: PopulationMethod;
    allocationMethod: string;
    marginOfErrorMethod: string;
    measures: Record<string, { label: string; universe: string; kind: "count" }>;
    sources: Array<{ label: string; url: string }>;
  };
  citywide: { population: PopulationObservation[]; latestAcs: { year: number; measures: Record<string, DemographicEstimate> } };
  neighborhoods: NeighborhoodDemographics[];
};

export function interpolatePopulation(start: number, end: number, year: number, startYear = 2010, endYear = 2020) {
  const share = (year - startYear) / (endYear - startYear);
  return Math.round(start + (end - start) * share);
}

export function aggregateMarginOfError(parts: Array<{ weight: number; marginOfError: number | null }>) {
  if (parts.some((part) => part.marginOfError === null)) return null;
  return Math.round(Math.sqrt(parts.reduce((sum, part) => sum + (part.weight * (part.marginOfError ?? 0)) ** 2, 0)));
}

export function ratioMarginOfError(numerator: DemographicEstimate, denominator: DemographicEstimate) {
  if (numerator.marginOfError === null || denominator.marginOfError === null || denominator.estimate <= 0) return null;
  const ratio = numerator.estimate / denominator.estimate;
  // Every percentage displayed by the demographic cards is a proportion: the
  // numerator is a subset of the denominator. Census guidance uses subtraction
  // to approximate its variance. If covariance makes that term negative, Census
  // directs users to fall back to the general ratio (addition) formula.
  const numeratorVariance = numerator.marginOfError ** 2;
  const denominatorVariance = (ratio * denominator.marginOfError) ** 2;
  const variance = numeratorVariance - denominatorVariance;
  const adjustedVariance = variance >= 0 ? variance : numeratorVariance + denominatorVariance;
  return Math.sqrt(adjustedVariance) / denominator.estimate * 100;
}

export function populationForYear(data: DemographicsData, regionId: string | "citywide", year: number) {
  const observations = regionId === "citywide" ? data.citywide.population : data.neighborhoods.find((row) => row.id === regionId)?.population;
  return observations?.find((row) => row.year === year) ?? null;
}
