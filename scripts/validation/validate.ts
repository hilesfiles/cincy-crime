import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const root = process.cwd();
  const [geography, transition, summary, unmapped] = await Promise.all([
    readFile(path.join(root, "data/reports/geography-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/source-transition-validation.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/processed/crime/current-summary.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/reports/unmapped-offenses.json"), "utf8").then(JSON.parse),
  ]);
  const slugs = summary.neighborhoods.map((row: { slug: string }) => row.slug);
  const checks = [
    { id: "geography-source-features", status: geography.actualFeatureCount === 50 ? "pass" : "fail", detail: `${geography.actualFeatureCount} source features` },
    { id: "geography-bootstrap-expectation", status: geography.actualFeatureCount === 52 ? "pass" : "warning", detail: geography.note },
    { id: "unique-region-slugs", status: new Set(slugs).size === slugs.length ? "pass" : "fail", detail: `${slugs.length} slugs` },
    { id: "stars-cutoff", status: summary.metadata.cutoff ? "pass" : "fail", detail: summary.metadata.cutoff },
    { id: "source-transition", status: transition.status, detail: transition.note },
    { id: "offense-mapping", status: unmapped.count === 0 ? "pass" : "warning", detail: `${unmapped.count} unmapped labels` },
  ];
  const report = { generatedAt: new Date().toISOString(), status: checks.some((check) => check.status === "fail") ? "fail" : checks.some((check) => check.status === "warning") ? "warning" : "pass", checks };
  await writeFile(path.join(root, "data/reports/validation-summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "fail") process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
