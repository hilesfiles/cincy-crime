export const sourceSystems = {
  CPD_PDI: { datasetId: "k59e-2pvf", transitionEnd: "2024-06-02", title: "PDI (Police Data Initiative) Crime Incidents" },
  CPD_STARS: { datasetId: "7aqy-xrv9", transitionStart: "2024-06-03", title: "Reported Crime (STARS Category Offenses) on or after 6/3/2024" },
  CPD_NEIGHBORHOOD_REPORTS: { datasetId: "cpdmobile-neighborhood-reports", title: "CPD Neighborhood Reports", role: "fresher aggregate layer" },
  CAGIS: { datasetId: "Cincinnati_Neighborhood/FeatureServer/0", title: "Cincinnati Neighborhood (SNA 2020)" },
  CITY_PLANNING_2020_SNA_PROFILES: { datasetId: "planning-2020-sna-profiles", title: "2020 Statistical Neighborhood Approximation profiles" },
} as const;
