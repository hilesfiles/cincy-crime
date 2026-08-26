import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { geoMercator, geoPath } from "d3-geo";
import { canonicalNeighborhoods, displayRegionName, regionMembers, slugify } from "../../lib/geography/names";

type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: GeoJSON.Geometry };
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

async function main() {
const root = process.cwd();
const sourcePath = path.join(root, "data/raw/geography/sna-2020.geojson");
const source = await readFile(sourcePath, "utf8");
const geojson = JSON.parse(source) as FeatureCollection;
const checksum = createHash("sha256").update(source).digest("hex");
const width = 760;
const height = 720;
const projection = geoMercator().fitExtent([[28, 24], [width - 28, height - 24]], geojson as never);
const makePath = geoPath(projection);

const regions = geojson.features.map((feature, index) => {
  const sourceName = String(feature.properties.SNA_NAME ?? "Unknown");
  const members = regionMembers[sourceName] ?? [displayRegionName(sourceName)];
  return {
    id: `CIN-SNA-${String(index + 1).padStart(3, "0")}`,
    slug: slugify(displayRegionName(sourceName)),
    name: displayRegionName(sourceName),
    sourceName,
    number: Number(feature.properties.SNA_NUMBER ?? index + 1),
    members,
    path: makePath(feature as never) ?? "",
  };
}).sort((a, b) => a.name.localeCompare(b.name));

const coveredNeighborhoods = new Set(regions.flatMap((region) => region.members));
const missing = canonicalNeighborhoods.filter((name) => !coveredNeighborhoods.has(name));
const extra = [...coveredNeighborhoods].filter((name) => !canonicalNeighborhoods.includes(name as (typeof canonicalNeighborhoods)[number]));
const validation = {
  status: regions.length === 52 && missing.length === 0 ? "pass" : "warning",
  expectedFeatureCount: 52,
  actualFeatureCount: regions.length,
  expectedNamedNeighborhoodCount: canonicalNeighborhoods.length,
  representedNamedNeighborhoodCount: coveredNeighborhoods.size,
  missing,
  extra,
  note: "The live CAGIS 2020 SNA service currently returns 50 statistical polygons. Three polygons are explicitly combined statistical areas; the supplied expected list contains 51 names, not 52. The application preserves the source geometry and surfaces this discrepancy rather than inventing boundaries.",
};

const processed = {
  ...geojson,
  features: geojson.features.map((feature, index) => ({
    ...feature,
    properties: {
      ...feature.properties,
      app_id: `CIN-SNA-${String(index + 1).padStart(3, "0")}`,
      canonical_slug: slugify(displayRegionName(String(feature.properties.SNA_NAME))),
      display_name: displayRegionName(String(feature.properties.SNA_NAME)),
    },
  })),
};
const mapData = { viewBox: `0 0 ${width} ${height}`, sourceFeatureCount: regions.length, regions };
const paths = regions.map((region) => `<path id="neighborhood-${region.slug}" data-neighborhood-id="${region.id}" data-sna-name="${region.name}" data-sna-number="${region.number}" tabindex="0" d="${region.path}"><title>${region.name}</title></path>`).join("\n  ");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="map-title map-desc" viewBox="${mapData.viewBox}">\n  <title id="map-title">Cincinnati statistical neighborhood approximations</title>\n  <desc id="map-desc">Interactive-ready vector paths generated from the official CAGIS source.</desc>\n  ${paths}\n</svg>\n`;

await Promise.all([
  mkdir(path.join(root, "data/processed/geography"), { recursive: true }),
  mkdir(path.join(root, "data/manifests"), { recursive: true }),
  mkdir(path.join(root, "data/reports"), { recursive: true }),
  mkdir(path.join(root, "public/maps"), { recursive: true }),
  mkdir(path.join(root, "public/data"), { recursive: true }),
]);

const manifest = {
  id: "CAGIS_SNA_2020", title: "Cincinnati Neighborhood", organization: "City of Cincinnati / CAGIS",
  serviceIdentifier: "Cincinnati_Neighborhood/FeatureServer/0",
  sourceUrl: "https://services8.arcgis.com/WQtGT9bHpwcYeBTA/ArcGIS/rest/services/Cincinnati_Neighborhood/FeatureServer/0",
  retrievedAt: new Date().toISOString(), geometryVersion: "SNA_2020", coordinateSystem: "EPSG:4326",
  sourceChecksumSha256: checksum, featureCount: regions.length,
};

await Promise.all([
  writeFile(path.join(root, "data/processed/geography/cincinnati-sna-2020.geojson"), `${JSON.stringify(processed)}\n`),
  writeFile(path.join(root, "data/processed/geography/neighborhood-map.json"), `${JSON.stringify(mapData)}\n`),
  writeFile(path.join(root, "public/data/neighborhood-map.json"), `${JSON.stringify(mapData)}\n`),
  writeFile(path.join(root, "public/maps/cincinnati-neighborhoods.svg"), svg),
  writeFile(path.join(root, "data/manifests/geography.json"), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(path.join(root, "data/reports/geography-validation.json"), `${JSON.stringify(validation, null, 2)}\n`),
]);

console.log(JSON.stringify({ event: "geography_processed", regions: regions.length, representedNeighborhoods: coveredNeighborhoods.size, validation: validation.status }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
