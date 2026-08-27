import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalNeighborhoods, slugify } from "../../lib/geography/names";
import { aggregateMarginOfError, interpolatePopulation, type DemographicEstimate, type DemographicsData, type PopulationObservation } from "../../lib/demographics";
import { fetchBytes, mapWithConcurrency, pdfAllLines, pdfPageTokens, sha256 } from "./pdf-text";
import imageProfileOverrides from "../../data/manifests/demographic-image-profile-overrides.json";

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

type EstimateCandidate = { value: DemographicEstimate; score: number };

function parseEstimateLine(text: string): DemographicEstimate | null {
  const values = [...text.matchAll(/(?<![$\d])\d[\d,]*/g)].map((match) => Number(match[0].replaceAll(",", "")));
  const percent = /\d[\d,]*%/.test(text);
  if (percent && values.length >= 3) return { estimate: values.at(-3)!, marginOfError: values.at(-2)! };
  if (/\s-\s*$/.test(text) && values.length >= 2) return { estimate: values.at(-2)!, marginOfError: values.at(-1)! };
  return null;
}

function numericEstimateCandidates(lines: string[], label: string, occurrence = 0): EstimateCandidate[] {
  const indexes = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.toLowerCase().includes(label.toLowerCase()));
  const start = indexes[occurrence]?.index;
  if (start === undefined) throw new Error(`ACS profile row not found: ${label}`);
  // The Planning PDFs do not have one stable text order. A wrapped table row can put
  // its values on the label line, after the label, or immediately before it. Retain
  // every nearby possibility and let the published table identities select the row.
  const offsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, -1, -2, -3, -4];
  const preferImmediateBackward = new Set(["bachelor's degree", "graduate or professional", "total family households"]).has(label.toLowerCase());
  const candidates = new Map<string, EstimateCandidate>();
  for (const offset of offsets) {
    const parsed = parseEstimateLine(lines[start + offset] ?? "");
    if (!parsed) continue;
    // These three rows are the known places where the PDF generator commonly emits
    // the values immediately before the label. A forward value at the same distance
    // still wins a tie, which preserves profiles whose text order is conventional.
    const score = offset >= 0 ? offset : preferImmediateBackward ? Math.abs(offset) : 20 + Math.abs(offset);
    const key = `${parsed.estimate}:${parsed.marginOfError}`;
    const existing = candidates.get(key);
    if (!existing || score < existing.score) candidates.set(key, { value: parsed, score });
  }
  if (candidates.size) return [...candidates.values()].sort((a, b) => a.score - b.score);
  throw new Error(`ACS profile values not parsed: ${label}`);
}

function sectionEstimateCandidates(lines: string[], section: string, label: string) {
  const sectionIndex = lines.findIndex((line) => line.toLowerCase().includes(section.toLowerCase()));
  if (sectionIndex < 0) throw new Error(`ACS profile section not found: ${section}`);
  return numericEstimateCandidates(lines.slice(sectionIndex, sectionIndex + 140), label);
}

function firstCandidate(candidates: EstimateCandidate[]) {
  return candidates[0].value;
}

function subsetCandidate(candidates: EstimateCandidate[], denominator: number) {
  return (candidates.find((candidate) => candidate.value.estimate <= denominator) ?? candidates[0]).value;
}

function resolveTextProfileMeasures(lines: string[]) {
  const candidates = {
    acsPopulation: sectionEstimateCandidates(lines, "HOUSEHOLD BY RELATIONSHIP", "Total"),
    households: sectionEstimateCandidates(lines, "INCOME", "Total Households"),
    education25Plus: sectionEstimateCandidates(lines, "EDUCATIONAL ATTAINMENT", "Total"),
    bachelorsDegree: sectionEstimateCandidates(lines, "EDUCATIONAL ATTAINMENT", "Bachelor's degree"),
    graduateDegree: sectionEstimateCandidates(lines, "EDUCATIONAL ATTAINMENT", "Graduate or professional"),
    familyHouseholds: sectionEstimateCandidates(lines, "POVERTY STATUS", "Total family households"),
    familiesBelowPoverty: sectionEstimateCandidates(lines, "POVERTY STATUS", "Family households with income"),
    householdsNoVehicle: sectionEstimateCandidates(lines, "VEHICLES AVAILABLE", "No vehicle available"),
    occupiedHousingUnits: sectionEstimateCandidates(lines, "HOUSING TENURE", "Total Occupied Housing Units"),
    ownerOccupiedHousing: sectionEstimateCandidates(lines, "HOUSING TENURE", "Owner Occupied"),
    renterOccupiedHousing: sectionEstimateCandidates(lines, "HOUSING TENURE", "Renter Occupied"),
    internetSubscription: sectionEstimateCandidates(lines, "INTERNET SUBSCRIPTIONS IN", "With an internet subscription"),
  };

  let bestHousing: { score: number; households: DemographicEstimate; occupied: DemographicEstimate; owner: DemographicEstimate; renter: DemographicEstimate } | null = null;
  for (const households of candidates.households) for (const occupied of candidates.occupiedHousingUnits) {
    if (households.value.estimate !== occupied.value.estimate) continue;
    for (const owner of candidates.ownerOccupiedHousing) for (const renter of candidates.renterOccupiedHousing) {
      if (owner.value.estimate + renter.value.estimate !== occupied.value.estimate) continue;
      const score = households.score + occupied.score + owner.score + renter.score;
      if (!bestHousing || score < bestHousing.score) bestHousing = { score, households: households.value, occupied: occupied.value, owner: owner.value, renter: renter.value };
    }
  }
  if (!bestHousing) throw new Error("ACS housing rows do not reconcile: households = occupied = owner + renter");

  const acsPopulation = firstCandidate(candidates.acsPopulation);
  const educationTotals = candidates.education25Plus.filter((candidate) => candidate.value.estimate <= acsPopulation.estimate);
  let bestEducation: { score: number; total: DemographicEstimate; bachelors: DemographicEstimate; graduate: DemographicEstimate } | null = null;
  for (const total of educationTotals) for (const bachelors of candidates.bachelorsDegree) for (const graduate of candidates.graduateDegree) {
    if (bachelors.value.estimate + graduate.value.estimate > total.value.estimate) continue;
    const score = total.score + bachelors.score + graduate.score;
    if (!bestEducation || score < bestEducation.score) bestEducation = { score, total: total.value, bachelors: bachelors.value, graduate: graduate.value };
  }
  if (!bestEducation) throw new Error("ACS education rows do not reconcile: bachelor's + graduate must not exceed population age 25+");

  const familyHouseholds = subsetCandidate(candidates.familyHouseholds, bestHousing.households.estimate);
  return {
    acsPopulation,
    households: bestHousing.households,
    education25Plus: bestEducation.total,
    bachelorsDegree: bestEducation.bachelors,
    graduateDegree: bestEducation.graduate,
    familyHouseholds,
    familiesBelowPoverty: subsetCandidate(candidates.familiesBelowPoverty, familyHouseholds.estimate),
    householdsNoVehicle: subsetCandidate(candidates.householdsNoVehicle, bestHousing.households.estimate),
    occupiedHousingUnits: bestHousing.occupied,
    ownerOccupiedHousing: bestHousing.owner,
    renterOccupiedHousing: bestHousing.renter,
    internetSubscription: subsetCandidate(candidates.internetSubscription, bestHousing.households.estimate),
  };
}

async function fetchOfficialSnaAcsProfiles(population2020: Population2020) {
  const citywideUrl = "https://www.cincinnati-oh.gov/sites/planning/assets/Census/2020/Citywide.pdf";
  const links = [{ name: "Citywide", sourceUrl: citywideUrl }, ...population2020.civicNeighborhoods.map(({ name, sourceUrl }) => ({ name, sourceUrl }))];
  const profiles = await mapWithConcurrency(links, 5, async (link) => {
    const bytes = await fetchBytes(link.sourceUrl);
    const manual = imageProfileOverrides.profiles.find((profile) => profile.name === link.name);
    let measures: Record<string, DemographicEstimate>;
    let extractionMethod: string;
    let pageReferences: Record<string, number> | undefined;
    if (manual) {
      if (manual.sourceUrl !== link.sourceUrl) throw new Error(`${link.name}: manual profile source URL does not match the fetched official PDF`);
      measures = Object.fromEntries(Object.entries(manual.measures).map(([key, value]) => [key, { estimate: value.estimate, marginOfError: value.marginOfError }]));
      extractionMethod = "manual_visual_transcription_double_checked";
      pageReferences = manual.pageReferences;
    } else {
      const lines = await pdfAllLines(bytes, 2);
      try { measures = resolveTextProfileMeasures(lines); } catch (error) {
        throw new Error(`${link.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
      extractionMethod = "pdf_text_row_candidates_reconciled";
    }
    measures.bachelorsOrHigher = { estimate: measures.bachelorsDegree.estimate + measures.graduateDegree.estimate, marginOfError: aggregateMarginOfError([{ weight: 1, marginOfError: measures.bachelorsDegree.marginOfError }, { weight: 1, marginOfError: measures.graduateDegree.marginOfError }]) };
    return { name: link.name, sourceUrl: link.sourceUrl, checksumSha256: sha256(bytes), measures, extractionMethod, pageReferences };
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
      allocationMethod: "The City Planning SNA profiles publish 2016-2020 ACS estimates already aggregated to each neighborhood approximation, including documented partial-tract and block-group components. Combined map regions sum their civic-member estimates. The annual population denominator series is not presented as annual ACS: 2011-2019 is a documented interpolation between Decennial Census anchors and 2021 onward carries the 2020 anchor forward.",
      marginOfErrorMethod: "Published 90% ACS margins of error are retained directly. For combined map regions and composite education measures they are combined by root-sum-of-squares. Derived percentages use the Census proportion approximation (subtraction for a subset numerator, with the ratio formula only when the subtraction would be negative).",
      measures: Object.fromEntries(Object.entries(profileMeasures).map(([key, value]) => [key, { label: value.label, universe: value.universe, kind: "count" as const }])),
      sources: [{ label: "Cincinnati City Planning 2010 SNA profiles", url: planning2010 }, { label: "Cincinnati City Planning 2020 SNA profiles", url: "https://www.cincinnati-oh.gov/planning/resources/census/2020/" }, { label: "Census ACS 5-year program", url: "https://www.census.gov/programs-surveys/acs/data.html" }],
    },
    citywide: { population: populationSeries(population2010.metadata.citywidePopulation, population2020.metadata.citywidePopulation, [], new Date().getFullYear(), "decennial_carry_forward"), latestAcs: { year: latestYear, measures: cityAcs.measures } },
    neighborhoods,
  };
  const subsetPairs = [["bachelorsOrHigher", "education25Plus"], ["familiesBelowPoverty", "familyHouseholds"], ["householdsNoVehicle", "households"], ["ownerOccupiedHousing", "occupiedHousingUnits"], ["renterOccupiedHousing", "occupiedHousingUnits"], ["internetSubscription", "households"]] as const;
  const invalidRatios = neighborhoods.flatMap((row) => row.latestAcs ? subsetPairs.filter(([numerator, denominator]) => row.latestAcs!.measures[numerator].estimate > row.latestAcs!.measures[denominator].estimate).map(([numerator, denominator]) => ({ neighborhood: row.name, numerator, denominator })) : []);
  const housingIdentityFailures = neighborhoods.flatMap((row) => {
    if (!row.latestAcs) return [];
    const measures = row.latestAcs.measures;
    const difference = measures.ownerOccupiedHousing.estimate + measures.renterOccupiedHousing.estimate - measures.occupiedHousingUnits.estimate;
    return difference === 0 ? [] : [{ neighborhood: row.name, difference }];
  });
  const householdIdentityFailures = neighborhoods.flatMap((row) => {
    if (!row.latestAcs) return [];
    const measures = row.latestAcs.measures;
    const difference = measures.households.estimate - measures.occupiedHousingUnits.estimate;
    return difference === 0 ? [] : [{ neighborhood: row.name, difference }];
  });
  const coverageComplete = neighborhoods.length === 50 && neighborhoods.every((row) => row.latestAcs && row.population.length >= 17 && row.population.every((item) => item.estimate > 0));
  const validation = {
    generatedAt, status: coverageComplete && invalidRatios.length === 0 && housingIdentityFailures.length === 0 && householdIdentityFailures.length === 0 ? "pass" : "fail",
    census2010Profiles: population2010.civicNeighborhoods.length, census2020Profiles: population2020.civicNeighborhoods.length, snaRegions: neighborhoods.length, officialAcsProfiles: officialAcsProfiles.length,
    acsYears: [2020], latestAcsYear: latestYear,
    neighborhoodsWithAcs: neighborhoods.filter((row) => row.latestAcs).length, unavailableAcsNeighborhoods: neighborhoods.filter((row) => !row.latestAcs).map((row) => row.name),
    automatedTextProfiles: officialAcsProfiles.filter((row) => row.extractionMethod === "pdf_text_row_candidates_reconciled").length,
    manuallyTranscribedProfiles: officialAcsProfiles.filter((row) => row.extractionMethod === "manual_visual_transcription_double_checked").map((row) => row.name),
    invalidRatios, housingIdentityFailures, householdIdentityFailures, allocationMethod: output.metadata.allocationMethod, marginOfErrorMethod: output.metadata.marginOfErrorMethod,
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
