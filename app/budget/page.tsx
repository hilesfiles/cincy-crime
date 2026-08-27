import type { Metadata } from "next";
import { BudgetPageClient } from "@/components/budget/budget-page-client";
import { FinancialNav } from "@/components/financial/financial-nav";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Police budget and neighborhood allocation",
  description: "Annual Cincinnati Police budget ledger and transparent crime-share neighborhood allocation model.",
};

export default function BudgetPage() {
  return <PageShell eyebrow="Budget and financial context" title="Police budget and neighborhood allocation" description="Follow the City’s annual Police budget ledger, then explore a transparent model that attributes each fiscal year’s budget to neighborhoods in proportion to their reported crime."><FinancialNav current="budget"/><BudgetPageClient /></PageShell>;
}
