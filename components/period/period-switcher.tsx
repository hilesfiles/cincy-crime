"use client";

import { useEffect, useState } from "react";

export type PeriodMode = "current" | "annual";

export function usePeriodSelection(availableYears: number[]) {
  const defaultYear = Math.max(...availableYears);
  const [mode, setModeState] = useState<PeriodMode>("current");
  const [year, setYearState] = useState(defaultYear);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedYear = Number(params.get("year"));
    if (params.get("period") === "annual" && availableYears.includes(requestedYear)) {
      const timer = window.setTimeout(() => { setModeState("annual"); setYearState(requestedYear); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [availableYears]);
  const writeUrl = (nextMode: PeriodMode, nextYear: number) => {
    const url = new URL(window.location.href);
    if (nextMode === "annual") { url.searchParams.set("period", "annual"); url.searchParams.set("year", String(nextYear)); }
    else { url.searchParams.delete("period"); url.searchParams.delete("year"); }
    window.history.replaceState({}, "", url);
  };
  const setMode = (nextMode: PeriodMode) => { setModeState(nextMode); writeUrl(nextMode, year); };
  const setYear = (nextYear: number) => { setYearState(nextYear); setModeState("annual"); writeUrl("annual", nextYear); };
  return { mode, year, setMode, setYear };
}

export function PeriodSwitcher({ mode, year, availableYears, onModeChange, onYearChange }: { mode: PeriodMode; year: number; availableYears: number[]; onModeChange: (mode: PeriodMode) => void; onYearChange: (year: number) => void }) {
  return <div className="flex flex-wrap items-end gap-3" aria-label="Crime reporting period"><div><span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">Period</span><div className="flex overflow-hidden rounded-sm border border-[#aebfbd]"><button type="button" aria-pressed={mode === "current"} onClick={() => onModeChange("current")} className={`px-3 py-2 text-sm font-bold ${mode === "current" ? "bg-[#0a766e] text-white" : "bg-white text-[#173d4a] hover:bg-[#edf3f2]"}`}>Current YTD</button><button type="button" aria-pressed={mode === "annual"} onClick={() => onModeChange("annual")} className={`border-l border-[#aebfbd] px-3 py-2 text-sm font-bold ${mode === "annual" ? "bg-[#0a766e] text-white" : "bg-white text-[#173d4a] hover:bg-[#edf3f2]"}`}>Calendar year</button></div></div><label><span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">Year</span><select aria-label="Calendar year" value={year} disabled={mode !== "annual"} onChange={(event) => onYearChange(Number(event.target.value))} className="min-w-[110px] rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a] disabled:bg-[#edf1f0] disabled:text-[#869397]">{[...availableYears].sort((a, b) => b - a).map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>;
}
