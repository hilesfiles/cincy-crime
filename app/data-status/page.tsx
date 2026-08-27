import coverage from "@/data/manifests/coverage.json";
import geography from "@/data/reports/geography-validation.json";
import cpdReports from "@/data/reports/cpd-neighborhood-validation.json";
import population from "@/data/reports/population-validation.json";
import demographics from "@/data/reports/demographics-validation.json";
import electionsValidation from "@/data/reports/elections-validation.json";
import transition from "@/data/reports/source-transition-validation.json";
import unmapped from "@/data/reports/unmapped-offenses.json";
import historicalValidation from "@/data/reports/historical-validation.json";
import validationSummary from "@/data/reports/validation-summary.json";
import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import starsJson from "@/data/processed/crime/current-summary.json";
import historicalJson from "@/data/processed/crime/historical-ui.json";
import electionsJson from "@/data/processed/elections/presidential-neighborhoods.json";
import { PageShell } from "@/components/layout/page-shell";
import { crimeMetrics } from "@/lib/crime/metrics";
import type { HistoricalData } from "@/lib/crime/historical";
import type { CrimeSummary } from "@/lib/crime/summary";
import type { ElectionsData } from "@/lib/elections";

const Badge = ({ status }: { status: string }) => <span className={`inline-flex rounded-full px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] ${status === "available" || status === "pass" ? "bg-[#dceee9] text-[#08645d]" : status === "warning" || status === "partial" ? "bg-[#fff0df] text-[#9b5422]" : "bg-[#e8eceb] text-[#627277]"}`}>{status}</span>;
const dateOnly = (value: string) => value.slice(0, 10);

export default function DataStatusPage() {
  const summary = summaryJson as CrimeSummary;
  const stars = starsJson as CrimeSummary;
  const historical = historicalJson as HistoricalData;
  const elections = electionsJson as ElectionsData;
  const latestArtifact = [summary.metadata.retrievedAt, stars.metadata.retrievedAt, cpdReports.generatedAt, population.generatedAt, demographics.generatedAt, elections.metadata.generatedAt, transition.generatedAt, unmapped.generatedAt, historical.metadata.generatedAt, validationSummary.generatedAt].sort().at(-1)!;
  const annualStart = historical.metadata.annualYears[0];
  const annualEnd = historical.metadata.annualYears.at(-1)!;
  const ytdStart = historical.metadata.sameDateYtdYears[0];
  const ytdEnd = historical.metadata.sameDateYtdYears.at(-1)!;
  const discreteCount = crimeMetrics.filter((metric) => metric.group !== "summary").length;
  const rows = [
    ["SNA 2020 geography + crosswalk", "Modern", geography.status, "Build artifact", `${geography.actualFeatureCount} polygons / ${geography.representedNamedNeighborhoodCount} civic names; ${geography.actualCombinedRegionCount} documented combined polygons`],
    ["PDI crime", `${coverage.sources.CPD_PDI.operationalStart} → ${coverage.sources.CPD_PDI.operationalEnd}`, transition.status, dateOnly(transition.generatedAt), `${transition.postTransitionPdiDates.length} later reported-date groups retained as outliers; operational cutoff remains modeled`],
    ["CPD neighborhood reports", `2026 YTD → ${cpdReports.cutoff}`, cpdReports.status, dateOnly(cpdReports.generatedAt), `${cpdReports.reportCount}/${cpdReports.expectedReportCount} reports; published update ${cpdReports.reportUpdatedAt}; ${cpdReports.reconciliationExceptions.length} subtotal exception`],
    ["STARS offense rows", `${dateOnly(stars.metadata.sourceCoverage.min_date)} → ${stars.metadata.cutoff}`, "available", dateOnly(stars.metadata.retrievedAt), `${Number(stars.metadata.sourceCoverage.count).toLocaleString()} offense-level rows in source coverage`],
    ["Crime taxonomy", `${crimeMetrics.length} selectable measures`, unmapped.count === 0 ? "pass" : "warning", dateOnly(unmapped.generatedAt), `${discreteCount} discrete offense categories; ${unmapped.count} unmapped current STARS labels; late-start categories are unavailable rather than zero-filled`],
    ["Historical calendar years", `${annualStart}–${annualEnd}`, historicalValidation.status, dateOnly(historical.metadata.generatedAt), `${historical.metadata.annualYears.length} complete calendar years; all ${historical.periods.annual.length} periods reconcile; unresolved geography remains explicit`],
    ["Historical same-date YTD", `${ytdStart}–${ytdEnd} through ${historical.metadata.sameDateCutoff}`, historicalValidation.status, dateOnly(historical.metadata.generatedAt), `${historical.metadata.sameDateYtdYears.length} comparable YTD periods, including the current preliminary aggregate`],
    ["Population denominators", "2010–2026 annual series", demographics.status, dateOnly(demographics.generatedAt), `${demographics.census2010Profiles} official 2010 and ${demographics.census2020Profiles} official 2020 profiles; 2011–2019 interpolated, 2021 onward transparently carries the 2020 anchor`],
    ["Neighborhood ACS profiles", "2016–2020 ACS 5-year", demographics.status, dateOnly(demographics.generatedAt), `${demographics.neighborhoodsWithAcs}/${demographics.snaRegions} map regions with estimate/MOE pairs; ${demographics.unavailableAcsNeighborhoods.length} image-only exceptions remain unavailable`],
    ["Presidential precinct canvasses", "2016, 2020, 2024", electionsValidation.status, dateOnly(elections.metadata.generatedAt), `${elections.elections.length} official presidential elections; ${electionsValidation.electionYears.every((row) => row.matchedBallotsPercent === 100) ? "100%" : "partial"} precinct-ID ballot coverage against the current CAGIS reference`],
    ["Election neighborhood allocation", "SNA 2020 modeled estimates", "warning", dateOnly(elections.metadata.generatedAt), `${electionsValidation.precinctReferenceCount} current reference precincts used internally; ${electionsValidation.splitPrecinctReferenceCount} cross one or more SNA boundaries; public map displays neighborhood averages only`],
  ];

  return <PageShell eyebrow="Coverage and validation" title="Data status" description={`Generated-artifact status as of ${dateOnly(latestArtifact)}. Coverage, counts, and warnings below are read from the current manifests and validation outputs.`}><div className="mb-4 grid gap-3 bg-[#143a4a] p-4 text-xs text-[#d9e6e5] md:grid-cols-3"><p><span className="block font-black uppercase tracking-[0.08em] text-[#9ed5cf]">Current aggregate cutoff</span><span className="mt-1 block text-sm font-bold tabular">{summary.metadata.cutoff}</span></p><p><span className="block font-black uppercase tracking-[0.08em] text-[#9ed5cf]">STARS offense cutoff</span><span className="mt-1 block text-sm font-bold tabular">{stars.metadata.cutoff}</span></p><p><span className="block font-black uppercase tracking-[0.08em] text-[#9ed5cf]">Latest generated artifact</span><span className="mt-1 block text-sm font-bold tabular">{latestArtifact}</span></p></div><div className="overflow-x-auto border border-[#d4dedc] bg-white"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.07em] text-[#4b646c]"><tr><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Coverage</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Validated</th><th className="px-4 py-3">Detail</th></tr></thead><tbody>{rows.map(([dataset, rowCoverage, status, validated, detail]) => <tr key={dataset} className="border-t border-[#e0e8e7]"><td className="px-4 py-4 font-bold text-[#173e4a]">{dataset}</td><td className="px-4 py-4 text-[#617379] tabular">{rowCoverage}</td><td className="px-4 py-4"><Badge status={status} /></td><td className="px-4 py-4 text-[#617379] tabular">{validated}</td><td className="px-4 py-4 text-[#617379]">{detail}</td></tr>)}</tbody></table></div><section className="mt-6 border-l-4 border-[#d77b33] bg-[#fff8ef] p-5"><h2 className="font-black text-[#70431f]">Active validation warnings</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[#765b44]"><li>{population.note}</li><li>ACS profile tables for {demographics.unavailableAcsNeighborhoods.join(" and ")} are image-only; the corresponding map regions remain unavailable instead of being zero-filled.</li><li>{transition.note}</li><li>{historicalValidation.unmappedNeighborhoods.length} historical neighborhood-label gaps and {historicalValidation.unmappedOffenses.length} blank or unmapped historical offense-label groups remain explicitly reported.</li><li>{cpdReports.reconciliationExceptions.length} current CPD report contains published subtotal/component inconsistencies; source values are preserved.</li><li>{elections.metadata.presentationNote} Neighborhood vote and turnout values are modeled and must not be read as official neighborhood results.</li></ul></section></PageShell>;
}
