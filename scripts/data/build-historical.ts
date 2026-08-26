import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sourceOffenseMappings } from "../../config/crime-taxonomy";
import { ratePer1000 } from "../../lib/analytics/periods";

type DailyRow = { day: string; sna_neighborhood?: string; stars_category?: string; type?: string; count: string };
type MapData = { regions: Array<{ id: string; slug: string; name: string; sourceName: string; members: string[] }> };
type PopulationData = { metadata: { populationYear: number }; snaRegions: Array<{ id: string; population: number }> };
type Counts = { violent: number; property: number; totalPart1: number; categories: Record<string, number> };

const validatedFullYears = [2025];
const emptyCounts = (): Counts => ({ violent: 0, property: 0, totalPart1: 0, categories: {} });

function addRow(target: Counts, row: DailyRow) {
  const count = Number(row.count);
  if (row.type === "Part 1 Violent") target.violent += count;
  if (row.type === "Part 1 Property") target.property += count;
  if (row.type === "Part 1 Violent" || row.type === "Part 1 Property") target.totalPart1 += count;
  const mapping = sourceOffenseMappings[row.stars_category as keyof typeof sourceOffenseMappings];
  const key = mapping?.canonical ?? "unmapped";
  target.categories[key] = (target.categories[key] ?? 0) + count;
}

function summarize(rows: DailyRow[], year: number, sourceName?: string) {
  const counts = emptyCounts();
  for (const row of rows) {
    if (Number(row.day.slice(0, 4)) === year && (!sourceName || row.sna_neighborhood === sourceName)) addRow(counts, row);
  }
  return counts;
}

function summarizeUnassigned(rows: DailyRow[], year: number, sourceNames: Set<string>) {
  const counts = emptyCounts();
  let aggregateRows = 0;
  for (const row of rows) {
    if (Number(row.day.slice(0, 4)) === year && (!row.sna_neighborhood || !sourceNames.has(row.sna_neighborhood))) {
      addRow(counts, row);
      aggregateRows += 1;
    }
  }
  return { aggregateRows, counts };
}

function sumNeighborhoodCounts(rows: Array<{ counts: Counts }>) {
  const total = emptyCounts();
  for (const row of rows) {
    total.violent += row.counts.violent; total.property += row.counts.property; total.totalPart1 += row.counts.totalPart1;
    for (const [key, value] of Object.entries(row.counts.categories)) total.categories[key] = (total.categories[key] ?? 0) + value;
  }
  return total;
}

export async function buildHistorical() {
  const root = process.cwd();
  const generatedAt = new Date().toISOString();
  const [raw, map, population] = await Promise.all([
    readFile(path.join(root, "data/raw/crime/stars/daily-aggregates-2025-present.json"), "utf8").then(JSON.parse) as Promise<{ retrievedAt: string; query: string; rows: DailyRow[] }>,
    readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8").then(JSON.parse) as Promise<MapData>,
    readFile(path.join(root, "data/processed/demographics/population-2020.json"), "utf8").then(JSON.parse) as Promise<PopulationData>,
  ]);
  const populationByRegion = new Map(population.snaRegions.map((row) => [row.id, row.population]));
  const sourceNames = new Set(map.regions.map((region) => region.sourceName));
  const years = validatedFullYears.map((year) => {
    const neighborhoods = map.regions.map((region) => {
      const counts = summarize(raw.rows, year, region.sourceName);
      const denominator = populationByRegion.get(region.id) ?? null;
      return { id: region.id, slug: region.slug, name: region.name, sourceName: region.sourceName, members: region.members, counts, population: denominator, populationYear: population.metadata.populationYear, rates: { violentPer1000: ratePer1000(counts.violent, denominator) } };
    });
    const city = summarize(raw.rows, year);
    const assigned = sumNeighborhoodCounts(neighborhoods);
    const unassigned = summarizeUnassigned(raw.rows, year, sourceNames);
    const reconciles = assigned.violent + unassigned.counts.violent === city.violent && assigned.property + unassigned.counts.property === city.property && assigned.totalPart1 + unassigned.counts.totalPart1 === city.totalPart1;
    if (!reconciles) throw new Error(`Historical ${year} assigned + unassigned totals do not reconcile to city totals`);
    return { year, status: unassigned.aggregateRows ? "validated_full_year_with_unassigned" : "validated_full_year", sourceSystem: "CPD_STARS", period: { start: `${year}-01-01`, end: `${year}-12-31` }, city, assignedNeighborhoodTotal: assigned, unassigned, reconciliation: { status: "pass", rule: "assigned neighborhood totals plus unassigned source rows equal city totals" }, neighborhoods };
  });
  const output = {
    metadata: { generatedAt, sourceRetrievedAt: raw.retrievedAt, sourceSystem: "CPD_STARS", datasetId: "7aqy-xrv9", unit: "STARS offense rows", populationYear: population.metadata.populationYear, geographyVersion: "SNA_2020", validatedYears: validatedFullYears, mappingVersion: "2026-08-26.1", note: "The historical panel begins with the easiest complete digital STARS year. Source rows without an SNA name remain in an explicit unassigned bucket and are never allocated or converted to zero. PDI and mixed-system years remain disabled until their separate validation gates pass." },
    years,
  };
  await Promise.all([mkdir(path.join(root, "data/processed/crime"), { recursive: true }), mkdir(path.join(root, "public/data"), { recursive: true })]);
  await Promise.all([
    writeFile(path.join(root, "data/processed/crime/historical-annual.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "public/data/historical-annual.json"), `${JSON.stringify(output)}\n`),
  ]);
  console.log(JSON.stringify({ event: "historical_panel_built", validatedYears: validatedFullYears, regionsPerYear: map.regions.length }, null, 2));
  return output;
}

if (require.main === module) buildHistorical().catch((error) => { console.error(error); process.exitCode = 1; });
