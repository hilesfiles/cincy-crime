export function SiteFooter() {
  return (
    <footer className="border-t border-[#d4dddd] bg-[#102f3c] text-[#dbe8e7]">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-2 px-5 py-6 text-xs leading-5 lg:flex-row lg:items-center lg:justify-between lg:px-9">
        <p>Independent analytical project · Not an official Cincinnati Police Department publication</p>
        <p>Official-source data · Missing values remain missing · Methods are versioned</p>
      </div>
    </footer>
  );
}
