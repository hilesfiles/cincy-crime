# Cincinnati Neighborhood Crime Explorer

[View the live site](https://hilesfiles.github.io/cincy-crime/)

A provenance-aware static web application for exploring reported crime, demographics, elections, and public-safety finances across Cincinnati statistical neighborhoods.

> This is an independent analytical project, not an official publication of the City of Cincinnati, Cincinnati Police Department, or Hamilton County Board of Elections.

## Current product

The supported product is the browser application deployed through GitHub Pages. It is a static Next.js export: source retrieval, normalization, geographic allocation, and validation happen before deployment, and the browser loads checked-in JSON artifacts. There is no production server, runtime database, or Electron client.

Current checked-in coverage:

- Preliminary CPD neighborhood-report aggregates through **August 29, 2026**.
- **57,446** STARS offense rows in the source feed through **September 1, 2026**; the application retains grouped statistics rather than address-level records.
- Complete calendar-year crime history for **2011–2025** and January 1–August 29 YTD comparisons for **2011–2026**.
- **50** map regions representing **51** civic-neighborhood names.
- Official 2010 and 2020 population anchors plus complete 2016–2020 ACS profiles for all 50 map regions.
- Seven official election contest results across **2016, 2018, 2020, 2022, and 2024**.
- Police budget authority for FY2004–FY2027, with FY2005 unavailable in the published ledger.
- Audited General Fund Police actuals for FY2014–FY2025.
- A separate 66-record public-safety initiative ledger covering four published programs.

Dates and counts above describe the committed artifacts. The in-app **Data status** page is the authoritative build-specific inventory.

## Application sections

| Route | Purpose |
| --- | --- |
| `/` | Interactive crime map with current YTD and calendar-year controls |
| `/rankings` | Sortable neighborhood rankings |
| `/compare` | Comparison of up to four areas |
| `/trends` | Citywide and neighborhood annual and same-date YTD trends |
| `/neighborhood/[slug]` | 50 statically generated neighborhood profiles |
| `/demographics` | Annual population denominator series and ACS estimate/MOE cards |
| `/elections` | Modeled neighborhood turnout and candidate-party vote shares |
| `/budget` | Police budget authority and crime-share neighborhood attribution |
| `/actuals` | Audited citywide Police actuals and modeled neighborhood attribution |
| `/initiatives` | Curated, non-additive public-safety program and award ledger |
| `/methodology` | Definitions and interpretation rules |
| `/data-status` | Artifact coverage, validation results, and active warnings |
| `/sources` | Official sources and provenance |

The root metadata includes a social preview image, Open Graph tags, and a Twitter/X large-image card.

## Crime explorer

- Keyboard-accessible vector map built from the official CAGIS 2020 SNA source.
- Current YTD, prior comparable YTD, adjacent 28-day periods, and complete calendar years.
- Site-wide crime selection for Part I totals, violent/property groupings, and supported discrete offenses.
- Counts, population rates, signed period changes, stable URL state, rankings, comparisons, and trends.
- Directional map colors across count, rate, and percentage-change measures: green for decreases, red for increases, gray only for exact zero, and hatching for unavailable values.
- Graduated signed legends from ±2.5% through ±50%+, exact tooltips, and visible 2024 source-transition markers.
- Current CPD reports and offense-level STARS are preserved as separate, labeled layers.

STARS rows are offenses, not necessarily unique incidents, victims, calls for service, arrests, or adjudicated outcomes. The public STARS source contains anonymized block-level addresses and displaced coordinates, but the current pipeline deliberately queries grouped daily/neighborhood/category statistics and does not publish individual locations.

## Geography

The live CAGIS source contains **50 statistical polygons for 51 civic-neighborhood names**. The definitive crosswalk records three combined map features:

- English Woods + North Fairmount
- Lower Price Hill + Queensgate
- Riverside + Sedamsville

Source records remain separate and traceable. Counts, population, demographics, and other neighborhood values are combined only when displayed on one of these map polygons; no replacement polygons are invented.

Historical crime is displayed on current 2020 SNA geography as an explicit proxy. Source rows that cannot be assigned remain in a citywide unassigned bucket rather than being distributed or treated as zero.

## Demographics and population

- Population anchors come from official City Planning 2010 and 2020 neighborhood profiles.
- Values for 2011–2019 are a documented linear interpolation between those Decennial Census anchors.
- Values after 2020 carry the 2020 anchor forward until a defensible newer neighborhood estimate is available.
- The annual line is therefore **not** presented as annual ACS data.
- Neighborhood cards use official City Planning 2016–2020 ACS 5-year estimates and published 90% margins of error.
- Westwood and Sedamsville’s image-only tables are separately transcribed with page-level provenance; the other 50 source profiles are text-extracted.
- Wrapped PDF rows are reconciled using housing accounting identities and subset checks. The current demographic validation has no coverage, housing-identity, household-identity, or invalid-ratio failures.
- Percentage MOEs use the Census subset-proportion approximation; combined regions and composite counts combine MOEs by root-sum-of-squares.

Published neighborhood profile populations do not add exactly to the direct Citywide profile. Neighborhood rates use each neighborhood’s published denominator, while citywide rates use the direct Citywide value.

## Elections

The elections page contains official Hamilton County precinct canvass totals for:

- President: 2016, 2020, and 2024
- Governor and U.S. Senate: 2018 and 2022

All source precinct IDs and ballots in the current panel match the current 190-precinct CAGIS reference. Neighborhood figures are nevertheless **modeled estimates**, not official neighborhood election results: current precinct polygons are intersected with 2020 SNA polygons and split precincts are allocated by area. Historical year-specific machine-readable precinct boundaries are not available in the official results archive, so the current precinct reference is used for every election year and precinct lines are not displayed publicly.

Democratic and Republican percentages describe candidate or ticket vote shares, not voter registration or identity. “Other” includes minor-party, nonparty, and write-in candidates.

## Financial views

The financial section intentionally keeps three concepts separate:

1. **Budget authority** aggregates published Cincinnati Financial System `CURRENT_BUDGET` Police department and bureau rows. FY2013 is a six-month transition stub. Neighborhood values for FY2014–FY2025 are modeled by applying one citywide budget-per-reported-crime amount to each neighborhood’s selected crime count; they are not observed spending, staffing, service delivery, or district allocations.
2. **Audited actuals** use Cincinnati ACFR General Fund Division of Police expenditures on the published GAAP basis for FY2014–FY2025. The comparable headline excludes Emergency Communications when separately reported. City totals are audited; neighborhood shares are crime-share attributions, not audited neighborhood expenditures.
3. **Initiative ledger** retains only officially published violence-prevention or neighborhood-safety amounts described as awarded, invested, or deployed. Geography is assigned only when the source names a neighborhood, and most dollars remain unallocated because the sources do not publish a defensible neighborhood split. This ledger is separate and must not be added to Police actuals.

## Architecture

```text
Official City / County / CAGIS / Socrata sources
                    ↓
Retrieval, normalization, crosswalk, and validation scripts
                    ↓
Versioned raw snapshots, manifests, reports, and processed JSON
                    ↓
Static Next.js export
                    ↓
GitHub Pages
```

SQLite schema and seed tooling remain available for local analytical work, but the deployed application does not query SQLite. Application components consume processed artifacts rather than raw source tables.

## Local setup

Requirements: Node.js 24+ and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The repository includes the processed artifacts required to run the application without refreshing external sources.

Optional local SQLite setup:

```bash
npm run db:migrate
npm run db:seed
```

The default database path is `data/cnce.sqlite` and is ignored by Git. Set `DATABASE_PATH` to override it.

## Data refresh

Public Cincinnati datasets require no secret. `SOCRATA_APP_TOKEN` in `.env.example` is optional.

```bash
npm run data:fetch:geography
npm run data:process:geography
npm run data:refresh
npm run data:validate
```

`data:refresh` currently rebuilds PDI and grouped STARS crime artifacts, population, demographics, current CPD reports, historical panels, elections, Police budget authority, and source-transition checks. Raw responses are stored under `data/raw`; browser-ready artifacts are written under `data/processed` and `public/data`; validation output is written under `data/reports`.

The curated ACFR actuals and initiative ledger are committed artifacts and are not presently rebuilt by `data:refresh`.

Available focused commands are listed in `package.json`, including `data:fetch:stars`, `data:fetch:demographics`, `data:build:historical`, `data:build:elections`, and `data:fetch:budget`.

## Testing

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm run data:validate
```

- Vitest covers analytics, color classification, data contracts, and artifact reconciliation.
- Playwright exercises all major application routes and interactive controls.
- The production build performs the Next.js and TypeScript checks and generates 65 static pages.
- Validation treats integrity failures as fatal while preserving documented source warnings.

The GitHub Pages workflow runs `npm ci`, unit tests, and a production export with the `/cincy-crime` base path before deploying `out/`.

## Crime methodology

- Current and prior YTD periods use the same month/day cutoff.
- Current 28 days is `D−27…D`; previous 28 days is `D−55…D−28`.
- A zero prior denominator displays “new activity,” never infinity.
- Part I violent comes from STARS `type = Part 1 Violent`.
- PDI and STARS remain distinct source systems and are not naively concatenated.
- The operational records-system transition is June 3, 2024. Later PDI `date_reported` outliers are preserved and warned about rather than used as a clean operational cutoff.
- Motor-vehicle theft and Strangulation are separately selectable only from the STARS transition onward; unsupported earlier values are unavailable, not zero.
- Years before 2011 are outside the supported historical product window.

See [Data methodology](docs/DATA_METHODOLOGY.md), [Source register](docs/SOURCE_REGISTER.md), and [Architecture](docs/ARCHITECTURE.md).

## Deployment

Pushes to `main` trigger `.github/workflows/deploy-pages.yml`. GitHub Actions tests, builds the static export with the repository base path, uploads `out/`, and deploys:

<https://hilesfiles.github.io/cincy-crime/>

The retired Electron/Windows distribution remains historical and unsupported.

## Licensing and attribution

- PDI metadata identifies that dataset as Public Domain.
- Other City, County, CAGIS, and STARS redistribution terms should be checked against their current source metadata before downstream redistribution.
- Application source is licensed under the Apache License 2.0; see [LICENSE](LICENSE).
