import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import historicalJson from "@/data/processed/crime/historical-annual-ui.json";
import { PageShell } from "@/components/layout/page-shell";
import { RankingsTable } from "@/components/tables/rankings-table";
import type { CrimeSummary } from "@/lib/crime/summary";
import type { HistoricalData } from "@/lib/crime/historical";

export default function RankingsPage() {
  const summary = summaryJson as CrimeSummary;
  const historical = historicalJson as HistoricalData;
  return <PageShell eyebrow="Citywide comparison" title="Neighborhood rankings" description={`Rank any aggregate or discrete offense type using preliminary current YTD data through ${summary.metadata.cutoff} or validated calendar years from 2011–2025.`}><div className="mb-4 rounded-sm border border-[#ead3bc] bg-[#fff8ef] px-4 py-3 text-xs leading-5 text-[#6e4c2f]"><strong>Read percentages and rates with counts.</strong> Historical rates use a fixed official 2020 City Planning profile population, and 2024 is a visibly mixed PDI/STARS year.</div><RankingsTable currentSummary={summary} historical={historical} /></PageShell>;
}
