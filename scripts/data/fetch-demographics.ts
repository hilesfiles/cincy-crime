import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalNeighborhoods, slugify } from "../../lib/geography/names";
import { aggregateMarginOfError, interpolatePopulation, type DemographicEstimate, type DemographicsData, type PopulationObservation } from "../../lib/demographics";
import { fetchBytes, mapWithConcurrency, pdfAllLines, pdfPageTokens, sha256 } from "./pdf-text";

type MapRegion = { id: string; slug: string; name: string; sourceName: string; number: number; members: string[] };
type MapData = { regions: MapRegion[] };
type Population2020 = { metadata: { citywidePopulation: number }; civicNeighborhoods: Array<{ name: string; population: number; sourceUrl: string }>; snaRegions: Array<{ id: string; population: number }> };

const planning2010 = "https://www.cincinnati-oh.gov/planning/resources/census/2010/";
const profileMeasures = {
  acsPopulation: { label: "ACS population estimate", universe: "Population in households and group quarters" },
  households: { label: "Households", universe: "Households" },
  education25Plus: { label: "Population age 25 and over", universe: "Population age 25 and over" },
  bachelorsDegree: { label: "Bachelor's degree", universe: "Population age 25 and over" },
  graduateDegree: { label: "Graduate or professional degree", universe: "Population age 25 and over" },
  bachelorsOrHigher: { label: "Bachelor's degree or higher", universe: "Population age 25 and over" },
  familyHouseholds: { label: "Family households", universe: "Family households" },
  familiesBelowPoverty: { label: "Families below poverty", universe: "Family households" },
  householdsNoVehicle: { label: "Households with no vehicle", universe: "Households" },
  occupiedHousingUnits: { label: "Occupied housing units", universe: "Occupied housing units" },
  ownerOccupiedHousing: { label: "Owner-occupied housing units", universe: "Occupied housing units" },
  renterOccupiedHousing: { label: "Renter-occupied housing units", universe: "Occupied housing units" },
  internetSubscription: { label: "Households with an internet subscription", universe: "Households" },
} as const;

function decodeHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&nbsp;", " ").trim();
}

function profileLinks(html: string) {
  const links: Array<{ name: string; url: string }> = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = decodeHtml(match[2]).replace(/\s+2010.*$/i, "").trim();
    if (name === "Citywide" || canonicalNeighborhoods.includes(name as (typeof canonicalNeighborhoods)[number])) links.push({ name, url: new URL(match[1], planning2010).href });
  }
  return [...new Map(links.map((link) => [link.name, link])).values()];
}

function parsePopulation(tokens: string[], name: string) {
  const normalized = tokens.map((token) => token.replace(/\s+/g, " ").trim());
  const candidates = ["TOTAL POPULATION", "Total Population"];
  const index = normalized.findIndex((token) => candidates.some((candidate) => token.toUpperCase() === candidate.toUpperCase()));
  if (index < 0) throw new Error(`TOTAL POPULATION not found in 2010 ${name}`);
  const values: number[] = [];
  for (const token of normalized.slice(index + 1, index + 30)) {
    if (/^\d[\d,]*$/.test(token)) values.push(Number(token.replaceAll(",", "")));
    else if (values.length) break;
  }
  if (values[0] === 1) values.shift();
  const total = values.at(-1);
  if (!total || total < 1) throw new Error(`Population total not parsed for 2010 ${name}`);
  return total;
}

function numericEstimate(lines: string[], label: string, occurrence = 0): DemographicEstimate {
  const indexes = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.toLowerCase().includes(label.toLowerCase()));
  const start = indexes[occurrence]?.index;
  if (start === undefined) throw new Error(`ACS profile row not found: ${label}`);
  const parse = (text: string) => {
    const values = [...text.matchAll(/(?<![$\d])\d[\d,]*/g)].map((match) => Number(match[0].replaceAll(",", "")));
    const percent = /\d[\d,]*%/.test(text);
    if (percent && values.length >= 3) return { estimate: values.at(-3)!, marginOfError: values.at(-2)! };
    if (/\s-\s*$/.test(text) && values.length >= 2) return { estimate: values.at(-2)!, marginOfError: values.at(-1)! };
    return null;
  };
  const previous = lines[start - 1] ?? "";
  const candidates = [lines[start], ...(!/[A-Za-z]/.test(previous) ? [previous] : []), ...lines.slice(start + 1, start + 9)];
  for (const candidate of candidates) {
    const parsed = parse(candidate);
    if (parsed) return parsed;
  }
  throw new Error(`ACS profile values not parsed: ${label}`);
}

function sectionEstimate(lines: string[], section: string, label: string) {
  const sectionIndex = lines.findIndex((line) => line.toLowerCase().includes(section.toLowerCase()));
  if (sectionIndex < 0) throw new Error(`ACS profile section not found: ${section}`);
  return numericEstimate(lines.slice(sectionIndex, sectionIndex + 140), label);
}

async function fetchOfficialSnaAcsProfiles(population2020: Population2020) {
  const citywideUrl = "https://www.cincinnati-oh.gov/sites/planning/assets/Census/2020/Citywide.pdf";
  const links = [{ name: "Citywide", sourceUrl: citywideUrl }, ...population2020.civicNeighborhoods.map(({ name, sourceUrl }) => ({ name, sourceUrl }))];
  const profiles = await mapWithConcurrency(links, 5, async (link) => {
    const bytes = await fetchBytes(link.sourceUrl);
    const lines = await pdfAllLines(bytes, 2);
    let measures: Record<string, DemographicEstimate>;
    try { measures = {
      acsPopulation: sectionEstimate(lines, "HOUSEHOLD BY RELATIONSHIP", "Total"),
      households: sectionEstimate(lines, "INCOME", "Total Households"),
      education25Plus: sectionEstimate(lines, "EDUCATIONAL ATTAINMENT", "Total"),
      bachelorsDegree: sectionEstimate(lines, "EDUCATIONAL ATTAINMENT", "Bachelor's degree"),
      graduateDegree: sectionEstimate(lines, "EDUCATIONAL ATTAINMENT", "Graduate or professional"),
      familyHouseholds: sectionEstimate(lines, "POVERTY STATUS", "Total family households"),
      familiesBelowPoverty: sectionEstimate(lines, "POVERTY STATUS", "Family households with income"),
      householdsNoVehicle: sectionEstimate(lines, "VEHICLES AVAILABLE", "No vehicle available"),
      occupiedHousingUnits: sectionEstimate(lines, "HOUSING TENURE", "Total Occupied Housing Units"),
      ownerOccupiedHousing: sectionEstimate(lines, "HOUSING TENURE", "Owner Occupied"),
      renterOccupiedHousing: sectionEstimate(lines, "HOUSING TENURE", "Renter Occupied"),
      internetSubscription: sectionEstimate(lines, "INTERNET SUBSCRIPTIONS IN", "With an internet subscription"),
    }; } catch (error) {
      if (["Sedamsville", "Westwood"].includes(link.name)) return { name: link.name, sourceUrl: link.sourceUrl, checksumSha256: sha256(bytes), measures: null, extractionNote: "The official table is image-only; ACS values remain unavailable rather than being inferred." };
      throw new Error(`${link.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    measures.bachelorsOrHigher = { estimate: measures.bachelorsDegree.estimate + measures.graduateDegree.estimate, marginOfError: aggregateMarginOfError([{ weight: 1, marginOfError: measures.bachelorsDegree.marginOfError }, { weight: 1, marginOfError: measures.graduateDegree.marginOfError }]) };
    return { name: link.name, sourceUrl: link.sourceUrl, checksumSha256: sha256(bytes), measures };
  });
  return profiles;
}

async function fetch2010Profiles(map: MapData) {
  const response = await fetch(planning2010, { headers: { "user-agent": "cincy-crime-data-pipeline/0.3" } });
  if (!response.ok) throw new Error(`2010 population index request failed (${response.status})`);
  const html = await response.text();
  const links = profileLinks(html);
  const missing = ["Citywide", ...canonicalNeighborhoods].filter((name) => !links.some((link) => link.name === name));
  if (missing.length) throw new Error(`2010 population profiles missing: ${missing.join(", ")}`);
  const profiles = await mapWithConcurrency(links, 6, async (link) => {
    const bytes = await fetchBytes(link.url);
    let population: number | null = null;
    for (const page of [1, 2, 3]) {
      try { population = parsePopulation(await pdfPageTokens(bytes, page), link.name); break; } catch { /* try next page */ }
    }
    if (!population) throw new Error(`2010 population not parsed for ${link.name}`);
    return { name: link.name, slug: slugify(link.name), population, sourceUrl: link.url, checksumSha256: sha256(bytes), extractionMethod: "pdf_text_table" };
  });
  const byName = new Map(profiles.map((row) => [row.name, row.population]));
  const citywide = byName.get("Citywide");
  if (!citywide) throw new Error("2010 Citywide profile missing");
  return {
    metadata: { sourceSystem: "CITY_PLANNING_2010_SNA_PROFILES", indexUrl: planning2010, populationYear: 2010, citywidePopulation: citywide, indexChecksumSha256: sha256(html) },
    civicNeighborhoods: profiles.filter((row) => row.name !== "Citywide"),
    snaRegions: map.regions.map((region) => ({ ...region, population: region.members.reduce((sum, member) => sum + (byName.get(member) ?? 0), 0), method: region.members.length > 1 ? "sum_of_civic_member_profiles" : "direct_civic_profile" })),
  };
}

function populationSeries(anchor2010: number, anchor2020: number, acs: Array<{ year: number; value: DemographicEstimate }>, throughYear: number, carryMethod: PopulationObservation["method"] = "latest_acs_carry_forward"): PopulationObservation[] {
  const series: PopulationObservation[] = [{ year: 2010, estimate: anchor2010, marginOfError: null, method: "decennial_census", sourceVintage: 2010 }];
  for (let year = 2011; year < 2020; year++) series.push({ year, estimate: interpolatePopulation(anchor2010, anchor2020, year), marginOfError: null, method: "interpolated_decennial_anchors", sourceVintage: 2020 });
  series.push({ year: 2020, estimate: anchor2020, marginOfError: null, method: "decennial_census", sourceVintage: 2020 });
  for (const item of acs) series.push({ year: item.year, estimate: item.value.estimate, marginOfError: item.value.marginOfError, method: "acs_5year_allocated", sourceVintage: item.year });
  const latest = series.at(-1)!;
  for (let year = latest.year + 1; year <= throughYear; year++) series.push({ ...latest, year, method: carryMethod, sourceVintage: latest.year });
  return series;
}

export async function fetchDemographics() {
  const root = process.cwd();
  const generatedAt = new Date().toISOString();
  const [map, population2020] = await Promise.all([
    readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8").then(JSON.parse) as Promise<MapData>,
    readFile(path.join(root, "data/processed/demographics/population-2020.json"), "utf8").then(JSON.parse) as Promise<Population2020>,
  ]);
  console.log("Fetching official 2010 City Planning SNA profiles...");
  const population2010 = await fetch2010Profiles(map);
  console.log("Fetching the official City Planning 2016-2020 ACS SNA profile tables and margins of error...");
  const officialAcsProfiles = await fetchOfficialSnaAcsProfiles(population2020);
  const acsByName = new Map(officialAcsProfiles.map((row) => [row.name, row]));
  const p2010ById = new Map(population2010.snaRegions.map((row) => [row.id, row.population]));
  const p2020ById = new Map(population2020.snaRegions.map((row) => [row.id, row.population]));
  const latestYear = 2020;
  const neighborhoods = map.regions.map((region) => {
    const members = region.members.map((member) => acsByName.get(member)).filter((row): row is NonNullable<typeof row> => Boolean(row));
    const complete = members.length === region.members.length && members.every((row) => row.measures !== null);
    const measures = complete ? Object.fromEntries(Object.keys(profileMeasures).map((key) => [key, { estimate: members.reduce((sum, row) => sum + (row.measures?.[key]?.estimate ?? 0), 0), marginOfError: aggregateMarginOfError(members.map((row) => ({ weight: 1, marginOfError: row.measures?.[key]?.marginOfError ?? null }))) }])) as Record<string, DemographicEstimate> : null;
    return { id: region.id, slug: region.slug, name: region.name, sourceName: region.sourceName, members: region.members, population: populationSeries(p2010ById.get(region.id) ?? 0, p2020ById.get(region.id) ?? 0, [], new Date().getFullYear(), "decennial_carry_forward"), latestAcs: measures ? { year: latestYear, measures } : null };
  });
  const cityAcs = acsByName.get("Citywide");
  if (!cityAcs?.measures) throw new Error("Citywide ACS profile is missing");
  const output: DemographicsData = {
    metadata: {
      generatedAt, geographyVersion: "SNA_2020", decennialAnchors: [2010, 2020], acsYears: [2020], latestAcsYear: latestYear, currentPopulationYear: latestYear, currentPopulationMethod: "decennial_carry_forward",
      allocationMethod: "The City Planning SNA profiles publish tract-level 2016-2020 ACS estimates already aggregated to each neighborhood approximation. Combined map regions sum their civic-member estimates.",
      marginOfErrorMethod: "Published 90% ACS margins of error are retained directly. For combined map regions and composite education measures they are combined by root-sum-of-squares; these derived margins are approximate.",
      measures: Object.fromEntries(Object.entries(profileMeasures).map(([key, value]) => [key, { label: value.label, universe: value.universe, kind: "count" as const }])),
      sources: [{ label: "Cincinnati City Planning 2010 SNA profiles", url: planning2010 }, { label: "Cincinnati City Planning 2020 SNA profiles", url: "https://www.cincinnati-oh.gov/planning/resources/census/2020/" }, { label: "Census ACS 5-year program", url: "https://www.census.gov/programs-surveys/acs/data.html" }],
    },
    citywide: { population: populationSeries(population2010.metadata.citywidePopulation, population2020.metadata.citywidePopulation, [], new Date().getFullYear(), "decennial_carry_forward"), latestAcs: { year: latestYear, measures: cityAcs.measures } },
    neighborhoods,
  };
  const subsetPairs = [["bachelorsOrHigher", "education25Plus"], ["familiesBelowPoverty", "familyHouseholds"], ["householdsNoVehicle", "households"], ["ownerOccupiedHousing", "occupiedHousingUnits"], ["renterOccupiedHousing", "occupiedHousingUnits"], ["internetSubscription", "households"]] as const;
  const invalidRatios = neighborhoods.flatMap((row) => row.latestAcs ? subsetPairs.filter(([numerator, denominator]) => row.latestAcs!.measures[numerator].estimate > row.latestAcs!.measures[denominator].estimate * 1.02).map(([numerator, denominator]) => ({ neighborhood: row.name, numerator, denominator })) : []);
  const validation = {
    generatedAt, status: neighborhoods.length === 50 && neighborhoods.every((row) => row.population.length >= 17 && row.population.every((item) => item.estimate > 0)) && invalidRatios.length === 0 ? neighborhoods.every((row) => row.latestAcs) ? "pass" : "warning" : "fail",
    census2010Profiles: population2010.civicNeighborhoods.length, census2020Profiles: population2020.civicNeighborhoods.length, snaRegions: neighborhoods.length, officialAcsProfiles: officialAcsProfiles.length,
    acsYears: [2020], latestAcsYear: latestYear,
    neighborhoodsWithAcs: neighborhoods.filter((row) => row.latestAcs).length, unavailableAcsNeighborhoods: neighborhoods.filter((row) => !row.latestAcs).map((row) => row.name), invalidRatios, allocationMethod: output.metadata.allocationMethod, marginOfErrorMethod: output.metadata.marginOfErrorMethod,
  };
  await Promise.all([mkdir(path.join(root, "data/processed/demographics"), { recursive: true }), mkdir(path.join(root, "public/data"), { recursive: true }), mkdir(path.join(root, "data/reports"), { recursive: true })]);
  await Promise.all([
    writeFile(path.join(root, "data/processed/demographics/population-2010.json"), `${JSON.stringify(population2010, null, 2)}\n`),
    writeFile(path.join(root, "data/processed/demographics/neighborhood-demographics.json"), `${JSON.stringify(output, null, 2)}\n`),
    writeFile(path.join(root, "public/data/neighborhood-demographics.json"), `${JSON.stringify(output)}\n`),
    writeFile(path.join(root, "data/reports/demographics-validation.json"), `${JSON.stringify(validation, null, 2)}\n`),
  ]);
  if (validation.status === "fail") throw new Error("Demographics validation failed");
  console.log(JSON.stringify({ event: "demographics_processed", ...validation }, null, 2));
  return output;
}

if (require.main === module) fetchDemographics().catch((error) => { console.error(error); process.exitCode = 1; });
