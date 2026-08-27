import type { Metadata } from "next";
import { ElectionPageClient } from "@/components/elections/election-page-client";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Elections", description: "Estimated Cincinnati neighborhood turnout and vote shares for presidential and midterm contests from official Hamilton County precinct canvasses." };

export default function ElectionsPage() {
  return <PageShell eyebrow="Voting and turnout" title="Neighborhood elections explorer" description="Compare presidential and midterm turnout, statewide contest vote shares, and party margins using official precinct canvasses and a visibly modeled neighborhood allocation."><ElectionPageClient/></PageShell>;
}
