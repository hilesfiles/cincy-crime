import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sourceOffenseMappings } from "../../config/crime-taxonomy";
import { socrataMetadata, socrataQuery } from "./socrata";

type MapRegion = { id: string; slug: string; name: string; sourceName: string; members: string[] };
type MapData = { regions: MapRegion[] };
type Demographics = { neighborhoods: Array<{ id: string; population: Array<{ year: number; estimate: number }> }> };
type BudgetRow = { fiscal_year: string; department_name: string; object_category_group?: string; amount: string };
type PdiRow = { sna_neighborhood?: string; cpd_neighborhood?: string; community_council_neighborhood?: string; ucr_group?: string; count: string };
type StarsRow = { sna_neighborhood?: string; stars_category?: string; type?: string; count: string };
type Counts = Record<string, number>;

const policeDepartments = ["Department Of Police", "Police - Administration", "Police - Investigations", "Police - Resource Bureau", "Police - Support"];
const metricKeys = ["totalPart1", "violent", "property", "homicide", "rape", "robbery", "aggravated_assault", "burglary", "larceny_theft", "motor_vehicle_theft", "strangulation", "other"];
const emptyCounts = () => Object.fromEntries(metricKeys.map((key) => [key, 0])) as Counts;
const add = (target: Counts, source: Counts) => { for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value; };
const normalizeName = (value: string) => value.toLowerCase().replaceAll("mount", "mt").replaceAll("the", "").replace(/[^a-z0-9]+/g, "");

function regionLookup(regions: MapRegion[]) {
  const lookup = new Map<string, MapRegion>();
  for (const region of regions) for (const value of [region.name, region.sourceName, ...region.members]) lookup.set(normalizeName(value), region);
  const aliases: Record<string, string> = { cbdriverfront: "Downtown", centralbusinessdistrict: "Downtown", columbiatusculum: "Columbia Tusculum", fayapartments: "Villages at Roll Hill", rollhill: "Villages at Roll Hill", cliftonuniversityheights: "CUF", fairview: "CUF", scumminsville: "South Cumminsville" };
  for (const [alias, name] of Object.entries(aliases)) { const region = regions.find((item) => item.members.includes(name) || item.name === name); if (region) lookup.set(alias, region); }
  return lookup;
}

function pdiCounts(row: PdiRow) {
  const output = emptyCounts();
  const count = Number(row.count);
  const mapping: Record<string, { canonical: string; group: "violent" | "property" | "other"; part1: boolean }> = {
    HOMICIDE: { canonical: "homicide", group: "violent", part1: true }, RAPE: { canonical: "rape", group: "violent", part1: true }, ROBBERY: { canonical: "robbery", group: "violent", part1: true },
    "AGGRAVATED ASSAULTS": { canonical: "aggravated_assault", group: "violent", part1: true }, "BURGLARY/BREAKING ENTERING": { canonical: "burglary", group: "property", part1: true }, THEFT: { canonical: "larceny_theft", group: "property", part1: true },
    "UNAUTHORIZED USE": { canonical: "other", group: "other", part1: false }, "PART 2 MINOR": { canonical: "other", group: "other", part1: false },
  };
  const found = mapping[row.ucr_group ?? ""];
  if (!found) return output;
  output[found.canonical] += count; if (found.group === "violent") output.violent += count; if (found.group === "property") output.property += count; if (found.part1) output.totalPart1 += count;
  return output;
}

function starsCounts(row: StarsRow) {
  const output = emptyCounts();
  const count = Number(row.count);
  if (row.type === "Part 1 Violent") output.violent += count;
  if (row.type === "Part 1 Property") output.property += count;
  if (row.type === "Part 1 Violent" || row.type === "Part 1 Property") output.totalPart1 += count;
  const mapping = sourceOffenseMappings[row.stars_category as keyof typeof sourceOffenseMappings];
  output[mapping?.canonical ?? "other"] += count;
  return output;
}

const dateRange = (fiscalYear: number) => ({ start: `${fiscalYear - 1}-07-01`, end: `${fiscalYear}-06-30` });
const groupedQuery = (dateField: string, neighborhoodFields: string[], categoryFields: string[], start: string, end: string) => `select ${[...neighborhoodFields, ...categoryFields, "count(*) as count"].join(", ")} where ${dateField} between '${start}T00:00:00' and '${end}T23:59:59' group by ${[...neighborhoodFields, ...categoryFields].join(", ")} limit 50000`;

async function fetchCrimeRows(fiscalYear: number) {
  const range = dateRange(fiscalYear);
  const pdiStart = range.start;
  const pdiEnd = range.end < "2024-06-02" ? range.end : "2024-06-02";
  const starsStart = range.start > "2024-06-03" ? range.start : "2024-06-03";
  const starsEnd = range.end;
  const pdiRows = pdiStart <= pdiEnd ? await socrataQuery<PdiRow>("k59e-2pvf", groupedQuery("date_reported", ["sna_neighborhood", "cpd_neighborhood", "community_council_neighborhood"], ["ucr_group"], pdiStart, pdiEnd)) : [];
  const starsRows = starsStart <= starsEnd ? await socrataQuery<StarsRow>("7aqy-xrv9", groupedQuery("datereported", ["sna_neighborhood"], ["stars_category", "type"], starsStart, starsEnd)) : [];
  return { range, pdiRows, starsRows };
}

export async function fetchBudget() {
  const root = process.cwd();
  const generatedAt = new Date().toISOString();
  const [map, demographics, budgetMetadata] = await Promise.all([
    readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8").then(JSON.parse) as Promise<MapData>,
    readFile(path.join(root, "data/processed/demographics/neighborhood-demographics.json"), "utf8").then(JSON.parse) as Promise<Demographics>,
    socrataMetadata("hv35-hdk2"),
  ]);
  const departmentFilter = policeDepartments.map((name) => `'${name.replaceAll("'", "''")}'`).join(",");
  const budgetQuery = `select fiscal_year, department_name, object_category_group, sum(current_budget) as amount where fiscal_year between 2004 and 2027 and department_name in (${departmentFilter}) group by fiscal_year, department_name, object_category_group order by fiscal_year, department_name`;
  const budgetRows = await socrataQuery<BudgetRow>("hv35-hdk2", budgetQuery);
  const budgets = Array.from({ length: 24 }, (_, index) => 2004 + index).map((fiscalYear) => {
    const rows = budgetRows.filter((row) => Number(row.fiscal_year) === fiscalYear);
    const personnel = rows.filter((row) => row.object_category_group === "PERSONNEL").reduce((sum, row) => sum + Number(row.amount), 0);
    const nonPersonnel = rows.filter((row) => row.object_category_group === "NON-PERSONNEL").reduce((sum, row) => sum + Number(row.amount), 0);
    const total = personnel + nonPersonnel;
    return { fiscalYear, total: total > 0 ? total : null, personnel: total > 0 ? personnel : null, nonPersonnel: total > 0 ? nonPersonnel : null, status: fiscalYear === 2013 ? "transition_stub" : total > 0 ? "available" : "unavailable" };
  });
  const lookup = regionLookup(map.regions);
  const crimePeriods = [];
  for (let fiscalYear = 2014; fiscalYear <= 2025; fiscalYear += 1) {
    const { range, pdiRows, starsRows } = await fetchCrimeRows(fiscalYear);
    const cityCounts = emptyCounts(); const unassignedCounts = emptyCounts(); const byRegion = new Map(map.regions.map((region) => [region.id, emptyCounts()]));
    const processRow = (row: PdiRow | StarsRow, source: "pdi" | "stars") => {
      const counts = source === "pdi" ? pdiCounts(row as PdiRow) : starsCounts(row as StarsRow); add(cityCounts, counts);
      const candidates = source === "pdi" ? [(row as PdiRow).sna_neighborhood, (row as PdiRow).cpd_neighborhood, (row as PdiRow).community_council_neighborhood] : [(row as StarsRow).sna_neighborhood];
      const region = candidates.filter((value): value is string => Boolean(value) && value !== "N/A").map((value) => lookup.get(normalizeName(value))).find(Boolean);
      if (region) add(byRegion.get(region.id)!, counts); else add(unassignedCounts, counts);
    };
    pdiRows.forEach((row) => processRow(row, "pdi")); starsRows.forEach((row) => processRow(row, "stars"));
    const neighborhoods = map.regions.map((region) => ({ id: region.id, slug: region.slug, name: region.name, population: demographics.neighborhoods.find((row) => row.id === region.id)?.population.find((row) => row.year === fiscalYear)?.estimate ?? null, counts: byRegion.get(region.id)! }));
    crimePeriods.push({ fiscalYear, start: range.start, end: range.end, sourceSystems: [...new Set([pdiRows.length ? "CPD_PDI" : null, starsRows.length ? "CPD_STARS" : null].filter(Boolean))], sourceGrain: pdiRows.length && starsRows.length ? "mixed incident and offense rows" : pdiRows.length ? "reported crime incident rows" : "STARS offense rows", cityCounts, unassignedCounts, neighborhoods });
  }
  const output = { metadata: { generatedAt, budgetDatasetId: "hv35-hdk2", budgetSourceUrl: "https://data.cincinnati-oh.gov/resource/hv35-hdk2.json", budgetField: "CURRENT_BUDGET", budgetDefinition: "Official Cincinnati Financial System budget ledger for Police department and bureau rows; these are budgeted dollars, not audited actual expenditures.", fiscalYearNote: "FY2013 is the City's six-month January–June transition stub. FY2014 onward runs July 1 through June 30.", allocationDefinition: "Each neighborhood receives the same citywide budget-per-reported-crime rate multiplied by its reported crimes for the selected fiscal year and offense basis.", allocationWarning: "Neighborhood values are crime-share attributed budget, not actual police spending, staffing, service delivery, or district allocations.", policeDepartments, crimeCoverage: { firstFiscalYear: 2014, lastCompleteFiscalYear: 2025 }, sourceUpdatedAt: budgetMetadata.rowsUpdatedAt }, budgets, crimePeriods };
  const validation = { generatedAt, status: "warning", budgetYears: budgets.filter((row) => row.total !== null).length, unavailableBudgetYears: budgets.filter((row) => row.total === null).map((row) => row.fiscalYear), crimeFiscalYears: crimePeriods.map((row) => row.fiscalYear), reconciledPeriods: crimePeriods.filter((period) => metricKeys.every((key) => period.neighborhoods.reduce((sum, row) => sum + row.counts[key], 0) + period.unassignedCounts[key] === period.cityCounts[key])).length, warning: output.metadata.allocationWarning };
  await Promise.all([mkdir(path.join(root, "data/raw/budget"), { recursive: true }), mkdir(path.join(root, "data/processed/budget"), { recursive: true }), mkdir(path.join(root, "public/data"), { recursive: true }), mkdir(path.join(root, "data/reports"), { recursive: true })]);
  await Promise.all([
    writeFile(path.join(root, "data/raw/budget/police-budget-aggregates.json"), `${JSON.stringify({ generatedAt, query: budgetQuery, rows: budgetRows }, null, 2)}\n`),
    writeFile(path.join(root, "data/processed/budget/police-budget.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "public/data/police-budget.json"), `${JSON.stringify(output)}\n`),
    writeFile(path.join(root, "data/reports/budget-validation.json"), `${JSON.stringify(validation, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ event: "police_budget_built", budgetYears: validation.budgetYears, crimePeriods: crimePeriods.length, reconciledPeriods: validation.reconciledPeriods }, null, 2));
}

if (require.main === module) fetchBudget().catch((error) => { console.error(error); process.exitCode = 1; });
