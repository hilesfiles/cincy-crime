import historicalJson from "@/data/processed/crime/historical-ui.json";
import { PageShell } from "@/components/layout/page-shell";
import { TrendAnalysis } from "@/components/trends/trend-analysis";
import type { HistoricalData } from "@/lib/crime/historical";

export default function TrendsPage() { return <PageShell eyebrow="Historical panel" title="Long-term trends" description="Analyze complete calendar years from 2011–2025 or compare every year through the same August 22 YTD cutoff, including the current preliminary 2026 aggregate."><TrendAnalysis historical={historicalJson as HistoricalData} /></PageShell>; }
