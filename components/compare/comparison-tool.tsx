"use client";

import { useMemo, useState } from "react";
import { CrimeTypeSelector, useCrimeMetricSelection } from "@/components/crime/crime-type-selector";
import { PeriodSwitcher, usePeriodSelection } from "@/components/period/period-switcher";
import { annualAsCrimeSummary, type HistoricalData } from "@/lib/crime/historical";
import { crimeMetric, formatMetricChange, metricAvailableInYear, metricChange, metricCount, metricRate } from "@/lib/crime/metrics";
import type { CrimeSummary } from "@/lib/crime/summary";

export function ComparisonTool({ currentSummary, historical }: { currentSummary: CrimeSummary; historical: HistoricalData }) {
  const period = usePeriodSelection(historical.metadata.annualYears);
  const crime = useCrimeMetricSelection("violent");
  const summary = useMemo(() => period.mode === "current" ? currentSummary : annualAsCrimeSummary(historical, currentSummary, period.year), [currentSummary, historical, period.mode, period.year]);
  const defaults = [summary.neighborhoods.find((row) => row.name === "Mt. Airy")?.slug ?? summary.neighborhoods[0].slug, summary.neighborhoods.find((row) => row.name === "Westwood")?.slug ?? summary.neighborhoods[1].slug];
  const [selected, setSelected] = useState(defaults);
  const update = (index: number, slug: string) => setSelected((current) => current.map((value, position) => position === index ? slug : value));
  const add = () => selected.length < 4 && setSelected((current) => [...current, summary.neighborhoods.find((row) => !current.includes(row.slug))?.slug ?? summary.neighborhoods[0].slug]);
  const rows = selected.map((slug) => summary.neighborhoods.find((row) => row.slug === slug)!).filter(Boolean);
  const year = period.mode === "annual" ? period.year : Number(summary.metadata.cutoff.slice(0, 4));
  const available = metricAvailableInYear(crime.crime, year);
  const hasPrior = available && (period.mode === "current" || metricAvailableInYear(crime.crime, year - 1));
  const definition = crimeMetric(crime.crime);

  return <div><div className="mb-5 flex flex-wrap items-end gap-4 border border-[#d4dedc] bg-white p-4"><PeriodSwitcher mode={period.mode} year={period.year} availableYears={historical.metadata.annualYears} onModeChange={period.setMode} onYearChange={period.setYear}/><CrimeTypeSelector value={crime.crime} onChange={crime.setCrime}/></div>{definition.note ? <p className="mb-5 border-l-4 border-[#d77b33] bg-[#fff8ef] px-4 py-3 text-xs text-[#6e4c2f]">{definition.note}</p> : null}<div className="mb-5 flex flex-wrap items-end gap-3">{selected.map((slug, index) => <label key={index}><span className="mb-1 block text-xs font-bold text-[#5b7076]">Area {index + 1}</span><select value={slug} onChange={(event) => update(index, event.target.value)} className="rounded-sm border border-[#afbfbd] bg-white px-3 py-2 text-sm font-bold text-[#173e4a]">{summary.neighborhoods.map((row) => <option key={row.slug} value={row.slug}>{row.name}</option>)}</select></label>)}<button onClick={add} disabled={selected.length >= 4} className="rounded-sm bg-[#0a766e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">+ Add area</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{rows.map((row) => {
    const current = available ? metricCount(row.currentYtd, crime.crime) : null;
    const prior = hasPrior ? metricCount(row.priorYtd, crime.crime) : null;
    const change = hasPrior ? metricChange(row.currentYtd, row.priorYtd, crime.crime) : null;
    const latest = available && period.mode === "current" ? metricCount(row.current28, crime.crime) : null;
    const previous = available && period.mode === "current" ? metricCount(row.previous28, crime.crime) : null;
    return <article key={row.slug} className="border-t-4 border-[#0a766e] bg-white p-5 shadow-sm"><p className="eyebrow">Statistical area · {period.mode === "annual" ? period.year : "current YTD"}</p><h2 className="mt-2 text-xl font-black text-[#143a4a]">{row.name}</h2><p className="mt-1 text-xs font-bold text-[#607278]">{definition.label}</p><dl className="mt-5 space-y-3 text-sm"><Metric label={period.mode === "annual" ? "Annual count" : "YTD count"} value={current?.toLocaleString() ?? "Unavailable"} detail={prior === null ? "No comparable prior value" : `${prior.toLocaleString()} prior`} /><Metric label="Per 1,000" value={available ? metricRate(row.currentYtd, row.population, crime.crime)?.toFixed(1) ?? "Unavailable" : "Unavailable"} detail={`${row.population?.toLocaleString() ?? "No"} population (${row.populationYear ?? "—"})`} /><Metric label={period.mode === "annual" ? "Year-over-year" : "YTD change"} value={change ? formatMetricChange(change) : "Unavailable"} detail={current !== null && prior !== null ? `${current - prior >= 0 ? "+" : ""}${current - prior} offenses` : "Category not available"} />{period.mode === "current" ? <Metric label="Latest 28 days" value={latest?.toLocaleString() ?? "Unavailable"} detail={previous === null ? "No comparison" : `${previous.toLocaleString()} previous`} /> : null}</dl></article>;
  })}</div></div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="flex items-end justify-between gap-3 border-b border-[#e2e9e8] pb-2"><dt className="text-[#65767b]">{label}</dt><dd className="text-right"><span className="block font-black text-[#173e4a] tabular">{value}</span><span className="block text-[0.68rem] text-[#819095] tabular">{detail}</span></dd></div>; }
