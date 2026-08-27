import type { Metadata } from "next";
import { ElectionPageClient } from "@/components/elections/election-page-client";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Elections", description: "Estimated Cincinnati neighborhood turnout and presidential vote shares from official Hamilton County precinct canvasses." };

export default function ElectionsPage() {
  return <PageShell eyebrow="Voting and turnout" title="Neighborhood elections explorer" description="Compare presidential turnout and candidate-ticket vote shares using official precinct canvasses and a visibly modeled neighborhood allocation."><ElectionPageClient/></PageShell>;
}
