import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import historicalJson from "@/data/processed/crime/historical-annual-ui.json";
import { ComparisonTool } from "@/components/compare/comparison-tool";
import { PageShell } from "@/components/layout/page-shell";
import type { CrimeSummary } from "@/lib/crime/summary";
import type { HistoricalData } from "@/lib/crime/historical";

export default function ComparePage() { const summary = summaryJson as CrimeSummary; const historical = historicalJson as HistoricalData; return <PageShell eyebrow="Side-by-side analysis" title="Compare statistical areas" description="Compare up to four areas in the current YTD window or any validated calendar year from 2011–2025."><ComparisonTool currentSummary={summary} historical={historical} /></PageShell>; }
