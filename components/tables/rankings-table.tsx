"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CrimeTypeSelector, useCrimeMetricSelection } from "@/components/crime/crime-type-selector";
import { PeriodSwitcher, usePeriodSelection } from "@/components/period/period-switcher";
import { annualAsCrimeSummary, type HistoricalData } from "@/lib/crime/historical";
import { changeNumber, crimeMetric, formatMetricChange, metricAvailableInYear, metricChange, metricCount, metricRate } from "@/lib/crime/metrics";
import type { CrimeSummary } from "@/lib/crime/summary";

type SortKey = "name" | "count" | "prior" | "rate" | "change" | "recent";

export function RankingsTable({ currentSummary, historical }: { currentSummary: CrimeSummary; historical: HistoricalData }) {
  const period = usePeriodSelection(historical.metadata.annualYears);
  const crime = useCrimeMetricSelection("violent");
  const summary = useMemo(() => period.mode === "current" ? currentSummary : annualAsCrimeSummary(historical, currentSummary, period.year), [currentSummary, historical, period.mode, period.year]);
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [descending, setDescending] = useState(true);
  const year = period.mode === "annual" ? period.year : Number(summary.metadata.cutoff.slice(0, 4));
  const available = metricAvailableInYear(crime.crime, year);
  const hasPrior = available && (period.mode === "current" || metricAvailableInYear(crime.crime, year - 1));
  const definition = crimeMetric(crime.crime);
  const rowValue = (row: CrimeSummary["neighborhoods"][number], key: SortKey): string | number => {
    if (key === "name") return row.name;
    if (!available) return Number.NEGATIVE_INFINITY;
    if (key === "count") return metricCount(row.currentYtd, crime.crime);
    if (key === "prior") return hasPrior ? metricCount(row.priorYtd, crime.crime) : Number.NEGATIVE_INFINITY;
    if (key === "rate") return metricRate(row.currentYtd, row.population, crime.crime) ?? Number.NEGATIVE_INFINITY;
    if (key === "recent") return period.mode === "current" ? metricCount(row.current28, crime.crime) : Number.NEGATIVE_INFINITY;
    return hasPrior ? changeNumber(metricChange(row.currentYtd, row.priorYtd, crime.crime)) ?? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  };
  const rows = [...summary.neighborhoods].sort((a, b) => {
    const av = rowValue(a, sortKey); const bv = rowValue(b, sortKey);
    const result = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
    return descending ? -result : result;
  });
  const sort = (key: SortKey) => { if (sortKey === key) setDescending((value) => !value); else { setSortKey(key); setDescending(key !== "name"); } };
  const query = new URLSearchParams({ ...(period.mode === "annual" ? { period: "annual", year: String(period.year) } : {}), crime: crime.crime }).toString();

  return <div><div className="mb-4 flex flex-wrap items-end gap-4 border border-[#d4dedc] bg-white p-4"><PeriodSwitcher mode={period.mode} year={period.year} availableYears={historical.metadata.annualYears} onModeChange={period.setMode} onYearChange={period.setYear}/><CrimeTypeSelector value={crime.crime} onChange={crime.setCrime}/></div>{definition.note ? <p className="mb-4 border-l-4 border-[#d77b33] bg-[#fff8ef] px-4 py-3 text-xs text-[#6e4c2f]">{definition.note}</p> : null}<div className="overflow-x-auto border border-[#d4dedc] bg-white"><table className="w-full min-w-[920px] border-collapse text-sm"><caption className="px-4 py-4 text-left text-lg font-black text-[#173e4a]">{definition.label} by statistical area</caption><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.06em]"><tr><th className="px-4 py-3"><SortHeader field="name" active={sortKey} descending={descending} onSort={sort}>Statistical area</SortHeader></th><th className="px-4 py-3"><SortHeader field="count" active={sortKey} descending={descending} onSort={sort}>{period.mode === "annual" ? period.year : "Current YTD"}</SortHeader></th><th className="px-4 py-3"><SortHeader field="prior" active={sortKey} descending={descending} onSort={sort}>Prior period</SortHeader></th><th className="px-4 py-3"><SortHeader field="rate" active={sortKey} descending={descending} onSort={sort}>Per 1,000</SortHeader></th><th className="px-4 py-3"><SortHeader field="change" active={sortKey} descending={descending} onSort={sort}>{period.mode === "annual" ? "Year-over-year" : "YTD change"}</SortHeader></th>{period.mode === "current" ? <th className="px-4 py-3"><SortHeader field="recent" active={sortKey} descending={descending} onSort={sort}>Latest 28 days</SortHeader></th> : null}</tr></thead><tbody>{rows.map((row) => {
    const current = available ? metricCount(row.currentYtd, crime.crime) : null;
    const prior = hasPrior ? metricCount(row.priorYtd, crime.crime) : null;
    const change = hasPrior ? metricChange(row.currentYtd, row.priorYtd, crime.crime) : null;
    const changeValue = change ? changeNumber(change) : null;
    return <tr key={row.id} className="border-t border-[#e1e8e7] hover:bg-[#f8faf9]"><td className="px-4 py-3 font-bold text-[#173e4a]"><Link href={`/neighborhood/${row.slug}/?${query}`} className="hover:text-[#08766e] hover:underline">{row.name}</Link></td><td className="px-4 py-3 font-bold tabular">{current?.toLocaleString() ?? "—"}</td><td className="px-4 py-3 tabular">{prior?.toLocaleString() ?? "—"}</td><td className="px-4 py-3 tabular">{available ? metricRate(row.currentYtd, row.population, crime.crime)?.toFixed(1) ?? "—" : "—"}</td><td className="px-4 py-3 tabular">{change ? <><span className={changeValue !== null && changeValue > 0 ? "font-bold text-[#b3272f]" : "font-bold text-[#087a4f]"}>{formatMetricChange(change)}</span><span className="ml-2 text-xs text-[#7b898d]">{current !== null && prior !== null ? `${current - prior >= 0 ? "+" : ""}${current - prior}` : ""}</span></> : "—"}</td>{period.mode === "current" ? <td className="px-4 py-3 tabular">{available ? metricCount(row.current28, crime.crime).toLocaleString() : "—"}</td> : null}</tr>;
  })}</tbody></table></div></div>;
}

function SortHeader({ field, active, descending, onSort, children }: { field: SortKey; active: SortKey; descending: boolean; onSort: (field: SortKey) => void; children: React.ReactNode }) {
  return <button onClick={() => onSort(field)} className="flex w-full items-center justify-between gap-2 text-left font-black text-[#35535c] hover:text-[#08766e]">{children}<span aria-hidden="true">{active === field ? descending ? "↓" : "↑" : "↕"}</span></button>;
}
