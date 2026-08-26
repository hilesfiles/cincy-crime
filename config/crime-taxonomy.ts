export const sourceOffenseMappings = {
  Homicide: { canonical: "homicide", group: "violent", part1: true },
  Rape: { canonical: "rape", group: "violent", part1: true },
  Robbery: { canonical: "robbery", group: "violent", part1: true },
  "Agg Assault": { canonical: "aggravated_assault", group: "violent", part1: true },
  "Burglary/BE": { canonical: "burglary", group: "property", part1: true },
  "Personal/Other Theft": { canonical: "larceny_theft", group: "property", part1: true },
  "Theft from Auto": { canonical: "larceny_theft", group: "property", part1: true },
  "Auto Theft": { canonical: "motor_vehicle_theft", group: "property", part1: true },
  Strangulation: { canonical: "strangulation", group: "other", part1: false, note: "Preserved separately pending official comparability review." },
  "Part 2": { canonical: "other", group: "other", part1: false },
} as const;

export const canonicalCategoryLabels: Record<string, string> = {
  homicide: "Homicide", rape: "Rape", robbery: "Robbery", aggravated_assault: "Aggravated assault",
  burglary: "Burglary / breaking and entering", larceny_theft: "Larceny / theft",
  motor_vehicle_theft: "Motor vehicle theft", strangulation: "Strangulation", other: "Part II / other",
};
