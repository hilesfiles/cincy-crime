export type ElectionMeasure = "margin" | "turnout" | "democratic" | "republican" | "other";

export type ElectionAreaResult = {
  id: string;
  slug: string;
  name: string;
  registeredVoters: number;
  ballotsCast: number;
  presidentialVotes: number;
  democraticVotes: number;
  republicanVotes: number;
  otherVotes: number;
  turnoutPercent: number | null;
  democraticPercent: number | null;
  republicanPercent: number | null;
  otherPercent: number | null;
  marginPoints: number | null;
  directAssignmentPercent: number | null;
  matchedPrecinctCount: number;
  splitPrecinctCount: number;
  estimateStatus: "area_weighted_current_precinct_reference" | "official_citywide";
};

export type ElectionYear = {
  year: number;
  date: string;
  contest: "President and Vice President";
  democraticTicket: string;
  republicanTicket: string;
  citywide: ElectionAreaResult;
  neighborhoods: ElectionAreaResult[];
  coverage: {
    resultPrecincts: number;
    matchedReferencePrecincts: number;
    unmatchedResultPrecincts: number;
    matchedBallotsPercent: number;
  };
};

export type ElectionsData = {
  metadata: {
    schemaVersion: string;
    generatedAt: string;
    electionYears: number[];
    resultSource: string;
    precinctGeometrySource: string;
    precinctGeometryRetrievedAt: string;
    geographyVersion: string;
    allocationMethod: string;
    voteShareDenominator: string;
    turnoutDefinition: string;
    partisanLabelNote: string;
    presentationNote: string;
    sources: Array<{ label: string; url: string }>;
  };
  elections: ElectionYear[];
};

export function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator * 100 : null;
}

export function electionMetric(area: ElectionAreaResult, measure: ElectionMeasure) {
  if (measure === "turnout") return area.turnoutPercent;
  if (measure === "democratic") return area.democraticPercent;
  if (measure === "republican") return area.republicanPercent;
  if (measure === "other") return area.otherPercent;
  return area.marginPoints;
}

export function formatElectionPercent(value: number | null, signed = false) {
  if (value === null) return "Unavailable";
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function presidentialShareTotal(area: ElectionAreaResult) {
  return area.democraticPercent === null || area.republicanPercent === null || area.otherPercent === null
    ? null
    : area.democraticPercent + area.republicanPercent + area.otherPercent;
}
