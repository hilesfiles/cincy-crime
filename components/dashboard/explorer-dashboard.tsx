"use client";

import { useEffect, useMemo, useState } from "react";
import { NeighborhoodMap, type MapRegion } from "@/components/map/neighborhood-map";
import { formatChange, type CrimeSummary } from "@/lib/crime/summary";
import { percentChange } from "@/lib/analytics/periods";

type MapData = { viewBox: string; sourceFeatureCount: number; regions: MapRegion[] };
type MetricKey = "violent" | "property" | "part1" | "violent-change" | "recent-change";
const metrics: Array<{ key: MetricKey; label: string; kind: "count" | "change" }> = [
  { key: "violent", label: "Violent offenses YTD", kind: "count" },
  { key: "property", label: "Property offenses YTD", kind: "count" },
  { key: "part1", label: "Total Part I YTD", kind: "count" },
  { key: "violent-change", label: "Violent YTD change", kind: "change" },
  { key: "recent-change", label: "Violent 28-day change", kind: "change" },
];

export function ExplorerDashboard({ mapData, summary }: { mapData: MapData; summary: CrimeSummary }) {
  const [metric, setMetric] = useState<MetricKey>("violent");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("metric") as MetricKey | null;
    if (value && metrics.some((item) => item.key === value)) {
      const timer = window.setTimeout(() => setMetric(value), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const changeValue = (change: { kind: string; value: number | null }) => change.kind === "value" || change.kind === "no-change" ? change.value : null;
  const values = useMemo(() => Object.fromEntries(summary.neighborhoods.map((row) => [row.sourceName,
    metric === "violent" ? row.currentYtd.violent : metric === "property" ? row.currentYtd.property : metric === "part1" ? row.currentYtd.totalPart1 : metric === "violent-change" ? changeValue(row.changes.violentYtd) : changeValue(row.changes.violent28),
  ])), [metric, summary.neighborhoods]);
  const currentMetric = metrics.find((item) => item.key === metric) ?? metrics[0];
  const selectedRow = summary.neighborhoods.find((row) => row.sourceName === selected) ?? null;
  const cityViolentChange = percentChange(summary.city.currentYtd.violent, summary.city.priorYtd.violent);
  const cityRecentChange = percentChange(summary.city.current28.violent, summary.city.previous28.violent);
  const setMetricAndUrl = (value: MetricKey) => { setMetric(value); const url = new URL(window.location.href); url.searchParams.set("metric", value); window.history.replaceState({}, "", url); };
  const fmt = (value: number | null) => value === null ? "Unavailable" : currentMetric.kind === "change" ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : value.toLocaleString();
  return (
    <section className="mx-auto max-w-[1480px] px-5 py-5 lg:px-9 lg:py-7">
      <div className="mb-4 flex flex-col gap-3 border border-[#d1dcdb] bg-white p-4 md:flex-row md:items-end md:justify-between">
        <label className="block"><span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">Map metric</span><select value={metric} onChange={(event) => setMetricAndUrl(event.target.value as MetricKey)} className="min-w-[260px] rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]">{metrics.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5b6d73]"><p><span className="font-bold text-[#2e4f58]">YTD:</span> {summary.windows.ytd.comparisonStart} → {summary.windows.ytd.comparisonEnd}</p><p><span className="font-bold text-[#2e4f58]">Comparison:</span> same dates {summary.windows.ytd.priorStart.slice(0, 4)}</p></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.78fr)]">
        <NeighborhoodMap data={mapData} metricValues={values} metricLabel={currentMetric.label} formatValue={fmt} diverging={currentMetric.kind === "change"} onSelect={(region) => setSelected(region.sourceName)} />
        <aside className="flex flex-col gap-4">
          {selectedRow ? <div className="border-t-4 border-[#e07b36] bg-white p-5 shadow-sm"><p className="eyebrow">Selected area</p><h2 className="mt-2 text-2xl font-black text-[#143a4a]">{selectedRow.name}</h2><div className="mt-5 grid grid-cols-2 gap-3"><Kpi label="Violent YTD" value={selectedRow.currentYtd.violent} sub={`${selectedRow.priorYtd.violent} prior`} /><Kpi label="YTD change" value={formatChange(selectedRow.changes.violentYtd)} sub={`${selectedRow.currentYtd.violent - selectedRow.priorYtd.violent >= 0 ? "+" : ""}${selectedRow.currentYtd.violent - selectedRow.priorYtd.violent} offenses`} /><Kpi label="Latest 28 days" value={selectedRow.current28.violent} sub={`${selectedRow.previous28.violent} previous`} /><Kpi label="28-day change" value={formatChange(selectedRow.changes.violent28)} sub={`${selectedRow.current28.violent - selectedRow.previous28.violent >= 0 ? "+" : ""}${selectedRow.current28.violent - selectedRow.previous28.violent} offenses`} /></div></div> : <div className="border-t-4 border-[#0a766e] bg-white p-5 shadow-sm"><p className="eyebrow">Citywide snapshot</p><h2 className="mt-2 text-xl font-black text-[#143a4a]">Reported Part I offenses</h2><p className="mt-2 text-sm leading-6 text-[#5b6d73]">Select a map area for neighborhood-level counts and comparable change.</p></div>}
          <div className="grid grid-cols-2 gap-3"><Kpi label="City violent YTD" value={summary.city.currentYtd.violent} sub={`${summary.city.priorYtd.violent} prior YTD`} /><Kpi label="Violent change" value={formatChange(cityViolentChange)} sub={`${summary.city.currentYtd.violent - summary.city.priorYtd.violent >= 0 ? "+" : ""}${summary.city.currentYtd.violent - summary.city.priorYtd.violent} offenses`} /><Kpi label="Latest 28 days" value={summary.city.current28.violent} sub={`${summary.city.previous28.violent} previous`} /><Kpi label="28-day change" value={formatChange(cityRecentChange)} sub={`${summary.city.current28.violent - summary.city.previous28.violent >= 0 ? "+" : ""}${summary.city.current28.violent - summary.city.previous28.violent} offenses`} /></div>
          <div className="border border-[#d1dcdb] bg-white p-5"><p className="eyebrow">Source and grain</p><p className="mt-2 text-sm font-bold text-[#143a4a]">STARS category offenses</p><p className="mt-2 text-xs leading-5 text-[#607278]">Each row is an offense, not necessarily a unique incident. Data through <strong>{summary.metadata.cutoff}</strong>. Population rates remain unavailable until a compatible denominator is verified.</p></div>
        </aside>
      </div>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="border border-[#d6e0df] bg-white p-4"><p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#667a80]">{label}</p><p className="mt-1 text-2xl font-black text-[#143a4a] tabular">{typeof value === "number" ? value.toLocaleString() : value}</p><p className="mt-1 text-[0.7rem] text-[#718187] tabular">{sub}</p></div>;
}
