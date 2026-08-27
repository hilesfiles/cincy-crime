"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type MapRegion = { id: string; slug: string; name: string; sourceName: string; number: number; members: string[]; path: string };
type MapData = { viewBox: string; sourceFeatureCount: number; regions: MapRegion[] };
export type MapMetricValue = number | "new-activity" | null;
const changePalette = [
  { label: "≤−50", color: "#087a4f" },
  { label: "−25", color: "#39a96b" },
  { label: "−10", color: "#8fd19d" },
  { label: "0", color: "#aeb5b3" },
  { label: "+10", color: "#f0a08f" },
  { label: "+25", color: "#e24d43" },
  { label: "≥+50", color: "#b51f2e" },
];

export function NeighborhoodMap({ data, metricValues, colorValues = metricValues, metricLabel = "Selected metric", changeLabel = "Change from comparable prior period", formatValue = (value) => value === "new-activity" ? "New activity" : value?.toLocaleString() ?? "Unavailable", formatChange = (value) => value === "new-activity" ? "New activity" : value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`, profileQuery = "", onSelect }: { data: MapData; metricValues?: Record<string, MapMetricValue>; colorValues?: Record<string, MapMetricValue>; metricLabel?: string; changeLabel?: string; formatValue?: (value: MapMetricValue) => string; formatChange?: (value: MapMetricValue) => string; profileQuery?: string; onSelect?: (region: MapRegion) => void }) {
  const [hovered, setHovered] = useState<MapRegion | null>(null);
  const [selected, setSelected] = useState<MapRegion | null>(null);
  const active = hovered ?? selected;
  const availableChanges = useMemo(() => Object.values(colorValues ?? {}).filter((value) => value !== null && value !== undefined).length, [colorValues]);
  const colorFor = (region: MapRegion) => {
    const value = colorValues?.[region.sourceName];
    if (value === null || value === undefined) return "url(#missing-data-hatch)";
    if (value === "new-activity") return changePalette[6].color;
    return value <= -50 ? changePalette[0].color : value <= -25 ? changePalette[1].color : value <= -10 ? changePalette[2].color : value < 10 ? changePalette[3].color : value < 25 ? changePalette[4].color : value < 50 ? changePalette[5].color : changePalette[6].color;
  };
  return (
    <div className="relative min-h-[480px] overflow-hidden rounded-sm bg-[#eef3f2] lg:min-h-[650px]">
      <div className="absolute left-4 top-4 z-10 rounded-sm border border-[#d0dcda] bg-white/95 px-3 py-2 shadow-sm"><p className="eyebrow">Map preview</p><p className="mt-1 text-xs text-[#5c6d72]">Select a statistical area</p></div>
      <div className="absolute left-4 right-4 top-20 z-10 rounded-sm border border-[#d0dcda] bg-white/95 px-3 py-2 shadow-sm sm:left-auto sm:right-4 sm:top-4 sm:w-[430px]" aria-label="Change-rate color legend"><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#536970]">Fill: decrease ← signed change (%) → increase</p><div className="mt-1 grid grid-cols-7 gap-0.5">{changePalette.map((step) => <div key={step.label} className="text-center"><span className="block h-3" style={{ backgroundColor: step.color }} aria-hidden="true"/><span className="mt-0.5 block text-[0.58rem] font-bold text-[#536970] tabular">{step.label}</span></div>)}</div><p className="mt-1 text-[0.58rem] text-[#68797e]">Gray is near zero; gray hatching is unavailable. New activity uses strongest red. {availableChanges} areas have a comparison.</p></div>
      <svg viewBox={data.viewBox} className="h-full min-h-[480px] w-full p-5 lg:min-h-[650px] lg:p-8" role="img" aria-labelledby="sna-map-title sna-map-description">
        <title id="sna-map-title">Cincinnati statistical neighborhood map</title><desc id="sna-map-description">An interactive vector map of statistical neighborhood approximation regions. Use Tab and Enter to select a region.</desc>
        <defs><pattern id="missing-data-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#737b79"/><rect width="3" height="8" fill="#aeb5b3"/></pattern></defs>
        {data.regions.map((region) => {
          const isSelected = selected?.id === region.id; const isHovered = hovered?.id === region.id;
          const choose = () => { setSelected(region); onSelect?.(region); };
          const display = formatValue(metricValues?.[region.sourceName] ?? null); const change = formatChange(colorValues?.[region.sourceName] ?? null);
          return <path key={region.id} id={`neighborhood-${region.slug}`} data-neighborhood-id={region.id} data-sna-name={region.name} data-sna-number={region.number} tabIndex={0} role="button" aria-label={`${region.name} statistical area, ${metricLabel}: ${display}; ${changeLabel}: ${change}`} aria-pressed={isSelected} d={region.path} fill={colorFor(region)} stroke={isSelected || isHovered ? "#e77c35" : "#ffffff"} strokeWidth={isSelected ? 4 : isHovered ? 3 : 1.45} vectorEffect="non-scaling-stroke" className="cursor-pointer transition-[fill,stroke] duration-150 focus:outline-none" onMouseEnter={() => setHovered(region)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(region)} onBlur={() => setHovered(null)} onClick={choose} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } }}><title>{`${region.name}: ${display}; ${changeLabel}: ${change}`}</title></path>;
        })}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex min-h-[84px] items-center justify-between gap-4 rounded-sm border border-[#c9d7d5] bg-white/95 px-4 py-3 shadow-md sm:left-auto sm:w-[330px]" aria-live="polite">
        {active ? <><div><p className="eyebrow">{metricLabel}</p><p className="mt-1 text-base font-bold text-[#143a4a]">{active.name}</p><p className="mt-0.5 text-sm font-black text-[#143a4a] tabular">{formatValue(metricValues?.[active.sourceName] ?? null)}</p><p className="mt-0.5 text-xs font-bold text-[#596c72] tabular">{changeLabel}: {formatChange(colorValues?.[active.sourceName] ?? null)}</p>{active.members.length > 1 && <p className="mt-1 text-xs text-[#68797e]">Represents {active.members.join(" + ")}</p>}</div><Link href={`/neighborhood/${active.slug}${profileQuery}`} className="shrink-0 rounded-sm bg-[#0a766e] px-3 py-2 text-xs font-bold text-white hover:bg-[#075f59]">Open profile →</Link></> : <div><p className="eyebrow">Explore the map</p><p className="mt-1 text-sm font-semibold text-[#53666d]">Hover, focus, or select any area</p></div>}
      </div>
    </div>
  );
}
