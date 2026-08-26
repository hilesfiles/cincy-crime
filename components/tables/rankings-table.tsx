"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatChange, type CrimeSummary } from "@/lib/crime/summary";

type SortKey = "name" | "violent" | "change" | "recent" | "property" | "part1";
export function RankingsTable({ summary }: { summary: CrimeSummary }) {
  const [sortKey, setSortKey] = useState<SortKey>("violent"); const [descending, setDescending] = useState(true);
  const rows = useMemo(() => [...summary.neighborhoods].sort((a, b) => {
    const value = (row: typeof a) => sortKey === "name" ? row.name : sortKey === "violent" ? row.currentYtd.violent : sortKey === "change" ? row.changes.violentYtd.value ?? Number.POSITIVE_INFINITY : sortKey === "recent" ? row.changes.violent28.value ?? Number.POSITIVE_INFINITY : sortKey === "property" ? row.currentYtd.property : row.currentYtd.totalPart1;
    const av = value(a); const bv = value(b); const result = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv); return descending ? -result : result;
  }), [summary.neighborhoods, sortKey, descending]);
  const sort = (key: SortKey) => { if (sortKey === key) setDescending((value) => !value); else { setSortKey(key); setDescending(key !== "name"); } };
  return <div className="overflow-x-auto border border-[#d4dedc] bg-white"><table className="w-full min-w-[880px] border-collapse text-sm"><caption className="sr-only">Cincinnati statistical area reported-crime rankings</caption><thead className="bg-[#edf3f2] text-xs uppercase tracking-[0.06em]"><tr><th className="px-4 py-3"><SortHeader field="name" active={sortKey} descending={descending} onSort={sort}>Statistical area</SortHeader></th><th className="px-4 py-3"><SortHeader field="violent" active={sortKey} descending={descending} onSort={sort}>Violent YTD</SortHeader></th><th className="px-4 py-3"><SortHeader field="change" active={sortKey} descending={descending} onSort={sort}>YTD change</SortHeader></th><th className="px-4 py-3"><SortHeader field="recent" active={sortKey} descending={descending} onSort={sort}>28-day change</SortHeader></th><th className="px-4 py-3"><SortHeader field="property" active={sortKey} descending={descending} onSort={sort}>Property YTD</SortHeader></th><th className="px-4 py-3"><SortHeader field="part1" active={sortKey} descending={descending} onSort={sort}>Total Part I</SortHeader></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[#e1e8e7] hover:bg-[#f8faf9]"><td className="px-4 py-3 font-bold text-[#173e4a]"><Link href={`/neighborhood/${row.slug}`} className="hover:text-[#08766e] hover:underline">{row.name}</Link></td><td className="px-4 py-3 tabular">{row.currentYtd.violent}<span className="ml-1 text-xs text-[#7b898d]">({row.priorYtd.violent})</span></td><td className="px-4 py-3 tabular"><span className={row.changes.violentYtd.value && row.changes.violentYtd.value > 0 ? "font-bold text-[#a74d27]" : "font-bold text-[#08766e]"}>{formatChange(row.changes.violentYtd)}</span><span className="ml-2 text-xs text-[#7b898d]">{row.currentYtd.violent - row.priorYtd.violent >= 0 ? "+" : ""}{row.currentYtd.violent - row.priorYtd.violent}</span></td><td className="px-4 py-3 tabular">{formatChange(row.changes.violent28)}</td><td className="px-4 py-3 tabular">{row.currentYtd.property}</td><td className="px-4 py-3 font-bold tabular">{row.currentYtd.totalPart1}</td></tr>)}</tbody></table></div>;
}

function SortHeader({ field, active, descending, onSort, children }: { field: SortKey; active: SortKey; descending: boolean; onSort: (field: SortKey) => void; children: React.ReactNode }) {
  return <button onClick={() => onSort(field)} className="flex w-full items-center justify-between gap-2 text-left font-black text-[#35535c] hover:text-[#08766e]">{children}<span aria-hidden="true">{active === field ? descending ? "↓" : "↑" : "↕"}</span></button>;
}
