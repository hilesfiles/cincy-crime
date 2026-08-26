import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import { ComparisonTool } from "@/components/compare/comparison-tool";
import { PageShell } from "@/components/layout/page-shell";
import type { CrimeSummary } from "@/lib/crime/summary";

export default function ComparePage() { const summary = summaryJson as CrimeSummary; return <PageShell eyebrow="Side-by-side analysis" title="Compare statistical areas" description={`Compare up to four areas using preliminary CPD aggregate counts through ${summary.metadata.cutoff} and verified 2020 population denominators.`}><ComparisonTool summary={summary} /></PageShell>; }
