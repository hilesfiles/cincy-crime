import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mapData from "@/data/processed/geography/neighborhood-map.json";
import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import { PageShell } from "@/components/layout/page-shell";
import { NeighborhoodProfile } from "@/components/neighborhood/neighborhood-profile";
import type { CrimeSummary } from "@/lib/crime/summary";
import type { HistoricalData } from "@/lib/crime/historical";

const summary = summaryJson as CrimeSummary;
export function generateStaticParams() { return summary.neighborhoods.map((row) => ({ slug: row.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const row = summary.neighborhoods.find((item) => item.slug === slug); return row ? { title: row.name, description: `${row.name} current and annual reported-crime statistics from 2011–present.`, openGraph: { title: `${row.name} · Cincinnati Crime Explorer`, description: `Current and historical reported-crime statistics for ${row.name}.`, images: [] }, twitter: { title: `${row.name} · Cincinnati Crime Explorer`, description: `Current and historical reported-crime statistics for ${row.name}.`, images: [] } } : {}; }
export default async function NeighborhoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = summary.neighborhoods.find((item) => item.slug === slug);
  if (!row) notFound();
  const historical = JSON.parse(await readFile(path.join(process.cwd(), "data/processed/crime/historical-annual-ui.json"), "utf8")) as HistoricalData;
  const neighborhoodSummary = { ...summary, neighborhoods: [row] };
  const neighborhoodHistorical = { ...historical, periods: { annual: historical.periods.annual.map((period) => ({ ...period, neighborhoods: period.neighborhoods.filter((item) => item.slug === slug) })), sameDateYtd: [] } };
  return <PageShell eyebrow="Statistical area profile" title={row.name} description="Switch between the fresher current YTD aggregate and validated calendar-year history from 2011–2025."><NeighborhoodProfile slug={slug} currentSummary={neighborhoodSummary} historical={neighborhoodHistorical} mapData={mapData} /></PageShell>;
}
