import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sourceOffenseMappings } from "../../config/crime-taxonomy";
import { percentChange, rolling28Windows, ytdWindows } from "../../lib/analytics/periods";
import { socrataMetadata, socrataQuery } from "./socrata";

type DailyRow = { day: string; sna_neighborhood?: string; stars_category?: string; type?: string; count: string };
type Coverage = { min_date: string; max_date: string; count: string };
type MapData = { regions: Array<{ id: string; slug: string; name: string; sourceName: string }> };
type Counts = { violent: number; property: number; totalPart1: number; categories: Record<string, number> };

const emptyCounts = (): Counts => ({ violent: 0, property: 0, totalPart1: 0, categories: {} });
const addRow = (target: Counts, row: DailyRow) => {
  const count = Number(row.count);
  if (row.type === "Part 1 Violent") target.violent += count;
  if (row.type === "Part 1 Property") target.property += count;
  if (row.type === "Part 1 Violent" || row.type === "Part 1 Property") target.totalPart1 += count;
  const mapping = sourceOffenseMappings[row.stars_category as keyof typeof sourceOffenseMappings];
  const key = mapping?.canonical ?? "unmapped";
  target.categories[key] = (target.categories[key] ?? 0) + count;
};
const inRange = (day: string, start: string, end: string) => day.slice(0, 10) >= start && day.slice(0, 10) <= end;
const summarize = (rows: DailyRow[], start: string, end: string, sourceName?: string) => {
  const counts = emptyCounts();
  for (const row of rows) if (inRange(row.day, start, end) && (!sourceName || row.sna_neighborhood === sourceName)) addRow(counts, row);
  return counts;
};

export async function fetchStars() {
  const root = process.cwd();
  const retrievedAt = new Date().toISOString();
  console.log("Fetching official STARS daily aggregates...");
  const query = "select date_trunc_ymd(datereported) as day, sna_neighborhood, stars_category, type, count(*) as count where datereported >= '2025-01-01T00:00:00' group by day, sna_neighborhood, stars_category, type order by day limit 50000";
  const [metadata, coverage, rows] = await Promise.all([
    socrataMetadata("7aqy-xrv9"),
    socrataQuery<Coverage>("7aqy-xrv9", "select min(datereported) as min_date, max(datereported) as max_date, count(*) as count"),
    socrataQuery<DailyRow>("7aqy-xrv9", query),
  ]);
  const cutoff = rows.reduce((max, row) => row.day.slice(0, 10) > max ? row.day.slice(0, 10) : max, "");
  const ytd = ytdWindows(cutoff);
  const rolling = rolling28Windows(cutoff);
  const mapData = JSON.parse(await readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8")) as MapData;
  const buildPeriods = (sourceName?: string) => ({
    currentYtd: summarize(rows, ytd.comparisonStart, ytd.comparisonEnd, sourceName),
    priorYtd: summarize(rows, ytd.priorStart, ytd.priorEnd, sourceName),
    current28: summarize(rows, rolling.currentStart, rolling.currentEnd, sourceName),
    previous28: summarize(rows, rolling.previousStart, rolling.previousEnd, sourceName),
  });
  const neighborhoods = mapData.regions.map((region) => {
    const periods = buildPeriods(region.sourceName);
    return { id: region.id, slug: region.slug, name: region.name, sourceName: region.sourceName, ...periods, changes: {
      violentYtd: percentChange(periods.currentYtd.violent, periods.priorYtd.violent),
      propertyYtd: percentChange(periods.currentYtd.property, periods.priorYtd.property),
      totalYtd: percentChange(periods.currentYtd.totalPart1, periods.priorYtd.totalPart1),
      violent28: percentChange(periods.current28.violent, periods.previous28.violent),
    }};
  });
  const sourceLabels = [...new Set(rows.map((row) => row.stars_category).filter(Boolean))] as string[];
  const unmapped = sourceLabels.filter((label) => !(label in sourceOffenseMappings));
  const output = {
    metadata: { sourceSystem: "CPD_STARS", datasetId: "7aqy-xrv9", title: metadata.name, retrievedAt, cutoff, sourceCoverage: coverage[0], unit: "STARS offense rows", mappingVersion: "2026-08-26.1" },
    windows: { ytd, rolling28: rolling }, city: buildPeriods(), neighborhoods,
  };
  await Promise.all([
    mkdir(path.join(root, "data/raw/crime/stars"), { recursive: true }),
    mkdir(path.join(root, "data/processed/crime"), { recursive: true }),
    mkdir(path.join(root, "public/data"), { recursive: true }),
    mkdir(path.join(root, "data/reports"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(root, "data/raw/crime/stars/daily-aggregates-2025-present.json"), `${JSON.stringify({ retrievedAt, query, rows })}\n`),
    writeFile(path.join(root, "data/processed/crime/current-summary.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "public/data/current-summary.json"), `${JSON.stringify(output)}\n`),
    writeFile(path.join(root, "data/reports/unmapped-offenses.json"), `${JSON.stringify({ generatedAt: retrievedAt, count: unmapped.length, labels: unmapped }, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ event: "stars_processed", aggregateRows: rows.length, cutoff, neighborhoods: neighborhoods.length, unmappedOffenses: unmapped.length }, null, 2));
  return output;
}

if (require.main === module) fetchStars().catch((error) => { console.error(error); process.exitCode = 1; });
