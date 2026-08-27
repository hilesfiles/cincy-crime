"use client";

import { useEffect, useState } from "react";
import { BudgetExplorer } from "./budget-explorer";
import type { PoliceBudgetData } from "@/lib/budget";

export function BudgetPageClient() {
  const [data, setData] = useState<PoliceBudgetData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("../data/police-budget.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`Budget data request failed: ${response.status}`); return response.json() as Promise<PoliceBudgetData>; })
      .then(setData)
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(true); });
    return () => controller.abort();
  }, []);
  if (error) return <div role="alert" className="border-l-4 border-[#b51f2e] bg-[#fff3f2] p-5 text-sm font-semibold text-[#74202a]">Budget data could not be loaded. Refresh the page or check Data status.</div>;
  if (!data) return <div role="status" className="border border-[#d2dcdb] bg-white p-6 text-sm font-semibold text-[#536970]">Loading budget ledger and fiscal-year crime allocation…</div>;
  return <BudgetExplorer data={data} />;
}
