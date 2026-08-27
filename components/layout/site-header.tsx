import Link from "next/link";

const links = [["Explore", "/"], ["Rankings", "/rankings"], ["Compare", "/compare"], ["Trends", "/trends"], ["Demographics", "/demographics"], ["Elections", "/elections"], ["Methodology", "/methodology"], ["Data status", "/data-status"]] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-[#d4dddd] bg-white">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-5 py-4 lg:px-9">
        <Link href="/" className="group flex items-center gap-3" aria-label="Crime Explorer home">
          <span className="grid size-9 place-items-center rounded-sm bg-[#143a4a] text-sm font-black tracking-tight text-white">CN</span>
          <span><span className="block text-[0.92rem] font-bold leading-tight text-[#163541]">Cincinnati Neighborhood</span><span className="block text-[0.76rem] font-medium leading-tight text-[#60737a]">Crime Explorer</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="rounded px-2.5 py-2 text-sm font-semibold text-[#53666d] transition hover:bg-[#edf3f2] hover:text-[#123846]">{label}</Link>)}
        </nav>
        <Link href="/sources" className="rounded border border-[#b8c8c6] px-3 py-2 text-xs font-bold text-[#204b56] transition hover:border-[#087e74]">Sources & provenance</Link>
      </div>
    </header>
  );
}
