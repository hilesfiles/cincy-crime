# Architecture

## Deployment boundary

The public application is a static Next.js export for GitHub Pages. JSON and GeoJSON are the runtime data contract. ETL, normalization, validation, and SQLite run locally or in an explicitly scheduled refresh workflow—not during a visitor request.

The optional Windows distribution wraps the identical export in Electron. Its local HTTP server binds only to `127.0.0.1` on an ephemeral port; renderer Node integration is disabled, context isolation and sandboxing are enabled, and external navigation is handed to the operating-system browser.

## Layers

1. **Source data** — immutable CAGIS/Socrata snapshots under `data/raw`.
2. **Normalization** — source-specific adapters in `scripts/data` and geography processing in `scripts/geography`.
3. **Canonical analytics** — Drizzle schema in `lib/db/schema.ts`, SQL migration, versioned mappings, and processed JSON aggregates.
4. **Application** — components consume only processed JSON and typed query objects.

Repository/service boundaries allow a later PostgreSQL store without moving raw SQL into components.

## Identity and geography

Stable area IDs (`CIN-SNA-###`) and slugs are generated deterministically from the authoritative snapshot. Display names are not database keys. `boundary_versions` includes `SNA_2020`; future imports will add `SNA_2010`, `HISTORICAL_CPD`, and `UNKNOWN`.

The source currently exposes combined statistical areas. These remain single source polygons with auditable member names.

## Static query layer

Processed `current-summary.json` supplies city summaries, neighborhood summaries, exact comparison windows, and mapping metadata. It functions as the static equivalent of `getCitySummary`, `getNeighborhoodSummary`, `getNeighborhoodRanking`, `getMapMetrics`, and `getSourceStatus`.

## Security and privacy

The published app uses neighborhood aggregates only. It does not publish addresses, try to reverse jitter, de-anonymize people, or send raw incidents to the browser.
