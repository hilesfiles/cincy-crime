"use client";

import { useState } from "react";
import { initiativeAllocatedAmount, initiativeNeighborhoodAmount, type InitiativeLedgerData, type InitiativeRecord } from "@/lib/initiatives";
import type { PoliceBudgetData } from "@/lib/budget";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

const geographyLabels = {
  direct: "Direct",
  shared_modeled: "Equal split",
  shared_unallocated: "Named, unallocated",
  citywide_unallocated: "Citywide / unallocated",
  outside_city: "Outside Cincinnati",
} as const;

export function InitiativeExplorer({ data, budgetData }: { data: InitiativeLedgerData; budgetData: PoliceBudgetData }) {
  const programs = [...new Set(data.records.map((row) => row.program))];
  const neighborhoods = budgetData.crimePeriods.at(-1)!.neighborhoods;
  const [program, setProgram] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState("citywide");
  const programRecords = program === "all" ? data.records : data.records.filter((row) => row.program === program);
  const visibleRecords = selectedSlug === "citywide" ? programRecords : programRecords.filter((row) => row.neighborhoods.some((neighborhood) => neighborhood.slug === selectedSlug));
  const total = programRecords.reduce((sum, row) => sum + row.amount, 0);
  const allocated = programRecords.reduce((sum, row) => sum + initiativeAllocatedAmount(row), 0);
  const outsideCity = programRecords.filter((row) => row.geographyStatus === "outside_city").reduce((sum, row) => sum + row.amount, 0);
  const selectedAmount = selectedSlug === "citywide" ? allocated : programRecords.reduce((sum, row) => sum + initiativeNeighborhoodAmount(row, selectedSlug), 0);
  const selectedNamedUnallocated = selectedSlug === "citywide" ? [] : programRecords.filter((row) => row.geographyStatus === "shared_unallocated" && row.neighborhoods.some((neighborhood) => neighborhood.slug === selectedSlug));
  const selectedName = selectedSlug === "citywide" ? "All documented neighborhoods" : neighborhoods.find((row) => row.slug === selectedSlug)?.name ?? selectedSlug;
  const programTotals = programs.map((name) => ({ name, amount: data.records.filter((row) => row.program === name).reduce((sum, row) => sum + row.amount, 0) })).sort((a, b) => b.amount - a.amount);
  const maxProgram = Math.max(...programTotals.map((row) => row.amount));
  const ranking = neighborhoods.map((neighborhood) => ({ ...neighborhood, amount: programRecords.reduce((sum, row) => sum + initiativeNeighborhoodAmount(row, neighborhood.slug), 0), records: programRecords.filter((row) => row.neighborhoods.some((item) => item.slug === neighborhood.slug)).length })).filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount);

  return <div>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <div className="border border-[#d2dcdb] bg-white p-5"><p className="eyebrow">Published amount by program</p><h2 className="mt-1 text-xl font-black text-[#173d4a]">Curated violence-prevention and safety initiatives</h2><div className="mt-5 space-y-4">{programTotals.map((row) => <div key={row.name}><div className="mb-1 flex justify-between gap-4 text-xs"><span className="font-bold text-[#31545e]">{row.name}</span><span className="font-black tabular text-[#173d4a]">{compactMoney.format(row.amount)}</span></div><div className="h-4 bg-[#e5eceb]"><div className="h-full bg-[#287b82]" style={{ width: Math.max(3, row.amount / maxProgram * 100) + "%" }}/></div></div>)}</div></div>
      <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><Kpi label="Published ledger" value={compactMoney.format(data.records.reduce((sum, row) => sum + row.amount, 0))} context={data.records.length + " award or program-level records"}/><Kpi label="Neighborhood-allocated" value={compactMoney.format(data.records.reduce((sum, row) => sum + initiativeAllocatedAmount(row), 0))} context="Only direct or explicitly modeled named-neighborhood shares"/><div className="border-l-4 border-[#8759a8] bg-[#f7f1fa] p-5 text-xs leading-5 text-[#584467]"><strong className="block text-sm">Separate, non-additive ledger</strong><span className="mt-1 block">{data.metadata.nonAdditivityWarning}</span></div></aside>
    </section>

    <section className="mt-7 border border-[#d2dcdb] bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2"><label><Label>Program</Label><select aria-label="Initiative program" value={program} onChange={(event) => setProgram(event.target.value)} className="w-full rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]"><option value="all">All curated programs</option>{programs.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label><Label>Selected neighborhood</Label><select aria-label="Initiative selected neighborhood" value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)} className="w-full rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]"><option value="citywide">All documented neighborhoods</option>{neighborhoods.map((row) => <option key={row.id} value={row.slug}>{row.name}</option>)}</select></label></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Filtered published amount" value={compactMoney.format(total)} context={programRecords.length + " ledger records"}/><Kpi label="Allocated to neighborhoods" value={compactMoney.format(allocated)} context="Direct plus transparent equal-share records"/><Kpi label="Unallocated / citywide" value={compactMoney.format(total - allocated - outsideCity)} context="No invented distribution"/><Kpi label="Outside Cincinnati" value={compactMoney.format(outsideCity)} context="Published recipients outside the SNA map"/></div>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(310px,0.6fr)]">
      <div className="overflow-x-auto border border-[#d2dcdb] bg-white"><div className="p-5"><p className="eyebrow">Award and commitment records</p><h2 className="mt-1 text-xl font-black text-[#173d4a]">{selectedSlug === "citywide" ? "Complete filtered ledger" : selectedName}</h2><p className="mt-2 text-xs leading-5 text-[#607278]">{selectedSlug === "citywide" ? "Program totals include amounts that cannot be assigned to a neighborhood." : "Rows appear only when the official description names this neighborhood; the allocated amount may remain zero when no split is documented."}</p></div><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.05em] text-[#526970]"><tr><th className="px-4 py-3">Recipient / record</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Neighborhood treatment</th><th className="px-4 py-3">Source</th></tr></thead><tbody>{visibleRecords.map((row) => <LedgerRow key={row.id} row={row} selectedSlug={selectedSlug} sourceUrl={data.metadata.sourceUrl}/>)}</tbody></table>{visibleRecords.length === 0 && <p className="border-t border-[#e1e8e7] p-6 text-sm text-[#617379]">No official record in this curated release explicitly names {selectedName}. That is unavailable neighborhood attribution, not zero program activity.</p>}</div>
      <aside className="flex flex-col gap-4"><div className="border-t-4 border-[#d7893f] bg-white p-5 shadow-sm"><p className="eyebrow">Neighborhood view</p><h2 className="mt-2 text-xl font-black text-[#173d4a]">{selectedName}</h2><div className="mt-4 grid grid-cols-2 gap-3"><SmallKpi label="Allocated amount" value={compactMoney.format(selectedAmount)}/><SmallKpi label="Named records" value={selectedSlug === "citywide" ? ranking.length.toString() : visibleRecords.length.toString()}/><SmallKpi label="Named, no split" value={selectedNamedUnallocated.length.toString()}/><SmallKpi label="Method" value={selectedSlug === "citywide" ? "Documented" : selectedAmount > 0 ? "Direct / split" : "Unavailable"}/></div></div><div className="border border-[#d2dcdb] bg-white p-5"><p className="eyebrow">Allocated neighborhood ranking</p><div className="mt-3 space-y-2">{ranking.map((row) => <button type="button" key={row.slug} onClick={() => setSelectedSlug(row.slug)} className="flex w-full items-center justify-between border-b border-[#e1e8e7] py-2 text-left text-xs hover:text-[#08766e]"><span className="font-bold">{row.name}</span><span className="tabular">{money.format(row.amount)}</span></button>)}</div></div><div className="border-l-4 border-[#d77b33] bg-[#fff8ef] p-5 text-xs leading-5 text-[#715239]"><strong className="block text-sm text-[#70431f]">Geography rule</strong><span className="mt-1 block">{data.metadata.geographyRule} {data.metadata.unallocatedRule}</span></div></aside>
    </section>
  </div>;
}

function LedgerRow({ row, selectedSlug, sourceUrl }: { row: InitiativeRecord; selectedSlug: string; sourceUrl: string }) {
  const neighborhoodAmount = selectedSlug === "citywide" ? initiativeAllocatedAmount(row) : initiativeNeighborhoodAmount(row, selectedSlug);
  return <tr className="border-t border-[#e1e8e7] align-top"><td className="px-4 py-3 font-bold text-[#294a54]">{row.recipient}<span className="mt-1 block text-[0.65rem] font-medium uppercase tracking-[0.07em] text-[#7a898e]">FY{row.fiscalYear} · {row.amountType}</span>{row.note && <span className="mt-1 block max-w-[300px] text-[0.65rem] font-medium normal-case leading-4 text-[#9b5422]">{row.note}</span>}</td><td className="px-4 py-3 text-xs text-[#607278]">{row.program}</td><td className="px-4 py-3 text-xs text-[#607278]">{row.category}</td><td className="px-4 py-3 font-black tabular text-[#143a4a]">{money.format(row.amount)}{neighborhoodAmount > 0 && neighborhoodAmount < row.amount ? <span className="mt-1 block text-[0.65rem] font-medium text-[#6d7e83]">{money.format(neighborhoodAmount)} attributed</span> : null}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-[#e7efee] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.05em] text-[#456069]">{geographyLabels[row.geographyStatus]}</span>{row.neighborhoods.length > 0 && <span className="mt-1 block text-[0.65rem] text-[#6b7c81]">{row.neighborhoods.map((item) => item.name).join(", ")}</span>}</td><td className="px-4 py-3 text-xs"><a href={row.sourceUrl ?? sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-[#08766e] hover:underline">{row.sourcePage ? "PDF p. " + row.sourcePage : "Official release"} ↗</a></td></tr>;
}

function Label({ children }: { children: React.ReactNode }) { return <span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">{children}</span>; }
function Kpi({ label, value, context }: { label: string; value: string; context: string }) { return <div className="border border-[#d6e0df] bg-white p-4"><p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-[#667a80]">{label}</p><p className="mt-1 text-2xl font-black text-[#143a4a] tabular">{value}</p><p className="mt-1 text-[0.7rem] leading-4 text-[#718187]">{context}</p></div>; }
function SmallKpi({ label, value }: { label: string; value: string }) { return <div className="border border-[#d6e0df] p-3"><p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#667a80]">{label}</p><p className="mt-1 text-lg font-black text-[#143a4a] tabular">{value}</p></div>; }
