import summaryJson from "@/data/processed/crime/current-summary.json";
import { ComparisonTool } from "@/components/compare/comparison-tool";
import { PageShell } from "@/components/layout/page-shell";
import type { CrimeSummary } from "@/lib/crime/summary";

export default function ComparePage() { const summary = summaryJson as CrimeSummary; return <PageShell eyebrow="Side-by-side analysis" title="Compare statistical areas" description="Compare up to four areas using the same units and the same date windows. Counts, change, and rates are kept separate."><ComparisonTool summary={summary} /></PageShell>; }
