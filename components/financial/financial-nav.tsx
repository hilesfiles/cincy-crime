import Link from "next/link";

const links = [
  ["Budget authority", "/budget"],
  ["Audited actuals", "/actuals"],
  ["Initiative ledger", "/initiatives"],
] as const;

export function FinancialNav({ current }: { current: "budget" | "actuals" | "initiatives" }) {
  return <nav aria-label="Financial views" className="mb-6 flex flex-wrap gap-2 border border-[#cfdad9] bg-white p-2">{links.map(([label, href]) => {
    const active = href === `/${current}`;
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} style={active ? { color: "#ffffff" } : undefined} className={`rounded-sm px-4 py-2 text-sm font-black ${active ? "bg-[#143a4a] text-white" : "text-[#31545e] hover:bg-[#edf3f2]"}`}>{label}</Link>;
  })}</nav>;
}
