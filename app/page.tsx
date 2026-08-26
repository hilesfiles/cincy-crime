import mapData from "@/data/processed/geography/neighborhood-map.json";
import crimeSummary from "@/data/processed/crime/current-summary.json";
import { ExplorerDashboard } from "@/components/dashboard/explorer-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { CrimeSummary } from "@/lib/crime/summary";

export default function Home() {
  const summary = crimeSummary as CrimeSummary;
  return (
    <div className="min-h-screen bg-[#f5f7f6]">
      <SiteHeader />
      <main>
        <section className="border-b border-[#d7e0df] bg-white">
          <div className="mx-auto max-w-[1480px] px-5 py-7 lg:px-9 lg:py-9">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div><p className="eyebrow">Neighborhood-level reported crime</p><h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.035em] text-[#102f3c] sm:text-4xl">A clearer view of crime burden and change across Cincinnati</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6f75] sm:text-base">Official-source statistics, comparable time windows, and visible caveats—organized around Cincinnati&apos;s statistical neighborhood geography.</p></div>
              <div className="flex items-center gap-3 rounded-sm border border-[#cbd9d7] bg-[#f5f8f7] px-4 py-3"><span className="size-2 rounded-full bg-[#087e74]" aria-hidden="true" /><div><p className="text-xs font-bold text-[#304c55]">Crime data through {summary.metadata.cutoff}</p><p className="text-[0.72rem] text-[#6b7d82]">Refreshed {summary.metadata.retrievedAt.slice(0, 10)} · STARS offenses</p></div></div>
            </div>
          </div>
        </section>
        <div className="border-b border-[#ead3bc] bg-[#fff8ef]"><div className="mx-auto flex max-w-[1480px] items-start gap-3 px-5 py-3 text-xs leading-5 text-[#6e4c2f] lg:px-9"><span className="mt-1 size-2 shrink-0 rounded-full bg-[#d77b33]" /><p><strong>Geography review:</strong> the live official 2020 service returns 50 statistical polygons representing 51 names, not the bootstrap&apos;s requested 52 polygons. Combined regions are labeled, and no geometry has been fabricated.</p></div></div>
        <ExplorerDashboard mapData={mapData} summary={summary} />
      </main>
      <SiteFooter />
    </div>
  );
}
