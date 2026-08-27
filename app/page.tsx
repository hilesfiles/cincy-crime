import mapData from "@/data/processed/geography/neighborhood-map.json";
import cpdSummary from "@/data/processed/crime/cpd-neighborhood-summary.json";
import starsSummary from "@/data/processed/crime/current-summary.json";
import historicalJson from "@/data/processed/crime/historical-annual-ui.json";
import { ExplorerDashboard } from "@/components/dashboard/explorer-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { CrimeSummary } from "@/lib/crime/summary";
import type { HistoricalData } from "@/lib/crime/historical";

export default function Home() {
  const summary = cpdSummary as CrimeSummary;
  const offenseDetail = starsSummary as CrimeSummary;
  const historical = historicalJson as HistoricalData;
  return (
    <div className="min-h-screen bg-[#f5f7f6]">
      <SiteHeader />
      <main>
        <section className="border-b border-[#d7e0df] bg-white">
          <div className="mx-auto max-w-[1480px] px-5 py-7 lg:px-9 lg:py-9">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div><p className="eyebrow">Neighborhood-level reported crime</p><h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.035em] text-[#102f3c] sm:text-4xl">A clearer view of crime burden and change across Cincinnati</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6f75] sm:text-base">Official-source statistics, comparable time windows, and visible caveats—organized around Cincinnati&apos;s statistical neighborhood geography.</p></div>
              <div className="flex items-center gap-3 rounded-sm border border-[#cbd9d7] bg-[#f5f8f7] px-4 py-3"><span className="size-2 rounded-full bg-[#087e74]" aria-hidden="true" /><div><p className="text-xs font-bold text-[#304c55]">Crime data through {summary.metadata.cutoff}</p><p className="text-[0.72rem] text-[#6b7d82]">Updated {summary.metadata.reportUpdatedAt} · CPD neighborhood aggregates</p></div></div>
            </div>
          </div>
        </section>
        <div className="h-12 border-b border-[#cfe0dd] bg-[#f0f8f6]" aria-hidden="true" />
        <ExplorerDashboard mapData={mapData} currentSummary={summary} starsSummary={offenseDetail} historical={historical} />
      </main>
      <SiteFooter />
    </div>
  );
}
