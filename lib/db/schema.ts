import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(), sourceType: text("source_type").notNull(), organization: text("organization").notNull(),
  title: text("title").notNull(), datasetId: text("dataset_id"), canonicalUrl: text("canonical_url").notNull(),
  retrievedAt: text("retrieved_at"), coverageStart: text("coverage_start"), coverageEnd: text("coverage_end"),
  license: text("license"), description: text("description"), citation: text("citation"), checksum: text("checksum"), notes: text("notes"),
});
export const ingestionRuns = sqliteTable("ingestion_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }), sourceId: text("source_id").notNull().references(() => sources.id),
  startedAt: text("started_at").notNull(), completedAt: text("completed_at"), recordsReceived: integer("records_received").default(0),
  recordsInserted: integer("records_inserted").default(0), recordsUpdated: integer("records_updated").default(0),
  recordsRejected: integer("records_rejected").default(0), status: text("status").notNull(), codeVersion: text("code_version"),
});
export const boundaryVersions = sqliteTable("boundary_versions", {
  id: text("id").primaryKey(), name: text("name").notNull(), effectiveStartYear: integer("effective_start_year"),
  effectiveEndYear: integer("effective_end_year"), sourceId: text("source_id").references(() => sources.id),
  description: text("description"), geometryPath: text("geometry_path"), confidence: text("confidence"), notes: text("notes"),
});
export const neighborhoods = sqliteTable("neighborhoods", {
  id: text("id").primaryKey(), canonicalSlug: text("canonical_slug").notNull(), canonicalName: text("canonical_name").notNull(),
  currentSnaName: text("current_sna_name"), currentSnaNumber: integer("current_sna_number"), active: integer("active", { mode: "boolean" }).default(true),
  notes: text("notes"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("neighborhood_slug_unique").on(table.canonicalSlug)]);
export const neighborhoodAliases = sqliteTable("neighborhood_aliases", {
  id: integer("id").primaryKey({ autoIncrement: true }), neighborhoodId: text("neighborhood_id").notNull().references(() => neighborhoods.id),
  alias: text("alias").notNull(), sourceSystem: text("source_system"), startYear: integer("start_year"), endYear: integer("end_year"),
  confidence: text("confidence").notNull(), notes: text("notes"),
});
export const offenseCategories = sqliteTable("offense_categories", {
  id: text("id").primaryKey(), label: text("label").notNull(), group: text("group_name").notNull(), part1Flag: integer("part1_flag", { mode: "boolean" }).notNull(),
});
export const sourceOffenseMappingRows = sqliteTable("source_offense_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }), sourceSystem: text("source_system").notNull(), sourceCode: text("source_code"),
  sourceLabel: text("source_label").notNull(), canonicalOffenseId: text("canonical_offense_id").references(() => offenseCategories.id),
  validFrom: text("valid_from"), validTo: text("valid_to"), mappingVersion: text("mapping_version").notNull(),
  mappingConfidence: text("mapping_confidence").notNull(), notes: text("notes"),
});
export const crimeEvents = sqliteTable("crime_events", {
  id: text("id").primaryKey(), sourceId: text("source_id").notNull().references(() => sources.id), sourceSystem: text("source_system").notNull(),
  sourceRecordId: text("source_record_id").notNull(), incidentNumber: text("incident_number"), dateReported: text("date_reported"),
  dateFrom: text("date_from"), dateTo: text("date_to"), yearReported: integer("year_reported"), canonicalOffenseId: text("canonical_offense_id").references(() => offenseCategories.id),
  sourceOffenseLabel: text("source_offense_label"), neighborhoodId: text("neighborhood_id").references(() => neighborhoods.id),
  sourceNeighborhoodName: text("source_neighborhood_name"), policeDistrict: text("police_district"), beat: text("beat"),
  latitude: real("latitude"), longitude: real("longitude"), geographyConfidence: text("geography_confidence"),
  sourcePayloadJson: text("source_payload_json"), ingestionRunId: integer("ingestion_run_id").references(() => ingestionRuns.id), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("crime_source_record_unique").on(table.sourceSystem, table.sourceRecordId)]);
export const populationEstimates = sqliteTable("population_estimates", {
  id: integer("id").primaryKey({ autoIncrement: true }), neighborhoodId: text("neighborhood_id").notNull().references(() => neighborhoods.id),
  year: integer("year").notNull(), population: integer("population").notNull(), sourceId: text("source_id").notNull().references(() => sources.id),
  boundaryVersionId: text("boundary_version_id").references(() => boundaryVersions.id), method: text("method").notNull(), confidence: text("confidence").notNull(),
});
export const crimeAnnualNeighborhood = sqliteTable("crime_annual_neighborhood", {
  id: integer("id").primaryKey({ autoIncrement: true }), year: integer("year").notNull(), neighborhoodId: text("neighborhood_id").notNull().references(() => neighborhoods.id),
  boundaryVersionId: text("boundary_version_id").references(() => boundaryVersions.id), offenseCategoryId: text("offense_category_id").notNull().references(() => offenseCategories.id),
  count: integer("count").notNull(), population: integer("population"), ratePer1000: real("rate_per_1000"), sourceQuality: text("source_quality").notNull(),
  sourceId: text("source_id").notNull().references(() => sources.id), isCompleteYear: integer("is_complete_year", { mode: "boolean" }).notNull(),
  coverageStart: text("coverage_start"), coverageEnd: text("coverage_end"), generatedAt: text("generated_at").notNull(),
});
