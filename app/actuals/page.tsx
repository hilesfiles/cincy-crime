import type { Metadata } from "next";
import actualsJson from "@/data/processed/financials/police-actuals.json";
import budgetJson from "@/data/processed/budget/police-budget.json";
import { ActualsExplorer } from "@/components/actuals/actuals-explorer";
import { FinancialNav } from "@/components/financial/financial-nav";
import { PageShell } from "@/components/layout/page-shell";
import type { PoliceActualsData } from "@/lib/actuals";
import type { PoliceBudgetData } from "@/lib/budget";

export const metadata: Metadata = {
  title: "Audited Police actual expenditures",
  description: "Cincinnati ACFR Police actuals, same-basis budget variance, and transparent neighborhood attribution.",
};

export default function ActualsPage() {
  return <PageShell eyebrow="Audited financial results" title="Police actual expenditures" description="Follow audited General Fund Police expenditures by fiscal year, compare actual with the ACFR final budget on the same accounting basis, and explore a clearly labeled neighborhood attribution model."><FinancialNav current="actuals"/><ActualsExplorer actuals={actualsJson as PoliceActualsData} budgetData={budgetJson as PoliceBudgetData}/></PageShell>;
}
