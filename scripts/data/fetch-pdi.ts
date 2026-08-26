import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { socrataMetadata, socrataQuery } from "./socrata";

type Coverage = { min_date: string; max_date: string; count: string };
type DateCount = { date: string; count: string };

export async function fetchPdi() {
  const root = process.cwd();
  const retrievedAt = new Date().toISOString();
  console.log("Inspecting PDI metadata and transition records...");
  const [metadata, coverage, postTransition] = await Promise.all([
    socrataMetadata("k59e-2pvf"),
    socrataQuery<Coverage>("k59e-2pvf", "select min(date_reported) as min_date, max(date_reported) as max_date, count(*) as count"),
    socrataQuery<DateCount>("k59e-2pvf", "select date_trunc_ymd(date_reported) as date, count(*) as count where date_reported > '2024-06-02T23:59:59' group by date order by date"),
  ]);
  const result = { sourceSystem: "CPD_PDI", datasetId: "k59e-2pvf", retrievedAt, metadata, coverage: coverage[0], postTransition };
  await mkdir(path.join(root, "data/raw/crime/pdi"), { recursive: true });
  await writeFile(path.join(root, "data/raw/crime/pdi/source-inspection.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ event: "pdi_inspected", records: coverage[0]?.count, postTransitionDates: postTransition.length }, null, 2));
  return result;
}

if (require.main === module) fetchPdi().catch((error) => { console.error(error); process.exitCode = 1; });
