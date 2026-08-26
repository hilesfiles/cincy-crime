import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalCategoryLabels, sourceOffenseMappings } from "../../config/crime-taxonomy";

async function main() {
  const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data/cnce.sqlite");
  const db = new Database(databasePath);
  const now = new Date().toISOString();
  const map = JSON.parse(await readFile(path.join(process.cwd(), "data/processed/geography/neighborhood-map.json"), "utf8"));
  const insertSource = db.prepare("INSERT OR REPLACE INTO sources (id, source_type, organization, title, dataset_id, canonical_url, license, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertSource.run("CAGIS_SNA_2020", "CAGIS", "City of Cincinnati / CAGIS", "Cincinnati Neighborhood", "Cincinnati_Neighborhood/FeatureServer/0", "https://services8.arcgis.com/WQtGT9bHpwcYeBTA/ArcGIS/rest/services/Cincinnati_Neighborhood/FeatureServer/0", "Verify before redistribution", "Live service returns 50 statistical polygons representing 51 named neighborhoods.");
  insertSource.run("CPD_STARS", "CPD_STARS", "Cincinnati Police Department", "Reported Crime (STARS Category Offenses) on or after 6/3/2024", "7aqy-xrv9", "https://data.cincinnati-oh.gov/resource/7aqy-xrv9.json", "Cincinnati Open Data terms", "Each row is documented as a STARS offense.");
  insertSource.run("CPD_PDI", "CPD_PDI", "Cincinnati Police Department", "PDI (Police Data Initiative) Crime Incidents", "k59e-2pvf", "https://data.cincinnati-oh.gov/resource/k59e-2pvf.json", "Public Domain", "Operational transition is June 2024; outlier reported dates are preserved for review.");
  db.prepare("INSERT OR REPLACE INTO boundary_versions (id, name, effective_start_year, source_id, description, geometry_path, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)").run("SNA_2020", "2020 Statistical Neighborhood Approximations", 2020, "CAGIS_SNA_2020", "Modern analytical geography", "data/processed/geography/cincinnati-sna-2020.geojson", "official");
  const insertNeighborhood = db.prepare("INSERT OR REPLACE INTO neighborhoods (id, canonical_slug, canonical_name, current_sna_name, current_sna_number, active, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)");
  for (const region of map.regions) insertNeighborhood.run(region.id, region.slug, region.name, region.sourceName, region.number, region.members.length > 1 ? `Combined SNA region representing ${region.members.join(" + ")}` : null, now, now);
  const insertOffense = db.prepare("INSERT OR REPLACE INTO offense_categories (id, label, group_name, part1_flag) VALUES (?, ?, ?, ?)");
  for (const [id, label] of Object.entries(canonicalCategoryLabels)) insertOffense.run(id, label, id === "strangulation" || id === "other" ? "other" : ["homicide", "rape", "robbery", "aggravated_assault"].includes(id) ? "violent" : "property", id !== "strangulation" && id !== "other" ? 1 : 0);
  db.exec("DELETE FROM source_offense_mappings WHERE source_system = 'CPD_STARS'");
  const insertMapping = db.prepare("INSERT INTO source_offense_mappings (source_system, source_label, canonical_offense_id, valid_from, mapping_version, mapping_confidence, notes) VALUES ('CPD_STARS', ?, ?, '2024-06-03', '2026-08-26.1', ?, ?)");
  for (const [label, mapping] of Object.entries(sourceOffenseMappings)) insertMapping.run(label, mapping.canonical, label === "Strangulation" ? "provisional" : "verified", "note" in mapping ? mapping.note : null);
  db.close();
  console.log(JSON.stringify({ event: "database_seeded", neighborhoods: map.regions.length, offenseMappings: Object.keys(sourceOffenseMappings).length }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
