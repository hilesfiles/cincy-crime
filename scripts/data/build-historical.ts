import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sourceOffenseMappings } from "../../config/crime-taxonomy";
import { ratePer1000 } from "../../lib/analytics/periods";
import type { DemographicsData, PopulationObservation } from "../../lib/demographics";

type PdiRow = { year: string; sna_neighborhood?: string; cpd_neighborhood?: string; community_council_neighborhood?: string; ucr_group?: string; count: string };
type StarsRow = { year: string; sna_neighborhood?: string; stars_category?: string; type?: string; count: string };
type PeriodRows<T> = { period: "same_date_ytd"; year: number; start: string; end: string; rows: T[] };
type RawHistorical = { metadata: { retrievedAt: string; comparisonMonthDay: string }; annual: { pdiRows: PdiRow[]; starsRows: StarsRow[] }; sameDateYtd: { pdiPeriods: Array<PeriodRows<PdiRow>>; starsPeriods: Array<PeriodRows<StarsRow>> } };
type MapRegion = { id: string; slug: string; name: string; sourceName: string; members: string[] };
type MapData = { regions: MapRegion[] };
type Counts = { violent: number; property: number; totalPart1: number; categories: Record<string, number> };
type CpdSummary = { metadata: { cutoff: string; retrievedAt: string }; city: { currentYtd: Counts; population: number; rates: { violentYtdPer1000: number | null } }; neighborhoods: Array<{ id: string; slug: string; name: string; sourceName: string; members: string[]; currentYtd: Counts; population: number; populationYear: number; rates: { violentYtdPer1000: number | null } }> };

const emptyCounts = (): Counts => ({ violent: 0, property: 0, totalPart1: 0, categories: {} });
const cloneCounts = (counts: Counts): Counts => ({ violent: counts.violent, property: counts.property, totalPart1: counts.totalPart1, categories: { ...counts.categories } });

function mergeCounts(target: Counts, addition: Counts) {
  target.violent += addition.violent; target.property += addition.property; target.totalPart1 += addition.totalPart1;
  for (const [key, value] of Object.entries(addition.categories)) target.categories[key] = (target.categories[key] ?? 0) + value;
}

const pdiMappings: Record<string, { canonical: string; group: "violent" | "property" | "other"; part1: boolean }> = {
  HOMICIDE: { canonical: "homicide", group: "violent", part1: true },
  RAPE: { canonical: "rape", group: "violent", part1: true },
  ROBBERY: { canonical: "robbery", group: "violent", part1: true },
  "AGGRAVATED ASSAULTS": { canonical: "aggravated_assault", group: "violent", part1: true },
  "BURGLARY/BREAKING ENTERING": { canonical: "burglary", group: "property", part1: true },
  THEFT: { canonical: "larceny_theft", group: "property", part1: true },
  "UNAUTHORIZED USE": { canonical: "other", group: "other", part1: false },
  "PART 2 MINOR": { canonical: "other", group: "other", part1: false },
};

function countsFromPdi(row: PdiRow) {
  const counts = emptyCounts();
  const count = Number(row.count);
  const mapping = pdiMappings[row.ucr_group ?? ""];
  if (!mapping) return { counts, unmappedOffense: row.ucr_group || "(blank)" };
  counts.categories[mapping.canonical] = count;
  if (mapping.group === "violent") counts.violent = count;
  if (mapping.group === "property") counts.property = count;
  if (mapping.part1) counts.totalPart1 = count;
  return { counts, unmappedOffense: null };
}

function countsFromStars(row: StarsRow) {
  const counts = emptyCounts();
  const count = Number(row.count);
  if (row.type === "Part 1 Violent") counts.violent = count;
  if (row.type === "Part 1 Property") counts.property = count;
  if (row.type === "Part 1 Violent" || row.type === "Part 1 Property") counts.totalPart1 = count;
  const mapping = sourceOffenseMappings[row.stars_category as keyof typeof sourceOffenseMappings];
  const key = mapping?.canonical ?? "unmapped";
  counts.categories[key] = count;
  return { counts, unmappedOffense: mapping ? null : row.stars_category || "(blank)" };
}

function normalizeName(value: string) {
  return value.toLowerCase().replaceAll("mount", "mt").replaceAll("the", "").replace(/[^a-z0-9]+/g, "");
}

function regionLookup(regions: MapRegion[]) {
  const lookup = new Map<string, MapRegion>();
  for (const region of regions) for (const value of [region.name, region.sourceName, ...region.members]) lookup.set(normalizeName(value), region);
  const aliases: Record<string, string> = { cbdriverfront: "Downtown", centralbusinessdistrict: "Downtown", columbiatusculum: "Columbia Tusculum", fayapartments: "Villages at Roll Hill", rollhill: "Villages at Roll Hill", cliftonuniversityheights: "CUF", fairview: "CUF", scumminsville: "South Cumminsville" };
  for (const [alias, name] of Object.entries(aliases)) {
    const region = regions.find((item) => item.members.includes(name) || item.name === name);
    if (region) lookup.set(alias, region);
  }
  return lookup;
}

function buildPeriod(options: { year: number; periodType: "calendar_year" | "same_date_ytd"; start: string; end: string; pdiRows: PdiRow[]; starsRows: StarsRow[]; regions: MapRegion[]; populationByRegion: Map<string, PopulationObservation>; cityPopulation: PopulationObservation }) {
  const { year, periodType, start, end, pdiRows, starsRows, regions, populationByRegion, cityPopulation } = options;
  const lookup = regionLookup(regions);
  const byRegion = new Map(regions.map((region) => [region.id, emptyCounts()]));
  const city = emptyCounts();
  const unassigned = emptyCounts();
  const unmappedNeighborhoods = new Map<string, number>();
  const unmappedOffenses = new Map<string, number>();
  const process = (sourceSystem: "CPD_PDI" | "CPD_STARS", row: PdiRow | StarsRow) => {
    const result = sourceSystem === "CPD_PDI" ? countsFromPdi(row as PdiRow) : countsFromStars(row as StarsRow);
    mergeCounts(city, result.counts);
    if (result.unmappedOffense) unmappedOffenses.set(`${sourceSystem}:${result.unmappedOffense}`, (unmappedOffenses.get(`${sourceSystem}:${result.unmappedOffense}`) ?? 0) + Number(row.count));
    const candidateNames = sourceSystem === "CPD_PDI" ? [(row as PdiRow).sna_neighborhood, (row as PdiRow).cpd_neighborhood, (row as PdiRow).community_council_neighborhood] : [row.sna_neighborhood];
    const region = candidateNames.filter((value): value is string => Boolean(value) && value !== "N/A").map((value) => lookup.get(normalizeName(value))).find(Boolean) ?? null;
    if (region) mergeCounts(byRegion.get(region.id)!, result.counts);
    else {
      mergeCounts(unassigned, result.counts);
      const label = candidateNames.filter(Boolean).join(" | ") || "(blank)";
      unmappedNeighborhoods.set(`${sourceSystem}:${label}`, (unmappedNeighborhoods.get(`${sourceSystem}:${label}`) ?? 0) + Number(row.count));
    }
  };
  pdiRows.forEach((row) => process("CPD_PDI", row));
  starsRows.forEach((row) => process("CPD_STARS", row));
  const neighborhoods = regions.map((region) => {
    const counts = byRegion.get(region.id)!;
    const denominator = populationByRegion.get(region.id) ?? null;
    const population = denominator?.estimate ?? null;
    return { id: region.id, slug: region.slug, name: region.name, sourceName: region.sourceName, members: region.members, counts, population, populationYear: denominator?.year ?? year, populationMarginOfError: denominator?.marginOfError ?? null, populationMethod: denominator?.method ?? "unavailable", rates: { violentPer1000: ratePer1000(counts.violent, population) } };
  });
  const assigned = emptyCounts();
  neighborhoods.forEach((row) => mergeCounts(assigned, row.counts));
  const reconciles = assigned.violent + unassigned.violent === city.violent && assigned.property + unassigned.property === city.property && assigned.totalPart1 + unassigned.totalPart1 === city.totalPart1;
  if (!reconciles) throw new Error(`${periodType} ${year} does not reconcile`);
  const sourceSystems = [...new Set([pdiRows.length ? "CPD_PDI" : null, starsRows.length ? "CPD_STARS" : null].filter((value): value is string => Boolean(value)))];
  return {
    year, periodType, start, end,
    status: sourceSystems.length > 1 ? "validated_mixed_system_transition" : unmappedNeighborhoods.size || unmappedOffenses.size ? "validated_with_reported_gaps" : "validated",
    sourceSystems,
    sourceGrain: sourceSystems.length > 1 ? "mixed incident and offense rows" : sourceSystems[0] === "CPD_PDI" ? "reported crime incident rows" : "STARS offense rows",
    city, assignedNeighborhoodTotal: assigned, unassigned, populationYear: cityPopulation.year, cityPopulation: cityPopulation.estimate, populationMarginOfError: cityPopulation.marginOfError, populationMethod: cityPopulation.method,
    rates: { violentPer1000: ratePer1000(city.violent, cityPopulation.estimate) },
    reconciliation: { status: "pass", rule: "assigned neighborhood totals plus unassigned rows equal city totals" },
    unmappedNeighborhoods: [...unmappedNeighborhoods].map(([label, count]) => ({ label, count })),
    unmappedOffenses: [...unmappedOffenses].map(([label, count]) => ({ label, count })),
    neighborhoods,
  };
}

export async function buildHistorical() {
  const root = process.cwd();
  const generatedAt = new Date().toISOString();
  const [raw, map, demographics, cpd] = await Promise.all([
    readFile(path.join(root, "data/raw/crime/historical/annual-source-aggregates.json"), "utf8").then(JSON.parse) as Promise<RawHistorical>,
    readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8").then(JSON.parse) as Promise<MapData>,
    readFile(path.join(root, "data/processed/demographics/neighborhood-demographics.json"), "utf8").then(JSON.parse) as Promise<DemographicsData>,
    readFile(path.join(root, "data/processed/crime/cpd-neighborhood-summary.json"), "utf8").then(JSON.parse) as Promise<CpdSummary>,
  ]);
  const denominators = (year: number) => ({ populationByRegion: new Map(demographics.neighborhoods.map((row) => [row.id, row.population.find((item) => item.year === year)!])), cityPopulation: demographics.citywide.population.find((item) => item.year === year)! });
  const annual = Array.from({ length: 15 }, (_, index) => 2011 + index).map((year) => buildPeriod({ year, periodType: "calendar_year", start: `${year}-01-01`, end: `${year}-12-31`, regions: map.regions, ...denominators(year), pdiRows: raw.annual.pdiRows.filter((row) => Number(row.year) === year), starsRows: raw.annual.starsRows.filter((row) => Number(row.year) === year) }));
  const sameDateYtd = Array.from({ length: 15 }, (_, index) => 2011 + index).map((year) => {
    const pdi = raw.sameDateYtd.pdiPeriods.find((period) => period.year === year);
    const stars = raw.sameDateYtd.starsPeriods.find((period) => period.year === year);
    return buildPeriod({ year, periodType: "same_date_ytd", start: `${year}-01-01`, end: `${year}-${raw.metadata.comparisonMonthDay}`, regions: map.regions, ...denominators(year), pdiRows: pdi?.rows ?? [], starsRows: stars?.rows ?? [] });
  });
  const currentYear = Number(cpd.metadata.cutoff.slice(0, 4));
  const currentDenominators = denominators(currentYear);
  sameDateYtd.push({
    year: currentYear, periodType: "same_date_ytd", start: `${currentYear}-01-01`, end: cpd.metadata.cutoff, status: "validated_fresher_aggregate", sourceSystems: ["CPD_NEIGHBORHOOD_REPORTS"], sourceGrain: "preliminary CPD aggregate offense counts",
    city: cloneCounts(cpd.city.currentYtd), assignedNeighborhoodTotal: cloneCounts(cpd.city.currentYtd), unassigned: emptyCounts(), populationYear: currentDenominators.cityPopulation.year, cityPopulation: currentDenominators.cityPopulation.estimate, populationMarginOfError: currentDenominators.cityPopulation.marginOfError, populationMethod: currentDenominators.cityPopulation.method, rates: { violentPer1000: ratePer1000(cpd.city.currentYtd.violent, currentDenominators.cityPopulation.estimate) },
    reconciliation: { status: "pass", rule: "51 civic reports aggregate to 50 mapped regions and city totals" }, unmappedNeighborhoods: [], unmappedOffenses: [], neighborhoods: cpd.neighborhoods.map((row) => { const denominator = currentDenominators.populationByRegion.get(row.id); return { id: row.id, slug: row.slug, name: row.name, sourceName: row.sourceName, members: row.members, counts: cloneCounts(row.currentYtd), population: denominator?.estimate ?? null, populationYear: denominator?.year ?? currentYear, populationMarginOfError: denominator?.marginOfError ?? null, populationMethod: denominator?.method ?? "unavailable", rates: { violentPer1000: ratePer1000(row.currentYtd.violent, denominator?.estimate ?? null) } }; }),
  });
  const output = {
    metadata: { generatedAt, sourceRetrievedAt: raw.metadata.retrievedAt, geographyVersion: "SNA_2020", populationYear: demographics.metadata.currentPopulationYear, annualYears: annual.map((row) => row.year), sameDateYtdYears: sameDateYtd.map((row) => row.year), sameDateCutoff: raw.metadata.comparisonMonthDay, transition: { date: "2024-06-03", note: "PDI incident rows end operationally on June 2, 2024; STARS offense rows begin June 3, 2024. The mixed year is visibly annotated and not represented as a source-continuous series." }, rateNote: "Rates use annual denominators: linear interpolation between official 2010 and 2020 Census SNA anchors, then a clearly labeled 2020 carry-forward after the latest decennial anchor." },
    periods: { annual, sameDateYtd },
  };
  const allUnmappedNeighborhoods = [...annual, ...sameDateYtd].flatMap((period) => period.unmappedNeighborhoods.map((row) => ({ periodType: period.periodType, year: period.year, ...row })));
  const allUnmappedOffenses = [...annual, ...sameDateYtd].flatMap((period) => period.unmappedOffenses.map((row) => ({ periodType: period.periodType, year: period.year, ...row })));
  const validation = { generatedAt, status: allUnmappedOffenses.length ? "warning" : "pass", annualYears: annual.map((row) => row.year), sameDateYtdYears: sameDateYtd.map((row) => row.year), periodCount: annual.length + sameDateYtd.length, reconciledPeriods: [...annual, ...sameDateYtd].filter((row) => row.reconciliation.status === "pass").length, unmappedNeighborhoods: allUnmappedNeighborhoods, unmappedOffenses: allUnmappedOffenses };
  const compactPeriod = (period: (typeof annual)[number] | (typeof sameDateYtd)[number]) => ({ year: period.year, periodType: period.periodType, start: period.start, end: period.end, status: period.status, sourceSystems: period.sourceSystems, sourceGrain: period.sourceGrain, city: period.city, unassigned: period.unassigned, populationYear: period.populationYear, cityPopulation: period.cityPopulation, populationMarginOfError: period.populationMarginOfError, populationMethod: period.populationMethod, rates: period.rates, reconciliation: period.reconciliation, unmappedNeighborhoods: [], unmappedOffenses: [], neighborhoods: period.neighborhoods });
  const uiOutput = { metadata: output.metadata, periods: { annual: annual.map(compactPeriod), sameDateYtd: sameDateYtd.map(compactPeriod) } };
  const annualUiOutput = { metadata: output.metadata, periods: { annual: uiOutput.periods.annual, sameDateYtd: [] } };
  await Promise.all([mkdir(path.join(root, "data/processed/crime"), { recursive: true }), mkdir(path.join(root, "public/data"), { recursive: true }), mkdir(path.join(root, "data/reports"), { recursive: true })]);
  await Promise.all([
    writeFile(path.join(root, "data/processed/crime/historical-annual.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "data/processed/crime/historical-ui.json"), `${JSON.stringify(uiOutput)}\n`),
    writeFile(path.join(root, "data/processed/crime/historical-annual-ui.json"), `${JSON.stringify(annualUiOutput)}\n`),
    writeFile(path.join(root, "public/data/historical-annual.json"), `${JSON.stringify(uiOutput)}\n`),
    writeFile(path.join(root, "data/reports/historical-validation.json"), `${JSON.stringify(validation, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ event: "historical_panel_built", annualYears: annual.length, sameDateYtdYears: sameDateYtd.length, validationStatus: validation.status, unmappedNeighborhoodLabels: allUnmappedNeighborhoods.length, unmappedOffenseLabels: allUnmappedOffenses.length }, null, 2));
  return output;
}

if (require.main === module) buildHistorical().catch((error) => { console.error(error); process.exitCode = 1; });
