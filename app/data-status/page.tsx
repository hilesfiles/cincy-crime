import geography from "@/data/reports/geography-validation.json";
import cpdReports from "@/data/reports/cpd-neighborhood-validation.json";
import population from "@/data/reports/population-validation.json";
import transition from "@/data/reports/source-transition-validation.json";
import unmapped from "@/data/reports/unmapped-offenses.json";
import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import starsJson from "@/data/processed/crime/current-summary.json";
import historical from "@/data/processed/crime/historical-annual.json";
import { PageShell } from "@/components/layout/page-shell";
import type { CrimeSummary } from "@/lib/crime/summary";

const Badge = ({ status }: { status: string }) => <span className={`inline-flex rounded-full px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] ${status === "available" || status === "pass" ? "bg-[#dceee9] text-[#08645d]" : status === "warning" || status === "partial" ? "bg-[#fff0df] text-[#9b5422]" : "bg-[#e8eceb] text-[#627277]"}`}>{status}</span>;
export default function DataStatusPage() { const summary = summaryJson as CrimeSummary; const stars = starsJson as CrimeSummary; const rows = [
  ["SNA 2020 geography + crosswalk", "Modern", geography.status, `${geography.actualFeatureCount} polygons / ${geography.representedNamedNeighborhoodCount} civic names; three documented combined polygons`],
  ["PDI crime", "Legacy through June 2024", transition.status, "Operational cutoff modeled; later reported-date outliers flagged"],
  ["CPD neighborhood reports", `2026 YTD → ${summary.metadata.cutoff}`, cpdReports.status, `${cpdReports.reportCount} synchronized preliminary reports; ${cpdReports.reconciliationExceptions.length} published subtotal exception`],
  ["STARS crime", `2024-06-03 → ${stars.metadata.cutoff}`, "available", `${Number(stars.metadata.sourceCoverage.count).toLocaleString()} offense-level rows`],
  ["Offense mappings", "STARS categories", unmapped.count === 0 ? "pass" : "warning", `${unmapped.count} unmapped labels`],
  ["Historical annual panel", "2011–present", "partial", `2025 enabled; ${historical.years[0].unassigned.aggregateRows} unassigned source aggregates retained; 2011–2024 gated`],
  ["Population", "2020 City Planning SNA profiles", population.status, `${population.civicProfileCount} neighborhood profiles; citywide total uses the direct Citywide profile`],
]; return <PageShell eyebrow="Coverage and validation" title="Data status" description={`Source freshness, known gaps, and validation results as of the ${summary.metadata.retrievedAt.slice(0, 10)} refresh.`}><div className="overflow-x-auto border border-[#d4dedc] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.07em] text-[#4b646c]"><tr><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Coverage</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Detail</th></tr></thead><tbody>{rows.map(([dataset, coverage, status, detail]) => <tr key={dataset} className="border-t border-[#e0e8e7]"><td className="px-4 py-4 font-bold text-[#173e4a]">{dataset}</td><td className="px-4 py-4 text-[#617379] tabular">{coverage}</td><td className="px-4 py-4"><Badge status={status} /></td><td className="px-4 py-4 text-[#617379]">{detail}</td></tr>)}</tbody></table></div><section className="mt-6 border-l-4 border-[#d77b33] bg-[#fff8ef] p-5"><h2 className="font-black text-[#70431f]">Population reconciliation caveat</h2><p className="mt-2 text-sm leading-6 text-[#765b44]">{population.note}</p></section></PageShell>; }
