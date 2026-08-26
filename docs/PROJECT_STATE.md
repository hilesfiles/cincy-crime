# Project state

Updated: 2026-08-26

## Application status

- Static Next.js dashboard builds successfully for GitHub Pages.
- Official vector map, five map metrics, selection, stable URL state, rankings, comparison, detail, methodology, source, trends, and data-status routes are implemented.
- STARS aggregates are populated with real official data through 2026-06-23.
- PDI and STARS adapters exist; the June 2024 transition is explicit.
- SQLite migrations and deterministic seed data are implemented.
- Optional Electron/Chromium Windows installer and portable package configuration are implemented.
- Automated unit/data tests pass; geography and source transition remain warnings.

## Current validated facts

- Geography: 50 source polygons representing 51 expected names.
- STARS source rows reported by metadata: 52,500.
- Dashboard cutoff: 2026-06-23.
- Unmapped STARS categories: 0.
- Published population rates: unavailable.
- Historical annual panel: missing/partial; no fabricated observations.

## Local commands

`npm run dev`, `npm run build`, `npm test`, `npm run data:validate`, `npm run db:migrate`, `npm run db:seed`.

Database location: `data/cnce.sqlite` by default (ignored by Git).

## Major warnings

The official 2020 SNA service currently conflicts with the bootstrap’s 52-feature expectation. The bootstrap expected-name list contains 51 names, while the source combines three pairs into 50 statistical polygons. Also, legacy PDI includes six post-transition reported dates. Both are preserved and visible.
