import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mapData from "@/data/processed/geography/neighborhood-map.json";
import summaryJson from "@/data/processed/crime/cpd-neighborhood-summary.json";
import demographicsJson from "@/data/processed/demographics/neighborhood-demographics.json";
import electionsJson from "@/data/processed/elections/neighborhood-elections.json";
import { PageShell } from "@/components/layout/page-shell";
import { NeighborhoodProfile } from "@/components/neighborhood/neighborhood-profile";
import type { CrimeSummary } from "@/lib/crime/summary";
import type { HistoricalData } from "@/lib/crime/historical";
import type { DemographicsData } from "@/lib/demographics";
import type { ElectionsData } from "@/lib/elections";
import { socialImageAlt, socialImageUrl } from "@/lib/site-metadata";

const summary = summaryJson as CrimeSummary;
export function generateStaticParams() { return summary.neighborhoods.map((row) => ({ slug: row.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const row = summary.neighborhoods.find((item) => item.slug === slug); return row ? { title: row.name, description: `${row.name} current and annual reported-crime statistics from 2011–present.`, openGraph: { title: `${row.name} · Cincinnati Neighborhood Crime Explorer`, description: `Current and historical reported-crime statistics for ${row.name}.`, images: [{ url: socialImageUrl, width: 1878, height: 1442, alt: socialImageAlt }] }, twitter: { card: "summary_large_image", title: `${row.name} · Cincinnati Neighborhood Crime Explorer`, description: `Current and historical reported-crime statistics for ${row.name}.`, images: [{ url: socialImageUrl, alt: socialImageAlt }] } } : {}; }
export default async function NeighborhoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = summary.neighborhoods.find((item) => item.slug === slug);
  if (!row) notFound();
  const historical = JSON.parse(await readFile(path.join(process.cwd(), "data/processed/crime/historical-annual-ui.json"), "utf8")) as HistoricalData;
  const neighborhoodSummary = { ...summary, neighborhoods: [row] };
  const neighborhoodHistorical = { ...historical, periods: { annual: historical.periods.annual.map((period) => ({ ...period, neighborhoods: period.neighborhoods.filter((item) => item.slug === slug) })), sameDateYtd: [] } };
  const demographics = demographicsJson as DemographicsData;
  const neighborhoodDemographics = { ...demographics, neighborhoods: demographics.neighborhoods.filter((item) => item.slug === slug) };
  const elections = electionsJson as ElectionsData;
  const neighborhoodElections = { ...elections, elections: elections.elections.map((election) => ({ ...election, neighborhoods: election.neighborhoods.filter((item) => item.slug === slug) })) };
  return <PageShell eyebrow="Statistical area profile" title={row.name} description="Explore aggregate and discrete offense types, annual population denominators, neighborhood ACS estimates, and modeled presidential and midterm voting with visible uncertainty."><NeighborhoodProfile slug={slug} currentSummary={neighborhoodSummary} historical={neighborhoodHistorical} mapData={mapData} demographics={neighborhoodDemographics} elections={neighborhoodElections} /></PageShell>;
}
