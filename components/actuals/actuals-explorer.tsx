"use client";

import { useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actualAllocation, type PoliceActualsData } from "@/lib/actuals";
import type { PoliceBudgetData } from "@/lib/budget";
import { crimeMetric, crimeMetrics, type CrimeMetricKey } from "@/lib/crime/metrics";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

export function ActualsExplorer({ actuals, budgetData }: { actuals: PoliceActualsData; budgetData: PoliceBudgetData }) {
  const latest = actuals.years.at(-1)!;
  const [fiscalYear, setFiscalYear] = useState(latest.fiscalYear);
  const [metric, setMetric] = useState<CrimeMetricKey>("totalPart1");
  const [selectedSlug, setSelectedSlug] = useState("citywide");
  const allocation = actualAllocation(actuals, budgetData, fiscalYear, metric)!;
  const selected = selectedSlug === "citywide" ? null : allocation.neighborhoods.find((row) => row.slug === selectedSlug) ?? null;
  const rows = [...allocation.neighborhoods].sort((a, b) => b.attributedActual - a.attributedActual);

  return <div>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
      <div className="border border-[#d2dcdb] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Audited annual series</p><h2 className="mt-1 text-xl font-black text-[#173d4a]">General Fund Police actuals</h2></div><p className="text-xs text-[#65777d]">GAAP actual headline · ACFR budget-basis comparison</p></div>
        <div className="mt-4 h-[370px] w-full" role="img" aria-label="Audited Cincinnati Police actual expenditures and ACFR final budget by fiscal year"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={actuals.years} margin={{ top: 12, right: 12, bottom: 5, left: 5 }}><CartesianGrid stroke="#dce4e3" strokeDasharray="3 3"/><XAxis dataKey="fiscalYear" tick={{ fill: "#566b72", fontSize: 10 }}/><YAxis tickFormatter={(value) => "$" + Math.round(Number(value) / 1_000_000) + "m"} tick={{ fill: "#566b72", fontSize: 10 }} width={48}/><Tooltip formatter={(value, name) => [money.format(Number(value)), String(name)]} labelFormatter={(label) => "FY" + label}/><Legend/><Bar name="Final budget · budget basis" dataKey="finalBudget" fill="#b9cfcb"/><Line name="Audited GAAP actual" dataKey="gaapActual" stroke="#143a4a" strokeWidth={3} dot={{ r: 3 }}/><Line name="Actual · budget basis" dataKey="budgetBasisActual" stroke="#d07a35" strokeWidth={2} strokeDasharray="5 4" dot={false}/></ComposedChart></ResponsiveContainer></div>
        <p className="mt-2 text-xs leading-5 text-[#687a80]">GAAP and non-GAAP budget-basis values are separate accounting presentations. The chart shows both but does not treat their difference as a spending variance.</p>
      </div>
      <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Kpi label={"Latest audited · FY" + latest.fiscalYear} value={compactMoney.format(latest.gaapActual)} context="General Fund · Division of Police · GAAP"/>
        <Kpi label="Budget-basis underspend" value={compactMoney.format(latest.budgetBasisVariance)} context={percent.format(latest.budgetBasisVariance / latest.finalBudget) + " below the ACFR final budget on the same basis"}/>
        <div className="border-l-4 border-[#d77b33] bg-[#fff8ef] p-5 text-xs leading-5 text-[#715239]"><strong className="block text-sm text-[#70431f]">Comparable scope</strong><span className="mt-1 block">{actuals.metadata.scopeNote}</span></div>
      </aside>
    </section>

    <section className="mt-7 border border-[#d2dcdb] bg-white p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label><Label>Fiscal year</Label><select aria-label="Actual fiscal year" value={fiscalYear} onChange={(event) => { setFiscalYear(Number(event.target.value)); setSelectedSlug("citywide"); }} className="w-full rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]">{[...actuals.years].reverse().map((row) => <option key={row.fiscalYear} value={row.fiscalYear}>FY{row.fiscalYear}</option>)}</select></label>
        <label><Label>Crime attribution basis</Label><select aria-label="Actual crime attribution basis" value={metric} onChange={(event) => setMetric(event.target.value as CrimeMetricKey)} className="w-full rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]">{crimeMetrics.filter((row) => row.availableFrom <= 2011).map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}</select></label>
        <label><Label>Selected area</Label><select aria-label="Actual selected area" value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)} className="w-full rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]"><option value="citywide">Citywide</option>{allocation.neighborhoods.map((row) => <option key={row.id} value={row.slug}>{row.name}</option>)}</select></label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label={"FY" + fiscalYear + " audited actual"} value={compactMoney.format(allocation.actual.gaapActual)} context="ACFR General Fund GAAP statement"/><Kpi label={crimeMetric(metric).label} value={allocation.cityIncidents.toLocaleString()} context={allocation.period.start + " through " + allocation.period.end}/><Kpi label="Attributed actual per crime" value={money.format(allocation.averagePerIncident)} context="One citywide rate used for allocation"/><Kpi label="Unassigned geography" value={compactMoney.format(allocation.unassignedActual)} context={allocation.unassignedIncidents.toLocaleString() + " crimes retained outside mapped areas"}/></div>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
      <div className="overflow-x-auto border border-[#d2dcdb] bg-white"><div className="p-5"><p className="eyebrow">Crime-share model</p><h2 className="mt-1 text-xl font-black text-[#173d4a]">FY{fiscalYear} attributed actual by neighborhood</h2><p className="mt-2 text-xs leading-5 text-[#607278]">The same transparent allocation used on the budget page, now applied to the audited GAAP actual.</p></div><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.05em] text-[#526970]"><tr><th className="px-4 py-3">Neighborhood</th><th className="px-4 py-3">Crimes</th><th className="px-4 py-3">City share</th><th className="px-4 py-3">Attributed actual</th><th className="px-4 py-3">Per resident</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} onClick={() => setSelectedSlug(row.slug)} className={"cursor-pointer border-t border-[#e1e8e7] hover:bg-[#f3f7f6] " + (selectedSlug === row.slug ? "bg-[#edf6f4]" : "")}><td className="px-4 py-3 font-bold text-[#294a54]">{row.name}</td><td className="px-4 py-3 tabular">{row.incidents.toLocaleString()}</td><td className="px-4 py-3 tabular">{percent.format(row.incidentShare)}</td><td className="px-4 py-3 font-bold tabular text-[#143a4a]">{money.format(row.attributedActual)}</td><td className="px-4 py-3 tabular">{row.attributedPerResident === null ? "—" : money.format(row.attributedPerResident)}</td></tr>)}</tbody></table></div>
      <aside className="flex flex-col gap-4"><div className="border-t-4 border-[#d7893f] bg-white p-5 shadow-sm"><p className="eyebrow">{selected ? "Selected neighborhood" : "Citywide actual"}</p><h2 className="mt-2 text-xl font-black text-[#173d4a]">{selected?.name ?? "Cincinnati"}</h2><div className="mt-4 grid grid-cols-2 gap-3"><SmallKpi label="Reported crimes" value={(selected?.incidents ?? allocation.cityIncidents).toLocaleString()}/><SmallKpi label="Crime share" value={selected ? percent.format(selected.incidentShare) : "100%"}/><SmallKpi label="Attributed actual" value={compactMoney.format(selected?.attributedActual ?? allocation.actual.gaapActual)}/><SmallKpi label="Per resident" value={selected?.attributedPerResident == null ? "—" : money.format(selected.attributedPerResident)}/></div></div><div className="border-l-4 border-[#8759a8] bg-[#f7f1fa] p-5 text-xs leading-5 text-[#584467]"><strong className="block text-sm">Audited city total; modeled neighborhood shares</strong><span className="mt-1 block">{actuals.metadata.allocationWarning}</span></div><div className="border border-[#d2dcdb] bg-white p-5 text-xs leading-5 text-[#607278]"><p className="font-black text-[#173d4a]">Source pages</p><p className="mt-2">GAAP statement: PDF page {allocation.actual.gaapStatementPdfPage}</p><p>Budget schedule: PDF page {allocation.actual.budgetSchedulePdfPage}</p><a href={allocation.actual.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-[#08766e] hover:underline">Open official ACFR ↗</a></div></aside>
    </section>
  </div>;
}

function Label({ children }: { children: ReactNode }) { return <span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">{children}</span>; }
function Kpi({ label, value, context }: { label: string; value: string; context: string }) { return <div className="border border-[#d6e0df] bg-white p-4"><p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-[#667a80]">{label}</p><p className="mt-1 text-2xl font-black text-[#143a4a] tabular">{value}</p><p className="mt-1 text-[0.7rem] leading-4 text-[#718187]">{context}</p></div>; }
function SmallKpi({ label, value }: { label: string; value: string }) { return <div className="border border-[#d6e0df] p-3"><p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#667a80]">{label}</p><p className="mt-1 text-lg font-black text-[#143a4a] tabular">{value}</p></div>; }
