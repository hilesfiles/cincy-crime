"use client";

import { useEffect, useMemo, useState } from "react";
import { NeighborhoodMap, type MapRegion } from "@/components/map/neighborhood-map";
import { PeriodSwitcher, usePeriodSelection } from "@/components/period/period-switcher";
import { formatChange, type CrimeSummary } from "@/lib/crime/summary";
import { annualAsCrimeSummary, historicalPeriod, type HistoricalData } from "@/lib/crime/historical";
import { percentChange } from "@/lib/analytics/periods";

type MapData = { viewBox: string; sourceFeatureCount: number; regions: MapRegion[] };
type MetricKey = "violent" | "violent-rate" | "property" | "part1" | "violent-change" | "recent-change";
const metrics: Array<{ key: MetricKey; label: string; kind: "count" | "rate" | "change" }> = [
  { key: "violent", label: "Violent offenses YTD", kind: "count" },
  { key: "violent-rate", label: "Violent offenses YTD per 1,000", kind: "rate" },
  { key: "property", label: "Property offenses YTD", kind: "count" },
  { key: "part1", label: "Total Part I YTD", kind: "count" },
  { key: "violent-change", label: "Violent YTD change", kind: "change" },
  { key: "recent-change", label: "Violent 28-day change", kind: "change" },
];

export function ExplorerDashboard({ mapData, currentSummary, starsSummary, historical }: { mapData: MapData; currentSummary: CrimeSummary; starsSummary: CrimeSummary; historical: HistoricalData }) {
  const period = usePeriodSelection(historical.metadata.annualYears);
  const summary = useMemo(() => period.mode === "current" ? currentSummary : annualAsCrimeSummary(historical, currentSummary, period.year), [currentSummary, historical, period.mode, period.year]);
  const annualPeriod = period.mode === "annual" ? historicalPeriod(historical, "annual", period.year) : null;
  const [metric, setMetric] = useState<MetricKey>("violent");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("metric") as MetricKey | null;
    if (value && metrics.some((item) => item.key === value)) {
      const timer = window.setTimeout(() => setMetric(value), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const effectiveMetric: MetricKey = period.mode === "annual" && metric === "recent-change" ? "violent" : metric;
  const changeValue = (change: { kind: string; value: number | null }) => change.kind === "value" || change.kind === "no-change" ? change.value : null;
  const values = useMemo(() => Object.fromEntries(summary.neighborhoods.map((row) => [row.sourceName,
    effectiveMetric === "violent" ? row.currentYtd.violent : effectiveMetric === "violent-rate" ? row.rates?.violentYtdPer1000 ?? null : effectiveMetric === "property" ? row.currentYtd.property : effectiveMetric === "part1" ? row.currentYtd.totalPart1 : effectiveMetric === "violent-change" ? changeValue(row.changes.violentYtd) : changeValue(row.changes.violent28),
  ])), [effectiveMetric, summary.neighborhoods]);
  const availableMetrics = period.mode === "annual" ? metrics.filter((item) => item.key !== "recent-change") : metrics;
  const currentMetric = availableMetrics.find((item) => item.key === effectiveMetric) ?? availableMetrics[0];
  const selectedRow = summary.neighborhoods.find((row) => row.sourceName === selected) ?? null;
  const cityRecentChange = percentChange(summary.city.current28.violent, summary.city.previous28.violent);
  const setMetricAndUrl = (value: MetricKey) => { setMetric(value); const url = new URL(window.location.href); url.searchParams.set("metric", value); window.history.replaceState({}, "", url); };
  const setPeriodMode = (value: "current" | "annual") => { period.setMode(value); if (value === "annual" && metric === "recent-change") setMetricAndUrl("violent"); };
  const fmt = (value: number | null) => value === null ? "Unavailable" : currentMetric.kind === "change" ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : currentMetric.kind === "rate" ? value.toFixed(1) : value.toLocaleString();
  return (
    <section className="mx-auto max-w-[1480px] px-5 py-5 lg:px-9 lg:py-7">
      <div className="mb-4 flex flex-col gap-4 border border-[#d1dcdb] bg-white p-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-4"><PeriodSwitcher mode={period.mode} year={period.year} availableYears={historical.metadata.annualYears} onModeChange={setPeriodMode} onYearChange={period.setYear} /><label className="block"><span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">Map metric</span><select value={effectiveMetric} onChange={(event) => setMetricAndUrl(event.target.value as MetricKey)} className="min-w-[260px] rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]">{availableMetrics.map((item) => <option key={item.key} value={item.key}>{item.label.replace("YTD", period.mode === "annual" ? "annual" : "YTD")}</option>)}</select></label></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5b6d73]"><p><span className="font-bold text-[#2e4f58]">Window:</span> {summary.windows.ytd.comparisonStart} → {summary.windows.ytd.comparisonEnd}</p><p><span className="font-bold text-[#2e4f58]">Source:</span> {period.mode === "current" ? "CPD preliminary aggregates" : annualPeriod?.sourceGrain}</p></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.78fr)]">
        <NeighborhoodMap data={mapData} metricValues={values} metricLabel={currentMetric.label.replace("YTD", period.mode === "annual" ? `${period.year}` : "YTD")} formatValue={fmt} diverging={currentMetric.kind === "change"} profileQuery={period.mode === "annual" ? `?period=annual&year=${period.year}` : ""} onSelect={(region) => setSelected(region.sourceName)} />
        <aside className="flex flex-col gap-4">
          {selectedRow ? <div className="border-t-4 border-[#e07b36] bg-white p-5 shadow-sm"><p className="eyebrow">Selected area · {period.mode === "annual" ? period.year : "current YTD"}</p><h2 className="mt-2 text-2xl font-black text-[#143a4a]">{selectedRow.name}</h2><div className="mt-5 grid grid-cols-2 gap-3"><Kpi label={period.mode === "annual" ? "Violent annual" : "Violent YTD"} value={selectedRow.currentYtd.violent} sub={period.mode === "annual" ? `${selectedRow.priorYtd.violent} in ${period.year - 1}` : `${selectedRow.priorYtd.violent} prior`} /><Kpi label="Per 1,000" value={selectedRow.rates?.violentYtdPer1000?.toFixed(1) ?? "Unavailable"} sub={`${selectedRow.population?.toLocaleString() ?? "No"} population (${selectedRow.populationYear ?? "—"})`} />{period.mode === "annual" ? <><Kpi label="Year-over-year" value={period.year === historical.metadata.annualYears[0] ? "Unavailable" : formatChange(selectedRow.changes.violentYtd)} sub={period.year === historical.metadata.annualYears[0] ? "No earlier validated year" : `${selectedRow.currentYtd.violent - selectedRow.priorYtd.violent >= 0 ? "+" : ""}${selectedRow.currentYtd.violent - selectedRow.priorYtd.violent} offenses`} /><Kpi label="Total Part I" value={selectedRow.currentYtd.totalPart1} sub={`${selectedRow.currentYtd.property} property`} /></> : <><Kpi label="Latest 28 days" value={selectedRow.current28.violent} sub={`${selectedRow.previous28.violent} previous`} /><Kpi label="28-day change" value={formatChange(selectedRow.changes.violent28)} sub={`${selectedRow.current28.violent - selectedRow.previous28.violent >= 0 ? "+" : ""}${selectedRow.current28.violent - selectedRow.previous28.violent} offenses`} /></>}</div></div> : <div className="border-t-4 border-[#0a766e] bg-white p-5 shadow-sm"><p className="eyebrow">Citywide snapshot</p><h2 className="mt-2 text-xl font-black text-[#143a4a]">Reported Part I offenses</h2><p className="mt-2 text-sm leading-6 text-[#5b6d73]">Select a map area for counts, change, and the 2020-population violent-crime rate.</p></div>}
          <div className="grid grid-cols-2 gap-3"><Kpi label={period.mode === "annual" ? `City violent ${period.year}` : "City violent YTD"} value={summary.city.currentYtd.violent} sub={period.mode === "annual" ? `${summary.city.priorYtd.violent} in ${period.year - 1}` : `${summary.city.priorYtd.violent} prior YTD`} /><Kpi label="City per 1,000" value={summary.city.rates?.violentYtdPer1000?.toFixed(1) ?? "Unavailable"} sub="Fixed 2020 population" />{period.mode === "annual" ? <><Kpi label="City year-over-year" value={period.year === historical.metadata.annualYears[0] ? "Unavailable" : formatChange(percentChange(summary.city.currentYtd.violent, summary.city.priorYtd.violent))} sub="Source break is annotated" /><Kpi label="City total Part I" value={summary.city.currentYtd.totalPart1} sub={`${summary.city.currentYtd.property} property`} /></> : <><Kpi label="Latest 28 days" value={summary.city.current28.violent} sub={`${summary.city.previous28.violent} previous`} /><Kpi label="28-day change" value={formatChange(cityRecentChange)} sub={`${summary.city.current28.violent - summary.city.previous28.violent >= 0 ? "+" : ""}${summary.city.current28.violent - summary.city.previous28.violent} offenses`} /></>}</div>
          <div className="border border-[#d1dcdb] bg-white p-5"><p className="eyebrow">{period.mode === "annual" ? "Historical provenance" : "Two-layer provenance"}</p>{period.mode === "annual" ? <><p className="mt-2 text-sm font-bold text-[#143a4a]">{annualPeriod?.sourceSystems.join(" + ")}</p><p className="mt-1 text-xs leading-5 text-[#607278]">{annualPeriod?.sourceGrain}. {annualPeriod?.status === "validated_mixed_system_transition" ? historical.metadata.transition.note : "Annual source rows are mapped to the current SNA crosswalk."}</p>{annualPeriod && annualPeriod.unassigned.totalPart1 > 0 ? <p className="mt-2 text-xs leading-5 text-[#8a552d]"><strong>Unassigned:</strong> {annualPeriod.unassigned.totalPart1.toLocaleString()} Part I rows are retained citywide but not allocated to a map region.</p> : null}</> : <><p className="mt-2 text-sm font-bold text-[#143a4a]">Fresher aggregate: CPD neighborhood reports</p><p className="mt-1 text-xs leading-5 text-[#607278]">Preliminary aggregate counts through <strong>{summary.metadata.cutoff}</strong>; these drive the current map and rates.</p><p className="mt-3 text-sm font-bold text-[#143a4a]">Offense detail: STARS</p><p className="mt-1 text-xs leading-5 text-[#607278]">Offense-level rows through <strong>{starsSummary.metadata.cutoff}</strong>, preserved separately.</p></>}</div>
        </aside>
      </div>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="border border-[#d6e0df] bg-white p-4"><p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#667a80]">{label}</p><p className="mt-1 text-2xl font-black text-[#143a4a] tabular">{typeof value === "number" ? value.toLocaleString() : value}</p><p className="mt-1 text-[0.7rem] text-[#718187] tabular">{sub}</p></div>;
}
