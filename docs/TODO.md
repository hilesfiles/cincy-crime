# Outstanding work

- Keep the definitive civic-neighborhood ↔ SNA crosswalk versioned when CAGIS or report naming changes.
- Verify STARS and CAGIS redistribution/license language and select a repository source-code license.
- Reconcile STARS offense-level totals against the CPD aggregate reports over their common cutoff without treating unlike grains as identical.
- Determine official treatment of the separate STARS Strangulation category.
- Investigate the documented non-additive City Planning population-profile totals and evaluate a future exact Census-block spatial allocation without replacing the verified published denominators silently.
- Implement idempotent incident-level full ingestion when needed; current public build uses aggregate JSON.
- Import SNA 2010 and validate its use for the 2011–2023 PDI series.
- Build the historical panel from the easiest recent digital years first, validate 2024's mixed-system boundary, then ingest and validate PDI annual neighborhood aggregates backward through 2011.
- Harmonize the PDI/STARS category and neighborhood mappings across the June 2024 transition.
- Add monthly/annual trend charts and enable each year only after its coverage gates pass.
- Add a scheduled data-refresh workflow only after source update cadence and review gates are agreed.
