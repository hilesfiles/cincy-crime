# Project state

Updated: 2026-08-26

## Application status

- Static Next.js dashboard builds successfully for GitHub Pages.
- Official vector map, five map metrics, selection, stable URL state, rankings, comparison, detail, methodology, source, trends, and data-status routes are implemented.
- Current views use all 51 preliminary CPD neighborhood reports through 2026-08-22; reports were updated 2026-08-24.
- STARS offense-level aggregates remain separate and available through 2026-06-23.
- Official 2020 population profiles and violent-crime rates per 1,000 are implemented.
- The first historical annual artifact publishes validated 2025 STARS neighborhood aggregates and rates, with source rows lacking an SNA retained in an explicit unassigned bucket.
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
- Historical annual panel: 2025 enabled; mixed-system 2024 and PDI years 2011–2023 remain gated, with no fabricated observations.

## Local commands

`npm run dev`, `npm run build`, `npm test`, `npm run data:validate`, `npm run db:migrate`, `npm run db:seed`.

Database location: `data/cnce.sqlite` by default (ignored by Git).

## Major caveats

The 51 published neighborhood-profile populations sum to 329,782 while the direct Citywide profile is 309,317. Neighborhood rates use each published profile, and the city rate uses the direct Citywide value. Legacy PDI also includes six post-transition reported dates. Both caveats are preserved and visible.
