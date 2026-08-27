"use client";

import { useEffect, useMemo, useState } from "react";
import { CrimeTypeSelector, useCrimeMetricSelection } from "@/components/crime/crime-type-selector";
import { NeighborhoodMap, type MapColorMode, type MapMetricValue, type MapRegion } from "@/components/map/neighborhood-map";
import { PeriodSwitcher, usePeriodSelection } from "@/components/period/period-switcher";
import { annualAsCrimeSummary, historicalPeriod, type HistoricalData } from "@/lib/crime/historical";
import { crimeMetric, formatMetricChange, metricAvailableInYear, metricChange, metricCount, metricRate, type CrimeMetricKey } from "@/lib/crime/metrics";
import type { CrimeSummary } from "@/lib/crime/summary";

type MapData = { viewBox: string; sourceFeatureCount: number; regions: MapRegion[] };
type MapMeasure = "change" | "count" | "rate" | "recent-change";

export function ExplorerDashboard({ mapData, currentSummary, starsSummary, historical }: { mapData: MapData; currentSummary: CrimeSummary; starsSummary: CrimeSummary; historical: HistoricalData }) {
  const period = usePeriodSelection(historical.metadata.annualYears);
  const crime = useCrimeMetricSelection("violent");
  const [measure, setMeasure] = useState<MapMeasure>("change");
  const [selected, setSelected] = useState<string | null>(null);
  const summary = useMemo(() => period.mode === "current" ? currentSummary : annualAsCrimeSummary(historical, currentSummary, period.year), [currentSummary, historical, period.mode, period.year]);
  const annualPeriod = period.mode === "annual" ? historicalPeriod(historical, "annual", period.year) : null;
  const definition = crimeMetric(crime.crime);
  const selectedYear = period.mode === "annual" ? period.year : Number(summary.metadata.cutoff.slice(0, 4));
  const available = metricAvailableInYear(crime.crime, selectedYear);
  const hasPrior = available && (period.mode === "current" || metricAvailableInYear(crime.crime, period.year - 1));
  const effectiveMeasure = period.mode === "annual" && measure === "recent-change" ? "change" : measure;
  const selectedRow = summary.neighborhoods.find((row) => row.sourceName === selected) ?? null;

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("measure") as MapMeasure | null;
    if (requested && ["change", "count", "rate", "recent-change"].includes(requested)) {
      const timer = window.setTimeout(() => setMeasure(requested), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const changeForMap = (current: CrimeSummary["city"]["currentYtd"], prior: CrimeSummary["city"]["priorYtd"]): MapMetricValue => {
    const change = metricChange(current, prior, crime.crime);
    return change.kind === "new-activity" ? "new-activity" : change.value;
  };
  const valueFor = (row: CrimeSummary["neighborhoods"][number]): MapMetricValue => {
    if (!available) return null;
    if (effectiveMeasure === "count") return metricCount(row.currentYtd, crime.crime);
    if (effectiveMeasure === "rate") return metricRate(row.currentYtd, row.population, crime.crime);
    if (effectiveMeasure === "recent-change") return changeForMap(row.current28, row.previous28);
    return hasPrior ? changeForMap(row.currentYtd, row.priorYtd) : null;
  };
  const values = Object.fromEntries(summary.neighborhoods.map((row) => [row.sourceName, valueFor(row)]));
  const comparisonValues = Object.fromEntries(summary.neighborhoods.map((row) => [row.sourceName, !available ? null : effectiveMeasure === "recent-change" ? changeForMap(row.current28, row.previous28) : hasPrior ? changeForMap(row.currentYtd, row.priorYtd) : null]));
  const isChange = effectiveMeasure === "change" || effectiveMeasure === "recent-change";
  const colorValues = values;
  const colorMode: MapColorMode = effectiveMeasure === "count" ? "count" : effectiveMeasure === "rate" ? "rate" : "change";
  const periodWord = period.mode === "annual" ? `${period.year}` : effectiveMeasure === "recent-change" ? "28-day" : "YTD";
  const metricLabel = `${definition.label} ${periodWord}${isChange ? " change" : effectiveMeasure === "rate" ? " per 1,000" : ""}`;
  const formatValue = (value: MapMetricValue) => value === null ? "Unavailable" : value === "new-activity" ? "New activity" : isChange ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : effectiveMeasure === "rate" ? value.toFixed(1) : value.toLocaleString();
  const changeMeasure = (value: MapMeasure) => {
    setMeasure(value);
    const url = new URL(window.location.href);
    url.searchParams.set("measure", value);
    window.history.replaceState({}, "", url);
  };
  const changePeriodMode = (value: "current" | "annual") => {
    period.setMode(value);
    if (value === "annual" && measure === "recent-change") changeMeasure("change");
  };
  const profileQuery = new URLSearchParams({ ...(period.mode === "annual" ? { period: "annual", year: String(period.year) } : {}), crime: crime.crime }).toString();

  return <section className="mx-auto max-w-[1480px] px-5 py-5 lg:px-9 lg:py-7">
    <div className="mb-4 flex flex-col gap-4 border border-[#d1dcdb] bg-white p-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex flex-wrap items-end gap-4"><PeriodSwitcher mode={period.mode} year={period.year} availableYears={historical.metadata.annualYears} onModeChange={changePeriodMode} onYearChange={period.setYear}/><CrimeTypeSelector value={crime.crime} onChange={crime.setCrime}/><label className="block"><span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">Map measure</span><select aria-label="Map measure" value={effectiveMeasure} onChange={(event) => changeMeasure(event.target.value as MapMeasure)} className="min-w-[220px] rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]"><option value="change">Change from prior period</option><option value="count">Reported count</option><option value="rate">Rate per 1,000</option>{period.mode === "current" ? <option value="recent-change">Latest 28-day change</option> : null}</select></label></div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5b6d73]"><p><span className="font-bold text-[#2e4f58]">Window:</span> {summary.windows.ytd.comparisonStart} → {summary.windows.ytd.comparisonEnd}</p><p><span className="font-bold text-[#2e4f58]">Source:</span> {period.mode === "current" ? "CPD preliminary aggregates" : annualPeriod?.sourceGrain}</p></div>
    </div>
    {definition.note ? <p className="mb-4 border-l-4 border-[#d77b33] bg-[#fff8ef] px-4 py-3 text-xs leading-5 text-[#6e4c2f]"><strong>{definition.label}:</strong> {definition.note}</p> : null}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.78fr)]">
      <NeighborhoodMap data={mapData} metricValues={values} colorValues={colorValues} comparisonValues={comparisonValues} colorMode={colorMode} metricLabel={metricLabel} changeLabel={effectiveMeasure === "recent-change" ? "Latest 28-day change" : period.mode === "annual" ? "Change from prior year" : "Change from prior YTD"} formatValue={formatValue} profileQuery={`?${profileQuery}`} onSelect={(region) => setSelected(region.sourceName)}/>
      <aside className="flex flex-col gap-4">
        {selectedRow ? <AreaPanel title={selectedRow.name} context={period.mode === "annual" ? String(period.year) : "current YTD"} counts={selectedRow} population={selectedRow.population} populationYear={selectedRow.populationYear} metric={crime.crime} label={definition.label} available={available} hasPrior={hasPrior} annual={period.mode === "annual"}/> : <div className="border-t-4 border-[#0a766e] bg-white p-5 shadow-sm"><p className="eyebrow">Citywide snapshot</p><h2 className="mt-2 text-xl font-black text-[#143a4a]">{definition.label}</h2><p className="mt-2 text-sm leading-6 text-[#5b6d73]">Select a map area for its count, rate, and signed change from the comparable prior period.</p></div>}
        <AreaPanel title="Citywide" context={period.mode === "annual" ? String(period.year) : "current YTD"} counts={summary.city} population={summary.city.population} populationYear={summary.metadata.population?.year ?? 2020} metric={crime.crime} label={definition.label} available={available} hasPrior={hasPrior} annual={period.mode === "annual"}/>
        <div className="border border-[#d1dcdb] bg-white p-5"><p className="eyebrow">{period.mode === "annual" ? "Historical provenance" : "Two-layer provenance"}</p>{period.mode === "annual" ? <><p className="mt-2 text-sm font-bold text-[#143a4a]">{annualPeriod?.sourceSystems.join(" + ")}</p><p className="mt-1 text-xs leading-5 text-[#607278]">{annualPeriod?.sourceGrain}. {annualPeriod?.status === "validated_mixed_system_transition" ? historical.metadata.transition.note : "Annual source rows are mapped to the current SNA crosswalk."}</p>{annualPeriod && metricCount(annualPeriod.unassigned, crime.crime) > 0 ? <p className="mt-2 text-xs leading-5 text-[#8a552d]"><strong>Unassigned:</strong> {metricCount(annualPeriod.unassigned, crime.crime).toLocaleString()} selected-category rows are retained citywide but not allocated to a map region.</p> : null}</> : <><p className="mt-2 text-sm font-bold text-[#143a4a]">Fresher aggregate: CPD neighborhood reports</p><p className="mt-1 text-xs leading-5 text-[#607278]">Preliminary aggregate counts through <strong>{summary.metadata.cutoff}</strong>; these drive the current map and rates.</p><p className="mt-3 text-sm font-bold text-[#143a4a]">Offense detail: STARS</p><p className="mt-1 text-xs leading-5 text-[#607278]">Offense-level rows through <strong>{starsSummary.metadata.cutoff}</strong>, preserved separately.</p></>}</div>
      </aside>
    </div>
  </section>;
}

type AreaCounts = Pick<CrimeSummary["city"], "currentYtd" | "priorYtd" | "current28" | "previous28">;
function AreaPanel({ title, context, counts, population, populationYear, metric, label, available, hasPrior, annual }: { title: string; context: string; counts: AreaCounts; population?: number | null; populationYear?: number; metric: CrimeMetricKey; label: string; available: boolean; hasPrior: boolean; annual: boolean }) {
  const current = available ? metricCount(counts.currentYtd, metric) : null;
  const prior = hasPrior ? metricCount(counts.priorYtd, metric) : null;
  const rate = available ? metricRate(counts.currentYtd, population, metric) : null;
  const change = hasPrior ? metricChange(counts.currentYtd, counts.priorYtd, metric) : null;
  const recent = available && !annual ? metricCount(counts.current28, metric) : null;
  const previousRecent = available && !annual ? metricCount(counts.previous28, metric) : null;
  const recentChange = recent !== null && previousRecent !== null ? metricChange(counts.current28, counts.previous28, metric) : null;
  return <div className="border-t-4 border-[#0a766e] bg-white p-5 shadow-sm"><p className="eyebrow">{title === "Citywide" ? "Citywide" : "Selected area"} · {context}</p><h2 className="mt-2 text-xl font-black text-[#143a4a]">{title}</h2><p className="mt-1 text-xs font-bold text-[#607278]">{label}</p><div className="mt-4 grid grid-cols-2 gap-3"><Kpi label={annual ? "Annual count" : "YTD count"} value={current ?? "Unavailable"} sub={prior === null ? "No comparable prior value" : `${prior.toLocaleString()} prior`} /><Kpi label="Per 1,000" value={rate?.toFixed(1) ?? "Unavailable"} sub={`${population?.toLocaleString() ?? "No"} population (${populationYear ?? "—"})`} /><Kpi label={annual ? "Year-over-year" : "YTD change"} value={change ? formatMetricChange(change) : "Unavailable"} sub={current !== null && prior !== null ? `${current - prior >= 0 ? "+" : ""}${current - prior} offenses` : "Category not available"} />{annual ? <Kpi label="Prior year" value={prior ?? "Unavailable"} sub="Comparable selected category"/> : <Kpi label="Latest 28 days" value={recent ?? "Unavailable"} sub={previousRecent === null ? "No comparison" : `${previousRecent} previous · ${recentChange ? formatMetricChange(recentChange) : "—"}`}/>}</div></div>;
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="border border-[#d6e0df] bg-white p-4"><p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#667a80]">{label}</p><p className="mt-1 text-2xl font-black text-[#143a4a] tabular">{typeof value === "number" ? value.toLocaleString() : value}</p><p className="mt-1 text-[0.7rem] text-[#718187] tabular">{sub}</p></div>;
}
