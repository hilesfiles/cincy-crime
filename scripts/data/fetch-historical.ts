import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { mapWithConcurrency, sha256 } from "./pdf-text";
import { socrataQuery } from "./socrata";

type PdiRow = { year: string; sna_neighborhood?: string; cpd_neighborhood?: string; community_council_neighborhood?: string; ucr_group?: string; count: string };
type StarsRow = { year: string; sna_neighborhood?: string; stars_category?: string; type?: string; count: string };
type PeriodRows<T> = { period: "annual" | "same_date_ytd"; year: number; start: string; end: string; rows: T[] };

const firstYear = 2011;
const lastFullYear = 2025;
const comparisonMonthDay = "08-22";

function annualQuery(dateField: string, neighborhoodField: string, categoryFields: string[], start: string, end: string) {
  const selected = [`date_extract_y(${dateField}) as year`, neighborhoodField, ...categoryFields, "count(*) as count"];
  return `select ${selected.join(", ")} where ${dateField} between '${start}T00:00:00' and '${end}T23:59:59' group by year, ${[neighborhoodField, ...categoryFields].join(", ")} order by year, ${neighborhoodField} limit 50000`;
}

async function fetchPeriodRows<T>(datasetId: string, dateField: string, neighborhoodField: string, categoryFields: string[], periods: Array<{ year: number; start: string; end: string }>) {
  return mapWithConcurrency(periods, 4, async (period): Promise<PeriodRows<T>> => ({
    period: "same_date_ytd",
    ...period,
    rows: await socrataQuery<T>(datasetId, annualQuery(dateField, neighborhoodField, categoryFields, period.start, period.end)),
  }));
}

export async function fetchHistoricalSources() {
  const root = process.cwd();
  const retrievedAt = new Date().toISOString();
  console.log("Fetching official annual and same-date historical aggregates...");

  const pdiAnnualQuery = annualQuery("date_reported", "sna_neighborhood", ["cpd_neighborhood", "community_council_neighborhood", "ucr_group"], `${firstYear}-01-01`, "2024-06-02");
  const starsAnnualQuery = annualQuery("datereported", "sna_neighborhood", ["stars_category", "type"], "2024-06-03", `${lastFullYear}-12-31`);
  const pdiYtdPeriods = Array.from({ length: 14 }, (_, index) => firstYear + index).map((year) => ({ year, start: `${year}-01-01`, end: year === 2024 ? "2024-06-02" : `${year}-${comparisonMonthDay}` }));
  const starsYtdPeriods = [2024, 2025].map((year) => ({ year, start: year === 2024 ? "2024-06-03" : `${year}-01-01`, end: `${year}-${comparisonMonthDay}` }));

  const [pdiAnnualRows, starsAnnualRows, pdiYtd, starsYtd] = await Promise.all([
    socrataQuery<PdiRow>("k59e-2pvf", pdiAnnualQuery),
    socrataQuery<StarsRow>("7aqy-xrv9", starsAnnualQuery),
    fetchPeriodRows<PdiRow>("k59e-2pvf", "date_reported", "sna_neighborhood", ["cpd_neighborhood", "community_council_neighborhood", "ucr_group"], pdiYtdPeriods),
    fetchPeriodRows<StarsRow>("7aqy-xrv9", "datereported", "sna_neighborhood", ["stars_category", "type"], starsYtdPeriods),
  ]);

  const output = {
    metadata: {
      retrievedAt,
      firstYear,
      lastFullYear,
      comparisonMonthDay,
      sources: [
        { sourceSystem: "CPD_PDI", datasetId: "k59e-2pvf", unit: "reported crime incident row", operationalEnd: "2024-06-02", annualQuery: pdiAnnualQuery },
        { sourceSystem: "CPD_STARS", datasetId: "7aqy-xrv9", unit: "STARS offense row", operationalStart: "2024-06-03", annualQuery: starsAnnualQuery },
      ],
    },
    annual: { pdiRows: pdiAnnualRows, starsRows: starsAnnualRows },
    sameDateYtd: { monthDay: comparisonMonthDay, pdiPeriods: pdiYtd, starsPeriods: starsYtd },
  };
  await Promise.all([mkdir(path.join(root, "data/raw/crime/historical"), { recursive: true }), mkdir(path.join(root, "data/reports"), { recursive: true })]);
  const serialized = `${JSON.stringify(output)}\n`;
  await Promise.all([
    writeFile(path.join(root, "data/raw/crime/historical/annual-source-aggregates.json"), serialized),
    writeFile(path.join(root, "data/reports/historical-source-retrieval.json"), `${JSON.stringify({ generatedAt: retrievedAt, status: "pass", pdiAnnualAggregateRows: pdiAnnualRows.length, starsAnnualAggregateRows: starsAnnualRows.length, pdiYtdQueries: pdiYtd.length, starsYtdQueries: starsYtd.length, checksumSha256: sha256(serialized) }, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ event: "historical_sources_fetched", pdiAnnualRows: pdiAnnualRows.length, starsAnnualRows: starsAnnualRows.length, sameDateYtdPeriods: pdiYtd.length + starsYtd.length }, null, 2));
  return output;
}

if (require.main === module) fetchHistoricalSources().catch((error) => { console.error(error); process.exitCode = 1; });
