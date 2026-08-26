export const canonicalNeighborhoods = [
  "Avondale", "Bond Hill", "California", "Camp Washington", "Carthage", "Clifton",
  "College Hill", "Columbia Tusculum", "Corryville", "CUF", "Downtown", "East End",
  "East Price Hill", "East Walnut Hills", "East Westwood", "English Woods", "Evanston",
  "Hartwell", "Hyde Park", "Kennedy Heights", "Linwood", "Lower Price Hill", "Madisonville",
  "Millvale", "Mt. Adams", "Mt. Airy", "Mt. Auburn", "Mt. Lookout", "Mt. Washington",
  "North Avondale", "North Fairmount", "Northside", "Oakley", "Over-the-Rhine", "Paddock Hills",
  "Pendleton", "Pleasant Ridge", "Queensgate", "Riverside", "Roselawn", "Sayler Park",
  "Sedamsville", "South Cumminsville", "South Fairmount", "Spring Grove Village",
  "Villages at Roll Hill", "Walnut Hills", "West End", "West Price Hill", "Westwood", "Winton Hills",
] as const;

export const regionMembers: Record<string, string[]> = {
  "English Woods_North Fairmount": ["English Woods", "North Fairmount"],
  "Lower Price Hill_Queensgate": ["Lower Price Hill", "Queensgate"],
  "Riverside_Sedamsville": ["Riverside", "Sedamsville"],
  "Roll Hill": ["Villages at Roll Hill"],
};

export function displayRegionName(name: string): string {
  return name.replaceAll("_", " / ").replace("Roll Hill", "Villages at Roll Hill");
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
