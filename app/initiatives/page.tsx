import type { Metadata } from "next";
import initiativesJson from "@/data/processed/financials/initiative-ledger.json";
import budgetJson from "@/data/processed/budget/police-budget.json";
import { FinancialNav } from "@/components/financial/financial-nav";
import { InitiativeExplorer } from "@/components/initiatives/initiative-explorer";
import { PageShell } from "@/components/layout/page-shell";
import type { PoliceBudgetData } from "@/lib/budget";
import type { InitiativeLedgerData } from "@/lib/initiatives";

export const metadata: Metadata = {
  title: "Public-safety initiative ledger",
  description: "Curated Cincinnati violence-prevention and public-safety initiative awards with conservative neighborhood attribution.",
};

export default function InitiativesPage() {
  return <PageShell eyebrow="Program and award ledger" title="Public-safety initiatives by neighborhood" description="Inspect officially published violence-prevention and neighborhood-safety awards without folding them into Police actuals or inventing geographic detail the source does not provide."><FinancialNav current="initiatives"/><InitiativeExplorer data={initiativesJson as InitiativeLedgerData} budgetData={budgetJson as PoliceBudgetData}/></PageShell>;
}
