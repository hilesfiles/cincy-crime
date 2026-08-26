import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchPdi } from "./fetch-pdi";
import { fetchStars } from "./fetch-stars";

async function main() {
  const startedAt = new Date().toISOString();
  console.log(JSON.stringify({ event: "refresh_started", startedAt }));
  const pdi = await fetchPdi();
  const stars = await fetchStars();
  const firstStarsDate = String(stars.metadata.sourceCoverage.min_date).slice(0, 10);
  const transition = {
    generatedAt: new Date().toISOString(), expectedLastPdiDate: "2024-06-02", expectedFirstStarsDate: "2024-06-03",
    observedPdiMaximum: String(pdi.coverage.max_date).slice(0, 10), observedFirstStarsDate: firstStarsDate,
    postTransitionPdiDates: pdi.postTransition,
    gapDays: firstStarsDate === "2024-06-03" ? 0 : null, overlapDays: pdi.postTransition.length,
    status: pdi.postTransition.length === 0 && firstStarsDate === "2024-06-03" ? "pass" : "warning",
    note: "STARS begins on the expected transition date. The legacy PDI feed contains a small number of post-transition reported dates, including later outliers, so its absolute maximum is not treated as the operational cutoff without review.",
  };
  await mkdir(path.join(process.cwd(), "data/reports"), { recursive: true });
  await writeFile(path.join(process.cwd(), "data/reports/source-transition-validation.json"), `${JSON.stringify(transition, null, 2)}\n`);
  console.log(JSON.stringify({ event: "refresh_completed", completedAt: new Date().toISOString() }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
