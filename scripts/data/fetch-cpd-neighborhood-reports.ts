import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { percentChange, ratePer1000, rolling28Windows } from "../../lib/analytics/periods";
import { canonicalNeighborhoods, slugify } from "../../lib/geography/names";
import { fetchBytes, mapWithConcurrency, pdfPageTokens, sha256 } from "./pdf-text";

const indexUrl = "https://cpdmobile.cincinnati-oh.gov/Neighborhoods/default.html";
const aliases: Record<string, string> = {
  "CBD Riverfront": "Downtown",
  "Columbia / Tusculum": "Columbia Tusculum",
  "Fay Apartments": "Villages at Roll Hill",
  "Mount Adams": "Mt. Adams",
  "Mount Airy": "Mt. Airy",
  "Mount Auburn": "Mt. Auburn",
  "Mount Lookout": "Mt. Lookout",
  "Mount Washington": "Mt. Washington",
  "Over The Rhine": "Over-the-Rhine",
};
const categoryLabels = ["Homicide", "Rape", "Robbery", "Agg Assault", "Strangulation", "Part 1 Violent", "Burglary/BE", "Theft from Auto", "Auto Theft", "Personal/Other Theft", "Part 1 Property", "Part 1 Total"] as const;
const categoryKeys: Record<(typeof categoryLabels)[number], string> = {
  Homicide: "homicide", Rape: "rape", Robbery: "robbery", "Agg Assault": "aggravated_assault", Strangulation: "strangulation",
  "Part 1 Violent": "violent", "Burglary/BE": "burglary", "Theft from Auto": "theft_from_auto", "Auto Theft": "motor_vehicle_theft",
  "Personal/Other Theft": "personal_other_theft", "Part 1 Property": "property", "Part 1 Total": "totalPart1",
};

type Counts = { violent: number; property: number; totalPart1: number; categories: Record<string, number> };
type MapData = { regions: Array<{ id: string; slug: string; name: string; sourceName: string; number: number; members: string[] }> };
type PopulationData = { metadata: { populationYear: number; citywidePopulation: number }; civicNeighborhoods: Array<{ name: string; population: number }>; snaRegions: Array<{ id: string; population: number }> };

function decodeHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&nbsp;", " ").trim();
}

function reportLinks(html: string) {
  const links: Array<{ reportName: string; civicName: string; url: string }> = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const reportName = decodeHtml(match[2]);
    const civicName = aliases[reportName] ?? reportName;
    const url = new URL(match[1], indexUrl).href;
    links.push({ reportName, civicName, url });
  }
  return [...new Map(links.map((link) => [link.civicName, link])).values()];
}

function numericRowValues(tokens: string[], label: string, nextLabel: string | null) {
  const index = tokens.indexOf(label);
  if (index < 0) throw new Error(`${label} not found`);
  const nextIndex = nextLabel ? tokens.indexOf(nextLabel, index + 1) : tokens.length;
  const values = tokens.slice(index + 1, nextIndex).filter((token) => /^\d+(?:\.\d+)?$/.test(token)).map(Number);
  if (values.length < 2) throw new Error(`${label} expected at least 2 numeric values, received ${values.length}`);
  return values;
}

function countsFrom(values: Record<string, number>) : Counts {
  return {
    violent: values.violent,
    property: values.property,
    totalPart1: values.totalPart1,
    categories: Object.fromEntries(Object.entries(values).filter(([key]) => !["violent", "property", "totalPart1"].includes(key))),
  };
}

function countsReconcile(counts: Counts) {
  const violentParts = ["homicide", "rape", "robbery", "aggravated_assault", "strangulation"].reduce((sum, key) => sum + (counts.categories[key] ?? 0), 0);
  const propertyParts = ["burglary", "theft_from_auto", "motor_vehicle_theft", "personal_other_theft"].reduce((sum, key) => sum + (counts.categories[key] ?? 0), 0);
  return counts.violent === violentParts && counts.property === propertyParts && counts.totalPart1 === counts.violent + counts.property;
}

function parseReport(tokens: string[], civicName: string) {
  const marker = tokens.indexOf("Part 1 Crime 28 Day");
  if (marker < 0) throw new Error(`28-day section not found for ${civicName}`);
  const ytdTokens = tokens.slice(0, marker);
  const recentTokens = tokens.slice(marker);
  const ytdCurrent: Record<string, number> = {};
  const ytdPrior: Record<string, number> = {};
  const current28: Record<string, number> = {};
  const previous28: Record<string, number> = {};
  for (const [labelIndex, label] of categoryLabels.entries()) {
    const nextLabel = categoryLabels[labelIndex + 1] ?? null;
    const ytdValues = numericRowValues(ytdTokens, label, nextLabel);
    const recentValues = numericRowValues(recentTokens, label, nextLabel);
    const [prior, current] = ytdValues.slice(-2);
    const [previous, currentRecent] = recentValues.slice(0, 2);
    const key = categoryKeys[label];
    ytdCurrent[key] = current;
    ytdPrior[key] = prior;
    current28[key] = currentRecent;
    previous28[key] = previous;
  }
  const joined = tokens.join(" ");
  const updated = joined.match(/Updated:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
  const period = joined.match(/Current 28-Day Period:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    ?? joined.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*Current 28-Day Period:/);
  if (!updated || !period) throw new Error(`Report dates not parsed for ${civicName}`);
  const parsed = { updated, current28Start: period[1], current28End: period[2], currentYtd: countsFrom(ytdCurrent), priorYtd: countsFrom(ytdPrior), current28: countsFrom(current28), previous28: countsFrom(previous28) };
  const reconciliationWarnings = (["currentYtd", "priorYtd", "current28", "previous28"] as const)
    .filter((periodKey) => !countsReconcile(parsed[periodKey]))
    .map((periodKey) => ({ period: periodKey, note: "Published subtotal does not equal the sum of its published component rows; source values are preserved without correction." }));
  return { ...parsed, reconciliationWarnings };
}

function isoDate(value: string) {
  const [month, day, yearValue] = value.split("/").map(Number);
  const year = yearValue < 100 ? 2000 + yearValue : yearValue;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const emptyCounts = (): Counts => ({ violent: 0, property: 0, totalPart1: 0, categories: {} });
function sumCounts(rows: Counts[]) {
  const output = emptyCounts();
  for (const row of rows) {
    output.violent += row.violent; output.property += row.property; output.totalPart1 += row.totalPart1;
    for (const [key, value] of Object.entries(row.categories)) output.categories[key] = (output.categories[key] ?? 0) + value;
  }
  return output;
}

export async function fetchCpdNeighborhoodReports() {
  const root = process.cwd();
  const retrievedAt = new Date().toISOString();
  const response = await fetch(indexUrl, { headers: { "user-agent": "cincy-crime-data-pipeline/0.2" } });
  if (!response.ok) throw new Error(`CPD neighborhood report index request failed (${response.status})`);
  const indexHtml = await response.text();
  const links = reportLinks(indexHtml);
  const missing = canonicalNeighborhoods.filter((name) => !links.some((link) => link.civicName === name));
  const extra = links.filter((link) => !canonicalNeighborhoods.includes(link.civicName as (typeof canonicalNeighborhoods)[number])).map((link) => link.civicName);
  if (missing.length || extra.length || links.length !== canonicalNeighborhoods.length) throw new Error(`CPD report coverage mismatch. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`);

  console.log(`Fetching ${links.length} official CPD neighborhood reports...`);
  const civicReports = await mapWithConcurrency(links, 6, async (link) => {
    const bytes = await fetchBytes(link.url);
    const parsed = parseReport(await pdfPageTokens(bytes, 1), link.civicName);
    return { civicName: link.civicName, civicSlug: slugify(link.civicName), reportName: link.reportName, sourceUrl: link.url, checksumSha256: sha256(bytes), ...parsed };
  });
  const updates = [...new Set(civicReports.map((report) => report.updated))];
  const currentPeriods = [...new Set(civicReports.map((report) => `${report.current28Start}|${report.current28End}`))];
  const reconciliationExceptions = civicReports.filter((report) => report.reconciliationWarnings.length).map((report) => ({ civicName: report.civicName, sourceUrl: report.sourceUrl, warnings: report.reconciliationWarnings }));
  if (updates.length !== 1 || currentPeriods.length !== 1) throw new Error(`CPD reports are not synchronized: updates=${updates.join(",")}; periods=${currentPeriods.join(",")}`);

  const cutoff = isoDate(civicReports[0].current28End);
  const currentYear = Number(cutoff.slice(0, 4));
  const rolling = rolling28Windows(cutoff);
  const map = JSON.parse(await readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8")) as MapData;
  const population = JSON.parse(await readFile(path.join(root, "data/processed/demographics/population-2020.json"), "utf8")) as PopulationData;
  const reportByName = new Map(civicReports.map((report) => [report.civicName, report]));
  const populationByRegion = new Map(population.snaRegions.map((region) => [region.id, region.population]));
  const neighborhoods = map.regions.map((region) => {
    const reports = region.members.map((member) => reportByName.get(member)).filter((report): report is (typeof civicReports)[number] => Boolean(report));
    if (reports.length !== region.members.length) throw new Error(`Missing civic report member for ${region.name}`);
    const currentYtd = sumCounts(reports.map((report) => report.currentYtd));
    const priorYtd = sumCounts(reports.map((report) => report.priorYtd));
    const current28 = sumCounts(reports.map((report) => report.current28));
    const previous28 = sumCounts(reports.map((report) => report.previous28));
    const denominator = populationByRegion.get(region.id) ?? null;
    return { id: region.id, slug: region.slug, name: region.name, sourceName: region.sourceName, members: region.members, currentYtd, priorYtd, current28, previous28, population: denominator, populationYear: population.metadata.populationYear, rates: { violentYtdPer1000: ratePer1000(currentYtd.violent, denominator) }, changes: {
      violentYtd: percentChange(currentYtd.violent, priorYtd.violent), propertyYtd: percentChange(currentYtd.property, priorYtd.property), totalYtd: percentChange(currentYtd.totalPart1, priorYtd.totalPart1), violent28: percentChange(current28.violent, previous28.violent),
    }};
  });
  const cityPeriods = {
    currentYtd: sumCounts(civicReports.map((report) => report.currentYtd)), priorYtd: sumCounts(civicReports.map((report) => report.priorYtd)),
    current28: sumCounts(civicReports.map((report) => report.current28)), previous28: sumCounts(civicReports.map((report) => report.previous28)),
  };
  const output = {
    metadata: {
      sourceSystem: "CPD_NEIGHBORHOOD_REPORTS", datasetId: "cpdmobile-neighborhood-reports", title: "CPD Neighborhood Reports", retrievedAt, cutoff,
      sourceCoverage: { min_date: `${currentYear}-01-01`, max_date: cutoff, count: String(civicReports.length) }, unit: "preliminary CPD aggregate offense counts", mappingVersion: "2026-08-26.2",
      provenanceLayer: "fresher_aggregate", reportUpdatedAt: isoDate(updates[0]), reportCount: civicReports.length,
      reportQualityCaveat: reconciliationExceptions.length ? `${reconciliationExceptions.length} source report has a published subtotal/component inconsistency; source values are preserved.` : null,
      population: { sourceSystem: "CITY_PLANNING_2020_SNA_PROFILES", year: population.metadata.populationYear, citywide: population.metadata.citywidePopulation },
    },
    windows: { ytd: { comparisonStart: `${currentYear}-01-01`, comparisonEnd: cutoff, priorStart: `${currentYear - 1}-01-01`, priorEnd: `${currentYear - 1}-${cutoff.slice(5)}` }, rolling28: rolling },
    city: { ...cityPeriods, population: population.metadata.citywidePopulation, rates: { violentYtdPer1000: ratePer1000(cityPeriods.currentYtd.violent, population.metadata.citywidePopulation) } },
    neighborhoods,
  };
  await Promise.all([mkdir(path.join(root, "data/processed/crime"), { recursive: true }), mkdir(path.join(root, "public/data"), { recursive: true }), mkdir(path.join(root, "data/reports"), { recursive: true })]);
  await Promise.all([
    writeFile(path.join(root, "data/processed/crime/cpd-neighborhood-summary.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "public/data/cpd-neighborhood-summary.json"), `${JSON.stringify(output)}\n`),
    writeFile(path.join(root, "data/processed/crime/cpd-civic-neighborhood-reports.json"), `${JSON.stringify({ metadata: output.metadata, civicReports }, null, 2)}\n`),
    writeFile(path.join(root, "data/reports/cpd-neighborhood-validation.json"), `${JSON.stringify({ generatedAt: retrievedAt, status: reconciliationExceptions.length ? "warning" : "pass", reportCount: civicReports.length, expectedReportCount: canonicalNeighborhoods.length, reportUpdatedAt: updates[0], current28Period: currentPeriods[0], cutoff, missing, extra, reconciliationExceptions, indexChecksumSha256: sha256(indexHtml) }, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ event: "cpd_neighborhood_reports_processed", reports: civicReports.length, cutoff, mapRegions: neighborhoods.length }, null, 2));
  return output;
}

if (require.main === module) fetchCpdNeighborhoodReports().catch((error) => { console.error(error); process.exitCode = 1; });
