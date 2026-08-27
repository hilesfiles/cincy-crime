import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const root = process.cwd();
  const [geography, crosswalk, transition, summary, starsSummary, historical, historicalValidation, unmapped, cpdReports, population, demographics] = await Promise.all([
    readFile(path.join(root, "data/reports/geography-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/manifests/neighborhood-crosswalk.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/source-transition-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/processed/crime/cpd-neighborhood-summary.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/processed/crime/current-summary.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/processed/crime/historical-annual.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/historical-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/unmapped-offenses.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/cpd-neighborhood-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/population-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/demographics-validation.json"), "utf8").then(JSON.parse),
  ]);
  const slugs = summary.neighborhoods.map((row: { slug: string }) => row.slug);
  const checks = [
    { id: "geography-source-features", status: geography.status, detail: `${geography.actualFeatureCount} polygons representing ${geography.representedNamedNeighborhoodCount} names` },
    { id: "geography-crosswalk", status: crosswalk.sourceFeatureCount === 50 && crosswalk.civicNeighborhoodCount === 51 && geography.actualCombinedRegionCount === 3 ? "pass" : "fail", detail: "51 civic names → 50 CAGIS features; three combined features" },
    { id: "unique-region-slugs", status: new Set(slugs).size === slugs.length ? "pass" : "fail", detail: `${slugs.length} slugs` },
    { id: "cpd-neighborhood-reports", status: cpdReports.status, detail: `${cpdReports.reportCount} reports through ${summary.metadata.cutoff}` },
    { id: "cpd-map-regions", status: summary.neighborhoods.length === 50 ? "pass" : "fail", detail: `${summary.neighborhoods.length} map aggregates` },
    { id: "population-denominators", status: summary.neighborhoods.every((row: { population?: number; rates?: { violentYtdPer1000?: number | null } }) => typeof row.population === "number" && typeof row.rates?.violentYtdPer1000 === "number") ? population.status : "fail", detail: `${population.civicProfileCount} profiles; reconciliation ${population.status}` },
    { id: "annual-population-series", status: demographics.status, detail: `${demographics.census2010Profiles} 2010 profiles + ${demographics.census2020Profiles} 2020 profiles; ${demographics.neighborhoodsWithAcs}/${demographics.snaRegions} regions with ACS/MOE` },
    { id: "stars-offense-detail-cutoff", status: starsSummary.metadata.cutoff ? "pass" : "fail", detail: starsSummary.metadata.cutoff },
    { id: "historical-periods", status: historical.periods.annual.length === 15 && historical.periods.sameDateYtd.length === 16 && [...historical.periods.annual, ...historical.periods.sameDateYtd].every((period: { neighborhoods: unknown[]; reconciliation: { status: string } }) => period.neighborhoods.length === 50 && period.reconciliation.status === "pass") ? "pass" : "fail", detail: `${historical.periods.annual.length} annual periods; ${historical.periods.sameDateYtd.length} same-date YTD periods` },
    { id: "historical-unassigned-and-taxonomy", status: historicalValidation.status, detail: `${historicalValidation.unmappedNeighborhoods.length} period/label geography exceptions; ${historicalValidation.unmappedOffenses.length} period/label taxonomy exceptions` },
    { id: "source-transition", status: transition.status, detail: transition.note },
    { id: "offense-mapping", status: unmapped.count === 0 ? "pass" : "warning", detail: `${unmapped.count} unmapped labels` },
  ];
  const report = { generatedAt: new Date().toISOString(), status: checks.some((check) => check.status === "fail") ? "fail" : checks.some((check) => check.status === "warning") ? "warning" : "pass", checks };
  await writeFile(path.join(root, "data/reports/validation-summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "fail") process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
