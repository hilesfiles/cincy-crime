"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CrimeTypeSelector, useCrimeMetricSelection } from "@/components/crime/crime-type-selector";
import { percentChange } from "@/lib/analytics/periods";
import type { HistoricalData, HistoricalPeriod } from "@/lib/crime/historical";
import { crimeMetric, metricAvailableInYear, metricCount, metricRate } from "@/lib/crime/metrics";

type Basis = "annual" | "sameDateYtd";
type Measure = "count" | "rate" | "yoy";

export function TrendAnalysis({ historical }: { historical: HistoricalData }) {
  const [basis, setBasis] = useState<Basis>("annual");
  const crime = useCrimeMetricSelection("violent");
  const [measure, setMeasure] = useState<Measure>("count");
  const [area, setArea] = useState("citywide");
  const periods = historical.periods[basis];
  const neighborhoods = historical.periods.annual[0].neighborhoods;
  const definition = crimeMetric(crime.crime);
  const series = useMemo(() => periods.map((period, index) => {
    const neighborhood = area === "citywide" ? null : period.neighborhoods.find((row) => row.slug === area) ?? null;
    const counts = area === "citywide" ? period.city : neighborhood?.counts ?? null;
    const population = area === "citywide" ? cityPopulation(period) : neighborhood?.population ?? null;
    const available = metricAvailableInYear(crime.crime, period.year);
    const count = counts && available ? metricCount(counts, crime.crime) : null;
    const rate = counts && available ? metricRate(counts, population, crime.crime) : null;
    const prior = periods[index - 1];
    const priorNeighborhood = prior && area !== "citywide" ? prior.neighborhoods.find((row) => row.slug === area) ?? null : null;
    const priorCounts = prior ? area === "citywide" ? prior.city : priorNeighborhood?.counts ?? null : null;
    const priorAvailable = prior ? metricAvailableInYear(crime.crime, prior.year) : false;
    const priorCount = priorCounts && priorAvailable ? metricCount(priorCounts, crime.crime) : null;
    const change = count !== null && priorCount !== null ? percentChange(count, priorCount) : null;
    const value = measure === "rate" ? rate : measure === "yoy" ? change?.value ?? null : count;
    return { year: period.year, value, count, rate, yoy: change?.value ?? null, source: period.sourceSystems.join(" + "), status: period.status, unassigned: available ? metricCount(period.unassigned, crime.crime) : null };
  }), [area, crime.crime, measure, periods]);
  const values = series.filter((row): row is typeof row & { value: number } => row.value !== null);
  const high = values.reduce((best, row) => !best || row.value > best.value ? row : best, null as (typeof values)[number] | null);
  const low = values.reduce((best, row) => !best || row.value < best.value ? row : best, null as (typeof values)[number] | null);
  const selectedName = area === "citywide" ? "Citywide" : neighborhoods.find((row) => row.slug === area)?.name ?? area;
  const unit = measure === "rate" ? "per 1,000 using fixed 2020 population" : measure === "yoy" ? "year-over-year percent" : "reported offenses";
  const formatValue = (value: number | null) => value === null ? "—" : measure === "rate" ? value.toFixed(1) : measure === "yoy" ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : value.toLocaleString();

  return <div><div className="border border-[#d4dedc] bg-white p-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label><span className="mb-1.5 block text-xs font-bold text-[#5b7076]">Series</span><select aria-label="Series" value={basis} onChange={(event) => setBasis(event.target.value as Basis)} className="w-full rounded-sm border border-[#afbfbd] bg-white px-3 py-2 text-sm font-bold text-[#173e4a]"><option value="annual">Complete calendar years</option><option value="sameDateYtd">Same-date YTD through Aug. 22</option></select></label><label><span className="mb-1.5 block text-xs font-bold text-[#5b7076]">Area</span><select aria-label="Area" value={area} onChange={(event) => setArea(event.target.value)} className="w-full rounded-sm border border-[#afbfbd] bg-white px-3 py-2 text-sm font-bold text-[#173e4a]"><option value="citywide">Citywide</option>{neighborhoods.map((row) => <option key={row.slug} value={row.slug}>{row.name}</option>)}</select></label><CrimeTypeSelector value={crime.crime} onChange={crime.setCrime} className="w-full"/><label><span className="mb-1.5 block text-xs font-bold text-[#5b7076]">Measure</span><select aria-label="Measure" value={measure} onChange={(event) => setMeasure(event.target.value as Measure)} className="w-full rounded-sm border border-[#afbfbd] bg-white px-3 py-2 text-sm font-bold text-[#173e4a]"><option value="count">Count</option><option value="rate">Per 1,000</option><option value="yoy">Year-over-year change</option></select></label></div></div>{definition.note ? <p className="mt-4 border-l-4 border-[#d77b33] bg-[#fff8ef] px-4 py-3 text-xs text-[#6e4c2f]">{definition.note} Earlier years display as unavailable.</p> : null}<section className="mt-5 border border-[#d5dfde] bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">{basis === "annual" ? "Calendar-year trend" : "Comparable YTD trend"}</p><h2 className="mt-1 text-xl font-black text-[#173e4a]">{selectedName} · {definition.label}</h2><p className="mt-1 text-xs text-[#64767b]">{unit}</p></div>{high && low ? <p className="text-right text-xs leading-5 text-[#64767b]">High: <strong>{high.year} · {formatValue(high.value)}</strong><br/>Low: <strong>{low.year} · {formatValue(low.value)}</strong></p> : null}</div><div className="mt-5 h-[390px] w-full" role="img" aria-label={`${selectedName} ${definition.label} ${basis === "annual" ? "calendar-year" : "same-date YTD"} trend`}><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}><CartesianGrid stroke="#dbe4e3" strokeDasharray="3 3"/><XAxis dataKey="year" tick={{ fill: "#526970", fontSize: 12 }} tickLine={false}/><YAxis tick={{ fill: "#526970", fontSize: 12 }} tickLine={false} width={68} tickFormatter={(value) => measure === "yoy" ? `${value}%` : Number(value).toLocaleString()}/><Tooltip formatter={(value) => [formatValue(Number(value)), `${definition.label} · ${unit}`]} labelFormatter={(year) => `${basis === "annual" ? "Calendar year" : "YTD through Aug. 22"} ${year}`}/><ReferenceLine x={2024} stroke="#d77b33" strokeWidth={2} label={{ value: "PDI → STARS", fill: "#8a552d", fontSize: 11, position: "insideTopRight" }}/><Line type="monotone" dataKey="value" name={definition.label} stroke="#08766e" strokeWidth={3} dot={{ r: 4, fill: "#08766e" }} activeDot={{ r: 6 }} connectNulls={false}/></LineChart></ResponsiveContainer></div><div className="mt-3 grid gap-2 text-xs leading-5 text-[#65767b] md:grid-cols-2"><p><strong>2024 source break:</strong> PDI incident rows through June 2, then STARS offense rows beginning June 3.</p><p><strong>Rate denominator:</strong> fixed official 2020 City Planning population, not an annual population estimate.</p></div></section><div className="mt-5 overflow-x-auto border border-[#d4dedc] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><caption className="px-4 py-4 text-left text-lg font-black text-[#173e4a]">{definition.label} values and provenance</caption><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.06em] text-[#526970]"><tr><th className="px-4 py-3">Year</th><th className="px-4 py-3">Count</th><th className="px-4 py-3">Per 1,000</th><th className="px-4 py-3">YoY</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Citywide unassigned</th></tr></thead><tbody>{series.map((row) => <tr key={row.year} className="border-t border-[#e1e8e7]"><td className="px-4 py-3 font-bold text-[#294a54]">{row.year}{row.year === 2024 ? <span className="ml-2 text-[0.65rem] font-black uppercase text-[#a45a29]">Transition</span> : null}</td><td className="px-4 py-3 tabular">{row.count?.toLocaleString() ?? "—"}</td><td className="px-4 py-3 tabular">{row.rate?.toFixed(1) ?? "—"}</td><td className="px-4 py-3 tabular">{row.yoy === null ? "—" : `${row.yoy > 0 ? "+" : ""}${row.yoy.toFixed(1)}%`}</td><td className="px-4 py-3 text-xs text-[#65767b]">{row.source}</td><td className="px-4 py-3 tabular">{row.unassigned?.toLocaleString() ?? "—"}</td></tr>)}</tbody></table></div></div>;
}

function cityPopulation(period: HistoricalPeriod) {
  if (!period.city.violent || !period.rates.violentPer1000) return null;
  return (period.city.violent / period.rates.violentPer1000) * 1000;
}
