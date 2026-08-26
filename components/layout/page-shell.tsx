import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div className="min-h-screen bg-[#f5f7f6]"><SiteHeader /><main><header className="border-b border-[#d7e0df] bg-white"><div className="mx-auto max-w-[1240px] px-5 py-10 lg:px-9"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#102f3c] sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#607278] sm:text-base">{description}</p></div></header><div className="mx-auto max-w-[1240px] px-5 py-8 lg:px-9 lg:py-10">{children}</div></main><SiteFooter /></div>;
}
