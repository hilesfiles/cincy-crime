import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import { PageShell } from "@/components/layout/page-shell";
import { RankingsTable } from "@/components/tables/rankings-table";
import type { CrimeSummary } from "@/lib/crime/summary";

export default function RankingsPage() {
  const summary = summaryJson as CrimeSummary;
  return <PageShell eyebrow="Citywide comparison" title="Neighborhood rankings" description={`Sortable preliminary CPD aggregate counts and violent-crime rates through ${summary.metadata.cutoff}. Parenthetical values are the prior comparable YTD period.`}><div className="mb-4 rounded-sm border border-[#ead3bc] bg-[#fff8ef] px-4 py-3 text-xs leading-5 text-[#6e4c2f]"><strong>Read percentages and rates with counts.</strong> A large percentage based on a small prior count can exaggerate practical change. Rates use official 2020 City Planning profile populations.</div><RankingsTable summary={summary} /></PageShell>;
}
