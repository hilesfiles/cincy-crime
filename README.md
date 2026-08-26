# Cincinnati Neighborhood Crime Explorer

A local-first, provenance-aware web application for exploring reported crime across Cincinnati statistical neighborhoods. The public site is a static Next.js export backed by audited JSON artifacts; local refresh jobs retain SQLite as the canonical analytical-store path.

> This is an independent analytical project, not an official Cincinnati Police Department publication.

## What works

- Interactive, keyboard-accessible vector map generated from the official CAGIS SNA source.
- Real STARS offense counts, current/prior comparable YTD, and adjacent 28-day periods.
- Metric switching, stable URL state, sortable rankings, up-to-four-area comparison, and 50 statically generated detail pages.
- Explicit PDI/STARS source adapters and June 2024 transition validation.
- Versioned offense mapping, unmapped-category report, provenance register, data-status page, SQLite schema, and automated tests.
- GitHub Pages deployment from `.github/workflows/deploy-pages.yml`.

No synthetic crime or population values are used. Rates remain unavailable until a compatible population denominator is verified.

## Important geography result

The official live CAGIS 2020 service returned **50 statistical polygons representing 51 named neighborhoods** on the retrieval date. Three source features are combined areas. This conflicts with the bootstrap expectation of exactly 52 polygons (whose supplied expected-name list itself contains 51 names). The raw source is preserved, the discrepancy is visible in the UI and reports, and no polygons are invented.

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

`data:refresh` fetches aggregate—not address-level—STARS rows for the published dashboard and inspects the legacy PDI transition. Raw API responses are cached under `data/raw`; processed browser-ready JSON is written under `data/processed` and `public/data`.

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

The validation command treats source-integrity failures as fatal and the documented geography/source-transition discrepancies as visible warnings.

## Data methodology

- STARS rows are offenses, not necessarily unique incidents, victims, calls for service, arrests, or adjudicated outcomes.
- Current YTD and prior YTD use the same month/day cutoff.
- Current 28 days is `D−27…D`; previous 28 days is `D−55…D−28`.
- Zero denominators display “new activity,” never infinity.
- Part I violent is derived from STARS `type = Part 1 Violent`. Strangulation remains separately preserved pending official cross-system comparability review.
- PDI and STARS are separate source systems and are never naively concatenated.

See [docs/DATA_METHODOLOGY.md](docs/DATA_METHODOLOGY.md) and [docs/SOURCE_REGISTER.md](docs/SOURCE_REGISTER.md).

## 2024 records-system caveat

STARS begins on June 3, 2024. The legacy PDI dataset contains a small number of later `date_reported` values, including outliers through 2026, even though the operational transition occurred in June 2024. The transition report preserves these records and warns rather than treating the absolute PDI maximum as a clean cutoff.

## Deployment

Push `main` to `https://github.com/hilesfiles/cincy-crime`. GitHub Actions tests, builds with the `/cincy-crime` base path, uploads `out/`, enables Pages, and deploys the site to `https://hilesfiles.github.io/cincy-crime/`.

## Optional Windows desktop app

The same static site and JSON can run inside a locked-down Electron/Chromium desktop shell. Node integration is disabled; content is served from the packaged files over a loopback-only ephemeral server so normal Next.js routes work offline.

```bash
npm run desktop:run
npm run desktop:package
```

The package command creates an x64 installer and portable executable under `dist-desktop/`. A separate GitHub Actions workflow can build artifacts manually or attach them to a `v*` tagged release. The Chromium runtime is a deliberate desktop dependency only; it is not used by GitHub Pages.

## Historical roadmap

The repository includes a historical CSV template, geographic-vintage schema, quality fields, and coverage matrix. Next phases are archival annual-table recovery, 1994–1999 research, boundary crosswalks, and verified Census/ACS denominators. Missing years remain missing.

## Licensing and attribution

- PDI metadata identifies the source as Public Domain.
- Other City/CAGIS and STARS redistribution terms must be rechecked against current source metadata before downstream redistribution.
- Application source licensing has not yet been selected; see `docs/TODO.md`.
