export type InitiativeGeographyStatus = "direct" | "shared_modeled" | "shared_unallocated" | "citywide_unallocated" | "outside_city";

export type InitiativeNeighborhood = {
  slug: string;
  name: string;
  weight?: number;
};

export type InitiativeRecord = {
  id: string;
  fiscalYear: number;
  program: string;
  category: string;
  recipient: string;
  amount: number;
  amountType: "awarded" | "invested" | "deployed";
  geographyStatus: InitiativeGeographyStatus;
  neighborhoods: InitiativeNeighborhood[];
  sourcePage: number | null;
  sourceUrl?: string;
  note?: string;
};

export type InitiativeLedgerData = {
  metadata: {
    generatedAt: string;
    coverage: string;
    sourceUrl: string;
    sourceTitle: string;
    amountRule: string;
    geographyRule: string;
    nonAdditivityWarning: string;
    unallocatedRule: string;
  };
  records: InitiativeRecord[];
};

export function initiativeAllocatedAmount(record: InitiativeRecord) {
  return record.neighborhoods.reduce((sum, neighborhood) => sum + record.amount * (neighborhood.weight ?? 0), 0);
}

export function initiativeNeighborhoodAmount(record: InitiativeRecord, slug: string) {
  const neighborhood = record.neighborhoods.find((row) => row.slug === slug);
  return neighborhood?.weight === undefined ? 0 : record.amount * neighborhood.weight;
}
