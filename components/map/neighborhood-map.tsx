"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type MapRegion = { id: string; slug: string; name: string; sourceName: string; number: number; members: string[]; path: string };
type MapData = { viewBox: string; sourceFeatureCount: number; regions: MapRegion[] };
const palette = ["#e7efed", "#c7ded9", "#89bcb4", "#3e948b", "#08766e"];

export function NeighborhoodMap({ data, metricValues, metricLabel = "Selected metric", formatValue = (value) => value?.toLocaleString() ?? "Unavailable", diverging = false, onSelect }: { data: MapData; metricValues?: Record<string, number | null>; metricLabel?: string; formatValue?: (value: number | null) => string; diverging?: boolean; onSelect?: (region: MapRegion) => void }) {
  const [hovered, setHovered] = useState<MapRegion | null>(null);
  const [selected, setSelected] = useState<MapRegion | null>(null);
  const active = hovered ?? selected;
  const numericValues = useMemo(() => Object.values(metricValues ?? {}).filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b), [metricValues]);
  const colorFor = (region: MapRegion) => {
    const value = metricValues?.[region.sourceName];
    if (value === null || value === undefined) return "#d9dfde";
    if (diverging) return value <= -20 ? "#08766e" : value < -5 ? "#79b8ae" : value <= 5 ? "#e7ecea" : value < 20 ? "#f2b788" : "#c65f32";
    const rank = numericValues.length <= 1 ? 0 : numericValues.findIndex((item) => item >= value) / (numericValues.length - 1);
    return palette[Math.min(4, Math.floor(rank * 5))];
  };
  return (
    <div className="relative min-h-[480px] overflow-hidden rounded-sm bg-[#eef3f2] lg:min-h-[650px]">
      <div className="absolute left-4 top-4 z-10 rounded-sm border border-[#d0dcda] bg-white/95 px-3 py-2 shadow-sm"><p className="eyebrow">Map preview</p><p className="mt-1 text-xs text-[#5c6d72]">Select a statistical area</p></div>
      <svg viewBox={data.viewBox} className="h-full min-h-[480px] w-full p-5 lg:min-h-[650px] lg:p-8" role="img" aria-labelledby="sna-map-title sna-map-description">
        <title id="sna-map-title">Cincinnati statistical neighborhood map</title><desc id="sna-map-description">An interactive vector map of statistical neighborhood approximation regions. Use Tab and Enter to select a region.</desc>
        {data.regions.map((region) => {
          const isSelected = selected?.id === region.id; const isHovered = hovered?.id === region.id;
          const choose = () => { setSelected(region); onSelect?.(region); };
          return <path key={region.id} id={`neighborhood-${region.slug}`} data-neighborhood-id={region.id} data-sna-name={region.name} data-sna-number={region.number} tabIndex={0} role="button" aria-label={`${region.name} statistical area, ${metricLabel}: ${formatValue(metricValues?.[region.sourceName] ?? null)}`} aria-pressed={isSelected} d={region.path} fill={colorFor(region)} stroke={isSelected || isHovered ? "#e77c35" : "#ffffff"} strokeWidth={isSelected ? 4 : isHovered ? 3 : 1.45} vectorEffect="non-scaling-stroke" className="cursor-pointer transition-[fill,stroke] duration-150 hover:fill-[#f3b07d] focus:fill-[#f3b07d] focus:outline-none" onMouseEnter={() => setHovered(region)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(region)} onBlur={() => setHovered(null)} onClick={choose} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } }}><title>{region.name}: {formatValue(metricValues?.[region.sourceName] ?? null)}</title></path>;
        })}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex min-h-[84px] items-center justify-between gap-4 rounded-sm border border-[#c9d7d5] bg-white/95 px-4 py-3 shadow-md sm:left-auto sm:w-[330px]" aria-live="polite">
        {active ? <><div><p className="eyebrow">{metricLabel}</p><p className="mt-1 text-base font-bold text-[#143a4a]">{active.name}</p><p className="mt-0.5 text-sm font-black text-[#0a766e] tabular">{formatValue(metricValues?.[active.sourceName] ?? null)}</p>{active.members.length > 1 && <p className="mt-1 text-xs text-[#68797e]">Represents {active.members.join(" + ")}</p>}</div><Link href={`/neighborhood/${active.slug}`} className="shrink-0 rounded-sm bg-[#0a766e] px-3 py-2 text-xs font-bold text-white hover:bg-[#075f59]">Open profile →</Link></> : <div><p className="eyebrow">Explore the map</p><p className="mt-1 text-sm font-semibold text-[#53666d]">Hover, focus, or select any area</p></div>}
      </div>
    </div>
  );
}
