import historicalJson from "@/data/processed/crime/historical-ui.json";
import { PageShell } from "@/components/layout/page-shell";
import { TrendAnalysis } from "@/components/trends/trend-analysis";
import type { HistoricalData } from "@/lib/crime/historical";

export default function TrendsPage() {
  const historical = historicalJson as HistoricalData;
  const cutoffLabel = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`2000-${historical.metadata.sameDateCutoff}T00:00:00Z`));
  return <PageShell eyebrow="Historical panel" title="Long-term trends" description={`Track aggregate or discrete offense types across complete calendar years from 2011–2025 or comparable ${cutoffLabel} YTD periods through 2026.`}><TrendAnalysis historical={historical} /></PageShell>;
}
