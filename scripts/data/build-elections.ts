import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import area from "@turf/area";
import intersect from "@turf/intersect";
import { featureCollection } from "@turf/helpers";
import { percentage, type ElectionAreaResult, type ElectionsData, type ElectionYear } from "../../lib/elections";

type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: GeoJSON.Geometry };
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };
type MapRegion = { id: string; slug: string; name: string; sourceName: string; path: string };
type MapData = { viewBox: string; regions: MapRegion[] };
type ResultRow = { id: string; name: string; registeredVoters: number; ballotsCast: number; democraticVotes: number; republicanVotes: number; otherVotes: number };
type ElectionConfig = { year: number; date: string; file: string; sheet: string; headerRow: number; firstCandidateColumn: number; lastCandidateColumn: number; democraticColumn: number; republicanColumn: number; democraticTicket: string; republicanTicket: string; sourceUrl: string };

const officialResults = "https://votehamiltoncountyohio.gov/results/";
const precinctGeometrySource = "https://cagisonline.hamilton-co.org/arcgis/rest/services/Countywide_Layers/IdentifyLayers/MapServer/17";
const configs: ElectionConfig[] = [
  { year: 2016, date: "2016-11-08", file: "Gen16OffCanvass.xlsx", sheet: "Sheet1", headerRow: 3, firstCandidateColumn: 6, lastCandidateColumn: 28, democraticColumn: 6, republicanColumn: 10, democraticTicket: "Clinton and Kaine", republicanTicket: "Trump and Pence", sourceUrl: "https://votehamiltoncountyohio.gov/wp-content/uploads/2020/02/Gen16OffCanvass.xlsx" },
  { year: 2020, date: "2020-11-03", file: "G20_Official_Canvass.xlsx", sheet: "Candidates", headerRow: 2, firstCandidateColumn: 6, lastCandidateColumn: 15, democraticColumn: 6, republicanColumn: 9, democraticTicket: "Biden and Harris", republicanTicket: "Trump and Pence", sourceUrl: "https://votehamiltoncountyohio.gov/wp-content/uploads/2021/04/G20_Official_Canvass.xlsx" },
  { year: 2024, date: "2024-11-05", file: "G24OfficialCanvass.xlsx", sheet: "G24 Contests Only", headerRow: 2, firstCandidateColumn: 6, lastCandidateColumn: 19, democraticColumn: 13, republicanColumn: 18, democraticTicket: "Harris and Walz", republicanTicket: "Trump and Vance", sourceUrl: "https://votehamiltoncountyohio.gov/wp-content/uploads/2025/04/G24OfficialCanvass.xlsx" },
];

function numeric(value: ExcelJS.CellValue) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replaceAll(",", "")) || 0;
  if (value && typeof value === "object" && "result" in value && typeof value.result === "number") return value.result;
  return 0;
}

function text(value: ExcelJS.CellValue) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  return "";
}

function checksum(bytes: Buffer) { return createHash("sha256").update(bytes).digest("hex"); }
function round(value: number, digits = 2) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }

async function readElection(root: string, config: ElectionConfig) {
  const sourcePath = path.join(root, "data/raw/elections", config.file);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);
  const worksheet = workbook.getWorksheet(config.sheet);
  if (!worksheet) throw new Error(`${config.file}: worksheet ${config.sheet} missing`);
  const rows: ResultRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= config.headerRow) return;
    const rawId = row.getCell(1).value;
    const idValue = typeof rawId === "number" ? rawId : typeof rawId === "string" && /^\d+$/.test(rawId.trim()) ? Number(rawId) : null;
    const precinctName = text(row.getCell(2).value);
    if (idValue === null || !Number.isInteger(idValue) || !/\bCIN\b/i.test(precinctName)) return;
    const democraticVotes = numeric(row.getCell(config.democraticColumn).value);
    const republicanVotes = numeric(row.getCell(config.republicanColumn).value);
    let presidentialVotes = 0;
    for (let column = config.firstCandidateColumn; column <= config.lastCandidateColumn; column++) presidentialVotes += numeric(row.getCell(column).value);
    rows.push({ id: String(idValue).padStart(4, "0"), name: precinctName, registeredVoters: numeric(row.getCell(3).value), ballotsCast: numeric(row.getCell(4).value), democraticVotes, republicanVotes, otherVotes: Math.max(0, presidentialVotes - democraticVotes - republicanVotes) });
  });
  if (rows.length < 175) throw new Error(`${config.file}: only ${rows.length} Cincinnati precinct rows parsed`);
  return { rows, checksumSha256: checksum(await readFile(sourcePath)) };
}

function areaResult(identity: Pick<ElectionAreaResult, "id" | "slug" | "name" | "estimateStatus">, values: Pick<ElectionAreaResult, "registeredVoters" | "ballotsCast" | "democraticVotes" | "republicanVotes" | "otherVotes" | "directAssignmentPercent" | "matchedPrecinctCount" | "splitPrecinctCount">): ElectionAreaResult {
  const presidentialVotes = values.democraticVotes + values.republicanVotes + values.otherVotes;
  const democraticPercent = percentage(values.democraticVotes, presidentialVotes);
  const republicanPercent = percentage(values.republicanVotes, presidentialVotes);
  return { ...identity, ...values, presidentialVotes: round(presidentialVotes), registeredVoters: round(values.registeredVoters), ballotsCast: round(values.ballotsCast), democraticVotes: round(values.democraticVotes), republicanVotes: round(values.republicanVotes), otherVotes: round(values.otherVotes), turnoutPercent: percentage(values.ballotsCast, values.registeredVoters), democraticPercent, republicanPercent, otherPercent: percentage(values.otherVotes, presidentialVotes), marginPoints: democraticPercent === null || republicanPercent === null ? null : democraticPercent - republicanPercent };
}

export async function buildElections() {
  const root = process.cwd();
  const [mapData, neighborhoodGeo, precinctGeo] = await Promise.all([
    readFile(path.join(root, "data/processed/geography/neighborhood-map.json"), "utf8").then(JSON.parse) as Promise<MapData>,
    readFile(path.join(root, "data/processed/geography/cincinnati-sna-2020.geojson"), "utf8").then(JSON.parse) as Promise<FeatureCollection>,
    readFile(path.join(root, "data/raw/elections/precincts-current.geojson"), "utf8").then(JSON.parse) as Promise<FeatureCollection>,
  ]);
  const regionById = new Map(mapData.regions.map((region) => [region.id, region]));
  const cityPrecincts = precinctGeo.features.filter((feature) => String(feature.properties.PRC_NAME ?? "").startsWith("CINCINNATI "));
  const assignments = new Map<string, Array<{ neighborhoodId: string; neighborhoodName: string; share: number }>>();
  for (const precinct of cityPrecincts) {
    const id = String(precinct.properties.PCT ?? precinct.properties.PRECINCT ?? "").padStart(4, "0");
    const precinctArea = area(precinct as never);
    const parts: Array<{ neighborhoodId: string; neighborhoodName: string; share: number }> = [];
    for (const neighborhood of neighborhoodGeo.features) {
      const overlap = intersect(featureCollection([precinct as never, neighborhood as never]));
      if (!overlap) continue;
      const share = area(overlap) / precinctArea;
      if (share < 0.0001) continue;
      const neighborhoodId = String(neighborhood.properties.app_id);
      parts.push({ neighborhoodId, neighborhoodName: regionById.get(neighborhoodId)?.name ?? String(neighborhood.properties.display_name), share });
    }
    const total = parts.reduce((sum, part) => sum + part.share, 0);
    if (total > 0) assignments.set(id, parts.map((part) => ({ ...part, share: part.share / total })).sort((a, b) => b.share - a.share));
  }

  const splitPrecinctReferenceCount = [...assignments.values()].filter((parts) => parts.length > 1 && (parts[1]?.share ?? 0) >= 0.02).length;

  const sourceReports: Array<Record<string, unknown>> = [];
  const elections: ElectionYear[] = [];
  for (const config of configs) {
    const source = await readElection(root, config);
    const resultById = new Map(source.rows.map((row) => [row.id, row]));
    const matchedRows = source.rows.filter((row) => assignments.has(row.id));
    const totals = source.rows.reduce((sum, row) => ({ registeredVoters: sum.registeredVoters + row.registeredVoters, ballotsCast: sum.ballotsCast + row.ballotsCast, democraticVotes: sum.democraticVotes + row.democraticVotes, republicanVotes: sum.republicanVotes + row.republicanVotes, otherVotes: sum.otherVotes + row.otherVotes }), { registeredVoters: 0, ballotsCast: 0, democraticVotes: 0, republicanVotes: 0, otherVotes: 0 });
    const neighborhoods = mapData.regions.map((region) => {
      const values = { registeredVoters: 0, ballotsCast: 0, democraticVotes: 0, republicanVotes: 0, otherVotes: 0, directBallots: 0, matchedPrecincts: new Set<string>(), splitPrecincts: new Set<string>() };
      for (const [precinctId, parts] of assignments) {
        const result = resultById.get(precinctId);
        const part = parts.find((candidate) => candidate.neighborhoodId === region.id);
        if (!result || !part) continue;
        values.registeredVoters += result.registeredVoters * part.share;
        values.ballotsCast += result.ballotsCast * part.share;
        values.democraticVotes += result.democraticVotes * part.share;
        values.republicanVotes += result.republicanVotes * part.share;
        values.otherVotes += result.otherVotes * part.share;
        values.matchedPrecincts.add(precinctId);
        if ((parts[0]?.share ?? 0) >= 0.98 && parts[0]?.neighborhoodId === region.id) values.directBallots += result.ballotsCast * part.share;
        else values.splitPrecincts.add(precinctId);
      }
      return areaResult({ id: region.id, slug: region.slug, name: region.name, estimateStatus: "area_weighted_current_precinct_reference" }, { ...values, directAssignmentPercent: percentage(values.directBallots, values.ballotsCast), matchedPrecinctCount: values.matchedPrecincts.size, splitPrecinctCount: values.splitPrecincts.size });
    });
    const citywide = areaResult({ id: "citywide", slug: "citywide", name: "Citywide", estimateStatus: "official_citywide" }, { ...totals, directAssignmentPercent: 100, matchedPrecinctCount: source.rows.length, splitPrecinctCount: 0 });
    const matchedBallots = matchedRows.reduce((sum, row) => sum + row.ballotsCast, 0);
    elections.push({ year: config.year, date: config.date, contest: "President and Vice President", democraticTicket: config.democraticTicket, republicanTicket: config.republicanTicket, citywide, neighborhoods, coverage: { resultPrecincts: source.rows.length, matchedReferencePrecincts: matchedRows.length, unmatchedResultPrecincts: source.rows.length - matchedRows.length, matchedBallotsPercent: percentage(matchedBallots, totals.ballotsCast) ?? 0 } });
    sourceReports.push({ year: config.year, sourceUrl: config.sourceUrl, localFile: config.file, worksheet: config.sheet, checksumSha256: source.checksumSha256, resultPrecincts: source.rows.length, matchedReferencePrecincts: matchedRows.length });
  }

  const output: ElectionsData = {
    metadata: {
      schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), electionYears: configs.map((config) => config.year), resultSource: "Hamilton County Board of Elections official canvass workbooks", precinctGeometrySource, precinctGeometryRetrievedAt: "2026-08-26", geographyVersion: "SNA_2020",
      allocationMethod: "Official Cincinnati precinct totals are allocated to intersecting SNA 2020 polygons in proportion to polygon area. The current CAGIS precinct reference is used for identifier matching in every year because the results archive does not publish contemporaneous machine-readable precinct polygons. These are modeled neighborhood estimates, not official neighborhood results.",
      voteShareDenominator: "Votes cast for all presidential tickets in the selected election; ballot undervotes are excluded.", turnoutDefinition: "Total ballots cast divided by registered voters in the official precinct canvass.", partisanLabelNote: "Democratic and Republican percentages are candidate-ticket vote shares, not voter party registration or identification. Other includes minor-party, nonparty, and write-in presidential tickets.", presentationNote: "The public map displays modeled neighborhood totals only. Precinct geometry is used during processing for area-weighted allocation and is not rendered as an overlay.",
      sources: [{ label: "Hamilton County Board of Elections results archive", url: officialResults }, { label: "CAGIS Hamilton County voter precincts", url: precinctGeometrySource }],
    }, elections,
  };
  const validation = { status: elections.every((election) => election.coverage.matchedBallotsPercent >= 90) ? "pass" : "warning", generatedAt: output.metadata.generatedAt, electionYears: elections.map((election) => ({ year: election.year, ...election.coverage, citywidePresidentialVotes: election.citywide.presidentialVotes, neighborhoodAllocatedPresidentialVotes: round(election.neighborhoods.reduce((sum, row) => sum + row.presidentialVotes, 0)), voteShareSum: round((election.citywide.democraticPercent ?? 0) + (election.citywide.republicanPercent ?? 0) + (election.citywide.otherPercent ?? 0), 4) })), precinctReferenceCount: cityPrecincts.length, splitPrecinctReferenceCount, sourceReports, warnings: ["Neighborhood results use an area-weighted current-precinct reconstruction for all years.", "Historical year-specific machine-readable precinct boundaries remain unavailable in the official results archive; precinct lines are not rendered in the public map."] };
  await Promise.all([mkdir(path.join(root, "data/processed/elections"), { recursive: true }), mkdir(path.join(root, "public/data"), { recursive: true }), writeFile(path.join(root, "data/processed/elections/presidential-neighborhoods.json"), `${JSON.stringify(output)}\n`), writeFile(path.join(root, "public/data/presidential-neighborhoods.json"), `${JSON.stringify(output)}\n`), writeFile(path.join(root, "data/reports/elections-validation.json"), `${JSON.stringify(validation, null, 2)}\n`)]);
  console.log(JSON.stringify({ event: "elections_built", years: output.metadata.electionYears, precinctReferenceCount: cityPrecincts.length, status: validation.status, coverage: validation.electionYears }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildElections().catch((error) => { console.error(error); process.exitCode = 1; });
