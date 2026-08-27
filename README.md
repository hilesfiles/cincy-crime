# Cincinnati Neighborhood Crime Explorer

A local-first, provenance-aware web application for exploring reported crime across Cincinnati statistical neighborhoods. The public site is a static Next.js export backed by audited JSON artifacts; local refresh jobs retain SQLite as the canonical analytical-store path.

> This is an independent analytical project, not an official Cincinnati Police Department publication.

## What works

- Interactive, keyboard-accessible vector map generated from the official CAGIS SNA source.
- Fresher preliminary CPD neighborhood-report aggregates through 2026-08-22, with current/prior comparable YTD and adjacent 28-day periods.
- STARS preserved as a separate offense-level layer through its own source cutoff.
- Official 2010/2020 City Planning population anchors, a documented annual denominator series, and crime rates per 1,000.
- Neighborhood demographics with official 2016–2020 ACS 5-year estimates and published 90% margins of error.
- Calendar-year history for 2011–2025, plus same-date YTD comparisons through 2026.
- Shared period/year controls across the map, rankings, comparisons, and neighborhood profiles.
- Shared crime-type controls for Part I totals, violent/property groupings, and discrete offenses across every analysis route.
- Interactive citywide and neighborhood trend analysis with counts, annual-denominator rates, year-over-year change, and a marked 2024 source transition.
- Zero-centered directional choropleth for every map measure: green decreases, red increases, gray near-zero values, hatched unavailable values, exact signed tooltips, and a graduated severity legend.
- Metric switching, stable URL state, sortable rankings, up-to-four-area comparison, and 50 statically generated detail pages.
- Explicit PDI/STARS source adapters and June 2024 transition validation.
- Versioned offense mapping, unmapped-category report, provenance register, data-status page, SQLite schema, and automated tests.
- GitHub Pages deployment from `.github/workflows/deploy-pages.yml`.

No crime values are fabricated. Modeled population values are limited to the explicitly labeled 2011–2019 linear interpolation and post-2020 carry-forward.

## Important geography result

The official live CAGIS 2020 service returned **50 statistical polygons representing 51 named neighborhoods**. The definitive crosswalk records the three combined features: English Woods + North Fairmount, Lower Price Hill + Queensgate, and Riverside + Sedamsville. Counts and populations are summed from separately retained civic-neighborhood source records for those map areas; no polygons are invented.

## Architecture

```text
Official CAGIS / Socrata sources
        ↓ immutable snapshots + manifests
Normalization / mapping / validation scripts
        ↓
SQLite-ready canonical schema + processed JSON aggregates
        ↓
Static Next.js application / GitHub Pages
```

GitHub Pages cannot run a Node server or query SQLite per request. Refresh and aggregation therefore happen before deployment, and the browser receives only compact JSON required for the current views.

## Setup

Requirements: Node.js 24+ and npm.

```bash
npm ci
npm run data:process:geography
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Data acquisition and refresh

Public Cincinnati datasets require no secret. An optional Socrata app token is reserved in `.env.example`.

```bash
npm run data:fetch:geography
npm run data:process:geography
npm run data:refresh
npm run data:validate
```

`data:refresh` fetches aggregate—not address-level—STARS data, current CPD neighborhood reports, official 2010/2020 population and ACS profiles, PDI/STARS annual history, same-date YTD history, and transition checks. Raw aggregate responses are cached under `data/raw`; processed browser-ready JSON is written under `data/processed` and `public/data`.

## Database

```bash
npm run db:migrate
npm run db:seed
```

Default location: `data/cnce.sqlite` (ignored by Git). Set `DATABASE_PATH` to override it. Application components never query raw source tables directly.

## Testing and validation

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm run data:validate
```

The validation command treats source-integrity failures as fatal. The documented PDI transition and non-additive population-profile reconciliation remain visible warnings.

## Data methodology

- STARS rows are offenses, not necessarily unique incidents, victims, calls for service, arrests, or adjudicated outcomes.
- Current YTD and prior YTD use the same month/day cutoff.
- Current 28 days is `D−27…D`; previous 28 days is `D−55…D−28`.
- Zero denominators display “new activity,” never infinity.
- Part I violent is derived from STARS `type = Part 1 Violent`. Strangulation remains separately preserved pending official cross-system comparability review.
- PDI and STARS are separate source systems and are never naively concatenated.
- Current dashboard views use preliminary CPD neighborhood-report aggregates; STARS remains the separately labeled offense-level source.
- Historical rates use the selected year’s denominator: official 2010/2020 Census anchors, linear interpolation for 2011–2019, and a clearly labeled 2020 carry-forward afterward. Citywide rates use direct Citywide anchors.
- ACS demographic cards retain published 90% MOEs. Derived percentage and combined-region MOEs are visibly labeled approximate.

See [docs/DATA_METHODOLOGY.md](docs/DATA_METHODOLOGY.md) and [docs/SOURCE_REGISTER.md](docs/SOURCE_REGISTER.md).

## 2024 records-system caveat

STARS begins on June 3, 2024. The legacy PDI dataset contains a small number of later `date_reported` values, including outliers through 2026, even though the operational transition occurred in June 2024. The transition report preserves these records and warns rather than treating the absolute PDI maximum as a clean cutoff.

## Deployment

Push `main` to `https://github.com/hilesfiles/cincy-crime`. GitHub Actions tests, builds with the `/cincy-crime` base path, uploads `out/`, enables Pages, and deploys the site to `https://hilesfiles.github.io/cincy-crime/`.

## Supported runtime

The browser application deployed through GitHub Pages is the sole supported runtime. Electron packaging was retired after v0.1.2 to keep development, testing, and releases focused on the web experience. Earlier Windows downloads remain archived as historical, unsupported artifacts.

## Historical roadmap

The supported historical product window is **2011–present**. Complete calendar years 2011–2025 are enabled, and the trends view also compares January 1–August 22 across 2011–2026. Long-running discrete categories begin in 2011; motor-vehicle theft and Strangulation are separately selectable only from the 2024 source transition onward. Earlier unsupported values remain unavailable, not zero. The 2024 PDI/STARS transition is visibly marked. Historical observations use current 2020 SNA geography as a proxy; unresolved source rows remain citywide and unassigned rather than being fabricated or treated as zero. Years before 2011 are out of scope.

## Licensing and attribution

- PDI metadata identifies the source as Public Domain.
- Other City/CAGIS and STARS redistribution terms must be rechecked against current source metadata before downstream redistribution.
- Application source is licensed under Apache License 2.0; see `LICENSE`.
