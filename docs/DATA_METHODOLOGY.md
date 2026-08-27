# Data methodology

## Source layers

Current dashboard totals come from the 51 official CPD neighborhood reports. They are preliminary aggregate offense counts and are the fresher layer. STARS is retained separately as the offense-level layer: each STARS row is an offense, not necessarily a unique incident, victim, call for service, arrest, or conviction. The layers are never silently blended.

The current Villages at Roll Hill source PDF (published under the legacy report name Fay Apartments) has YTD subtotal values that do not equal its published component rows. The pipeline preserves the official subtotal and component values without recomputing either and emits a validation warning.

## Taxonomy

The current aggregate view uses each report's published `Part 1 Violent`, `Part 1 Property`, and `Part 1 Total` values. Component categories remain traceable and selectable sitewide. Larceny/theft combines the current report's Theft from Auto and Personal/Other Theft components so it aligns with the canonical STARS category; motor-vehicle theft remains separate. STARS mappings preserve homicide, rape, robbery, aggravated assault, property categories, and Strangulation as its own source category until official cross-system comparability is established.

Every source label must map or appear in `data/reports/unmapped-offenses.json`.

For historical PDI, Homicide, Rape, Robbery, and Aggravated Assaults map to violent crime; Burglary/Breaking Entering and Theft map to property crime. Unauthorized Use and Part 2 Minor remain outside Part I. Blank PDI UCR groups are retained in the historical validation report and excluded from Part I totals.

## Periods

- YTD: January 1 through the current CPD neighborhood-report cutoff.
- Prior comparable YTD: January 1 through the same month/day one year earlier.
- Current 28 days: cutoff minus 27 days through cutoff, inclusive.
- Previous 28 days: cutoff minus 55 through cutoff minus 28, inclusive.
- If a prior count is zero, percent change is represented as new activity, not infinity.

Counts, absolute change, percent change, and rates stay distinguishable.

## Population and rates

Any selected crime-type rate per 1,000 is `selected-period count / selected-year population denominator × 1,000`. Official City Planning 2010 and 2020 SNA Census totals are the anchors. Years 2011–2019 are linearly interpolated between those anchors. Years after 2020 carry the 2020 Census value forward and are labeled as a carry-forward, not a new estimate. For combined map regions, member report counts and member profile populations are summed. The published neighborhood totals do not reconcile to the direct published Citywide totals; therefore neighborhood rates use each neighborhood profile while citywide rates use direct Citywide anchors. That reconciliation remains a published warning.

## ACS estimates and uncertainty

The demographic drilldown extracts the official City Planning SNA tables based on the 2016–2020 ACS 5-year estimates. Published 90% margins of error are retained with each count. Derived percentage MOEs use approximate ratio propagation. Composite education measures and combined CAGIS regions combine component MOEs by root-sum-of-squares; these derived margins are explicitly labeled approximate. The official Sedamsville and Westwood tables are image-only, so ACS values for Westwood and Riverside / Sedamsville remain unavailable rather than being inferred or zero-filled.

## June 2024 transition

PDI (`k59e-2pvf`) and STARS (`7aqy-xrv9`) are modeled as separate systems. STARS begins June 3, 2024. PDI contains a small number of later reported dates, so transition validation reports outliers instead of silently discarding or concatenating them.

## Geography

Modern visualizations use the official CAGIS source snapshot requested in EPSG:4326. The definitive crosswalk maps 51 civic-neighborhood names to 50 polygons. Three are combined: English Woods + North Fairmount, Lower Price Hill + Queensgate, and Riverside + Sedamsville. Source records remain civic-level; only the displayed map aggregate sums the members. Historical observations must specify native, current-proxy, or crosswalked display geometry.

## Reproducibility

Source URLs, retrieval times, checksums, queries, mapping version, and validation outputs are committed alongside derived assets. Raw source files are not manually edited.

## Historical publication order

Complete calendar years 2011–2025 are published. Comparable YTD trends use January 1–August 22 for 2011–2026, so a partial current year is never compared with a full historical year. PDI supplies 2011 through June 2, 2024; STARS begins June 3, 2024. The mixed 2024 year is annotated in charts and tables.

Homicide, rape, robbery, aggravated assault, burglary, and larceny/theft are available across the 2011–present panel. Motor-vehicle theft and Strangulation become separately available with the 2024 STARS transition. Unsupported earlier observations remain null/unavailable and are never converted to zero. Every map measure is filled from the same fixed signed change bands centered on zero: green indicates decreases, red indicates increases, gray indicates near-zero change, and gray hatching indicates unavailable comparisons. The displayed tooltip still reports the selected primary count, rate, or change.

PDI geography resolves the source SNA field first, then the CPD-neighborhood and community-council fields. Historical values are displayed on current 2020 SNA geography as a proxy. Rows still lacking a resolvable neighborhood remain in an explicit citywide unassigned bucket; assigned neighborhood totals plus that bucket reconcile to city totals. The gaps are largest in 2011 and 2012.
