import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalNeighborhoods, slugify } from "../../lib/geography/names";
import { fetchBytes, mapWithConcurrency, pdfPageTokens, sha256 } from "./pdf-text";

const indexUrl = "https://www.cincinnati-oh.gov/planning/resources/census/2020/";
const visuallyVerifiedPdfTotals: Record<string, number> = {
  // This profile's table is image-only. The value is read from the official page-2 TOTAL POPULATION row.
  Sedamsville: 1256,
  Westwood: 33774,
};

type MapData = { regions: Array<{ id: string; slug: string; name: string; sourceName: string; number: number; members: string[] }> };

function decodeHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&nbsp;", " ").trim();
}

function profileLinks(html: string) {
  const links: Array<{ name: string; url: string }> = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = decodeHtml(match[2]);
    const url = new URL(match[1], indexUrl).href;
    if (name === "Citywide" || canonicalNeighborhoods.includes(name as (typeof canonicalNeighborhoods)[number])) links.push({ name, url });
  }
  return [...new Map(links.map((link) => [link.name, link])).values()];
}

function parseTotalPopulation(tokens: string[], name: string) {
  const index = tokens.findIndex((token) => token.replace(/\s+/g, " ").toUpperCase() === "TOTAL POPULATION");
  if (index < 0) throw new Error(`TOTAL POPULATION not found in ${name}`);
  const values: number[] = [];
  for (const token of tokens.slice(index + 1)) {
    if (/^\d[\d,]*$/.test(token)) values.push(Number(token.replaceAll(",", "")));
    else if (values.length > 1) break;
  }
  if (values[0] === 1) values.shift();
  const total = values.at(-1);
  if (!total || total < 1) throw new Error(`Population total not parsed for ${name}`);
  return total;
}

export async function fetchPopulation() {
  const root = process.cwd();
  const retrievedAt = new Date().toISOString();
  const response = await fetch(indexUrl, { headers: { "user-agent": "cincy-crime-data-pipeline/0.2" } });
  if (!response.ok) throw new Error(`Population index request failed (${response.status})`);
  const indexHtml = await response.text();
  const links = profileLinks(indexHtml);
  const expected = new Set(["Citywide", ...canonicalNeighborhoods]);
  const missing = [...expected].filter((name) => !links.some((link) => link.name === name));
  if (missing.length) throw new Error(`Population profiles missing: ${missing.join(", ")}`);

  console.log(`Fetching ${links.length} official City Planning population profiles...`);
  const profiles = await mapWithConcurrency(links, 6, async (link) => {
    const bytes = await fetchBytes(link.url);
    const tokens = await pdfPageTokens(bytes, 2);
    const visualTotal = visuallyVerifiedPdfTotals[link.name];
    return { name: link.name, slug: slugify(link.name), population: visualTotal ?? parseTotalPopulation(tokens, link.name), extractionMethod: visualTotal ? "visually_verified_official_pdf_table" : "pdf_text_table", sourceUrl: link.url, checksumSha256: sha256(bytes) };
  });
  const citywide = profiles.find((profile) => profile.name === "Citywide");
  const civicNeighborhoods = profiles.filter((profile) => profile.name !== "Citywide");
  const civicTotal = civicNeighborhoods.reduce((sum, row) => sum + row.population, 0);
  if (!citywide) throw new Error("Citywide population profile is missing");
  const reconciliation = {
    status: civicTotal === citywide.population ? "pass" : "warning",
    civicPopulationSum: civicTotal,
    citywidePopulation: citywide.population,
    difference: civicTotal - citywide.population,
    additive: civicTotal === citywide.population,
    note: civicTotal === citywide.population
      ? "Published neighborhood-profile totals reconcile to the direct Citywide profile."
      : "The published SNA-profile totals do not reconcile additively to the direct Citywide profile. Use each neighborhood profile only as that neighborhood's published denominator; use the direct Citywide profile for citywide rates.",
  };

  const map = JSON.parse(await readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8")) as MapData;
  const byName = new Map(civicNeighborhoods.map((row) => [row.name, row]));
  const snaRegions = map.regions.map((region) => ({
    id: region.id,
    slug: region.slug,
    name: region.name,
    sourceName: region.sourceName,
    snaNumber: region.number,
    members: region.members,
    population: region.members.reduce((sum, member) => sum + (byName.get(member)?.population ?? 0), 0),
    method: region.members.length > 1 ? "sum_of_civic_member_profiles" : "direct_civic_profile",
  }));
  if (snaRegions.some((region) => region.population <= 0)) throw new Error("One or more SNA regions has no population denominator");

  const output = {
    metadata: {
      sourceSystem: "CITY_PLANNING_2020_SNA_PROFILES",
      title: "2020 Statistical Neighborhood Approximations",
      indexUrl,
      retrievedAt,
      populationYear: 2020,
      measure: "2020 Decennial Census total population",
      geographyVersion: "SNA_2020",
      citywidePopulation: citywide.population,
      profileCount: civicNeighborhoods.length,
      indexChecksumSha256: sha256(indexHtml),
      reconciliation,
    },
    civicNeighborhoods,
    snaRegions,
  };
  await Promise.all([
    mkdir(path.join(root, "data/processed/demographics"), { recursive: true }),
    mkdir(path.join(root, "public/data"), { recursive: true }),
    mkdir(path.join(root, "data/reports"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(root, "data/processed/demographics/population-2020.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "public/data/population-2020.json"), `${JSON.stringify(output)}\n`),
    writeFile(path.join(root, "data/reports/population-validation.json"), `${JSON.stringify({ generatedAt: retrievedAt, civicProfileCount: civicNeighborhoods.length, snaRegionCount: snaRegions.length, ...reconciliation, missingProfiles: missing }, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ event: "population_processed", profiles: civicNeighborhoods.length, citywidePopulation: citywide.population, reconciliationStatus: reconciliation.status }, null, 2));
  return output;
}

if (require.main === module) fetchPopulation().catch((error) => { console.error(error); process.exitCode = 1; });
