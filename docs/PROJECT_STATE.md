# Project state

Updated: 2026-08-26

## Application status

- Static Next.js dashboard builds successfully for GitHub Pages.
- Official vector map, signed change/count/rate measures, selection, stable URL state, rankings, comparison, detail, methodology, source, trends, and data-status routes are implemented.
- Current views use all 51 preliminary CPD neighborhood reports through 2026-08-22; reports were updated 2026-08-24.
- STARS offense-level aggregates remain separate and available through 2026-06-23.
- Official 2020 population profiles and violent-crime rates per 1,000 are implemented.
- The historical artifact publishes 15 complete calendar years (2011–2025) and 16 same-date YTD periods (2011–2026), with unresolved neighborhood rows retained explicitly.
- Period/year switchers are implemented on the explorer, rankings, comparisons, and all neighborhood profiles.
- A shared crime-type selector drives the explorer, rankings, comparisons, profiles, and trends; long-running discrete categories begin in 2011 and source-specific categories remain unavailable before 2024.
- The trends page provides area, crime type, period-basis, count/rate, and year-over-year analysis with an annotated 2024 source transition.
- Change maps use a consistent zero-centered green-decrease/red-increase severity lattice and exact signed values.
- Data Status reads coverage dates, counts, validation timestamps, and warnings from generated manifests and reports.
- PDI and STARS adapters exist; the June 2024 transition is explicit.
- SQLite migrations and deterministic seed data are implemented.
- GitHub Pages is the sole supported runtime. Electron packaging was retired after v0.1.2; historical desktop downloads are unsupported.
- The definitive 51-name → 50-polygon crosswalk is generated and geography validation passes.

## Current validated facts

- Geography: 50 source polygons representing 51 expected names.
- STARS source rows reported by metadata: 52,500.
- Dashboard cutoff: 2026-08-22 from the fresher CPD aggregate reports.
- Unmapped STARS categories: 0.
- Published population rates: available using 2020 City Planning profiles; the non-additive citywide reconciliation is disclosed.
- Historical annual panel: 2011–2025 enabled; comparable YTD series extends through the current 2026 aggregate.

## Local commands

`npm run dev`, `npm run build`, `npm test`, `npm run data:validate`, `npm run db:migrate`, `npm run db:seed`.

Database location: `data/cnce.sqlite` by default (ignored by Git).

## Major caveats

The 51 published neighborhood-profile populations sum to 329,782 while the direct Citywide profile is 309,317. Neighborhood rates use each published profile, and the city rate uses the direct Citywide value. Historical rows unresolved after the three-field geography fallback remain unassigned, especially in 2011–2012. Legacy PDI also contains post-transition outliers. All caveats are preserved and visible.
