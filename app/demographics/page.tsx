import demographicsJson from "@/data/processed/demographics/neighborhood-demographics.json";
import { DemographicsExplorer } from "@/components/demographics/demographics-explorer";
import { PageShell } from "@/components/layout/page-shell";
import type { DemographicsData } from "@/lib/demographics";

export default function DemographicsPage() {
  return <PageShell eyebrow="Population and context" title="Neighborhood demographics" description="Drill into official 2010 and 2020 Census population anchors, the documented annual denominator series, and City Planning’s neighborhood-level 2016–2020 ACS estimates with margins of error."><DemographicsExplorer data={demographicsJson as DemographicsData}/></PageShell>;
}
