import historicalJson from "@/data/processed/crime/historical-ui.json";
import { PageShell } from "@/components/layout/page-shell";
import { TrendAnalysis } from "@/components/trends/trend-analysis";
import type { HistoricalData } from "@/lib/crime/historical";

export default function TrendsPage() { return <PageShell eyebrow="Historical panel" title="Long-term trends" description="Track aggregate or discrete offense types across complete calendar years from 2011–2025 or comparable August 22 YTD periods through 2026."><TrendAnalysis historical={historicalJson as HistoricalData} /></PageShell>; }
