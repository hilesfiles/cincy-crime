# Data methodology

## Unit of analysis

The STARS dataset documents each row as an offense. Counts therefore represent reported offense rows. They are not interchangeable with incidents, victims, calls for service, arrests, or convictions.

## Taxonomy

`type = Part 1 Violent` supplies the default violent total. Source labels map homicide, rape, robbery, and aggravated assault to canonical categories. Part I property consists of burglary/breaking and entering, personal/other theft, theft from auto, and auto theft. Strangulation remains a separately preserved non-Part-I mapping until official methodology establishes cross-system treatment.

Every source label must map or appear in `data/reports/unmapped-offenses.json`.

## Periods

- YTD: January 1 through the latest STARS source date.
- Prior comparable YTD: January 1 through the same month/day one year earlier.
- Current 28 days: cutoff minus 27 days through cutoff, inclusive.
- Previous 28 days: cutoff minus 55 through cutoff minus 28, inclusive.
- If a prior count is zero, percent change is represented as new activity, not infinity.

Counts, absolute change, and percent change stay visible together. Rates remain null without an appropriate population and matching geographic vintage.

## June 2024 transition

PDI (`k59e-2pvf`) and STARS (`7aqy-xrv9`) are modeled as separate systems. STARS begins June 3, 2024. PDI contains a small number of later reported dates, so transition validation reports outliers instead of silently discarding or concatenating them.

## Geography

Modern visualizations use the official CAGIS source snapshot requested in EPSG:4326. Historical observations must specify native, current-proxy, or crosswalked display geometry. Missing historical boundaries are not assumed equivalent to 2020.

## Reproducibility

Source URLs, retrieval times, checksums, queries, mapping version, and validation outputs are committed alongside derived assets. Raw source files are not manually edited.
