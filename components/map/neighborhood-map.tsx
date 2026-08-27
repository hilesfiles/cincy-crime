"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { crimeLegendSteps, decreaseColors, increaseColors, neutralChangeColor, quantileThresholds, signedChangeColor, signedMagnitudeColor } from "@/lib/map-colors";

export type MapRegion = { id: string; slug: string; name: string; sourceName: string; number: number; members: string[]; path: string };
type MapData = { viewBox: string; sourceFeatureCount: number; regions: MapRegion[] };
export type MapMetricValue = number | "new-activity" | null;
export type MapColorMode = "change" | "count" | "rate";

export function NeighborhoodMap({ data, metricValues, colorValues = metricValues, comparisonValues = colorValues, colorMode = "change", metricLabel = "Selected metric", changeLabel = "Change from comparable prior period", formatValue = (value) => value === "new-activity" ? "New activity" : value?.toLocaleString() ?? "Unavailable", formatChange = (value) => value === "new-activity" ? "New activity" : value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`, profileQuery = "", onSelect }: { data: MapData; metricValues?: Record<string, MapMetricValue>; colorValues?: Record<string, MapMetricValue>; comparisonValues?: Record<string, MapMetricValue>; colorMode?: MapColorMode; metricLabel?: string; changeLabel?: string; formatValue?: (value: MapMetricValue) => string; formatChange?: (value: MapMetricValue) => string; profileQuery?: string; onSelect?: (region: MapRegion) => void }) {
  const [hovered, setHovered] = useState<MapRegion | null>(null);
  const [selected, setSelected] = useState<MapRegion | null>(null);
  const active = hovered ?? selected;
  const availableValues = useMemo(() => Object.values(colorValues ?? {}).filter((value) => value !== null && value !== undefined), [colorValues]);
  const thresholds = useMemo(() => quantileThresholds(availableValues.filter((value): value is number => typeof value === "number").map(Math.abs)), [availableValues]);
  const colorFor = (region: MapRegion) => {
    const value = colorValues?.[region.sourceName] ?? null;
    return colorMode === "change" ? signedChangeColor(value) : signedMagnitudeColor(typeof value === "number" ? value : null, thresholds);
  };
  return (
    <div className="relative min-h-[480px] overflow-hidden rounded-sm bg-[#eef3f2] lg:min-h-[650px]">
      <MapLegend mode={colorMode} thresholds={thresholds} availableCount={availableValues.length}/>
      <svg viewBox={data.viewBox} className="h-full min-h-[480px] w-full p-5 lg:min-h-[650px] lg:p-8" role="img" aria-labelledby="sna-map-title sna-map-description">
        <title id="sna-map-title">Cincinnati statistical neighborhood map</title><desc id="sna-map-description">An interactive vector map of statistical neighborhood approximation regions. Use Tab and Enter to select a region.</desc>
        <defs><pattern id="missing-data-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#737b79"/><rect width="3" height="8" fill="#aeb5b3"/></pattern></defs>
        {data.regions.map((region) => {
          const isSelected = selected?.id === region.id; const isHovered = hovered?.id === region.id;
          const choose = () => { setSelected(region); onSelect?.(region); };
          const display = formatValue(metricValues?.[region.sourceName] ?? null); const change = formatChange(comparisonValues?.[region.sourceName] ?? null);
          return <path key={region.id} id={`neighborhood-${region.slug}`} data-neighborhood-id={region.id} data-sna-name={region.name} data-sna-number={region.number} tabIndex={0} role="button" aria-label={`${region.name} statistical area, ${metricLabel}: ${display}; ${changeLabel}: ${change}`} aria-pressed={isSelected} d={region.path} fill={colorFor(region)} stroke={isSelected || isHovered ? "#e77c35" : "#ffffff"} strokeWidth={isSelected ? 4 : isHovered ? 3 : 1.45} vectorEffect="non-scaling-stroke" className="cursor-pointer transition-[fill,stroke] duration-150 focus:outline-none" onMouseEnter={() => setHovered(region)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(region)} onBlur={() => setHovered(null)} onClick={choose} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } }}><title>{`${region.name}: ${display}; ${changeLabel}: ${change}`}</title></path>;
        })}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex min-h-[84px] items-center justify-between gap-4 rounded-sm border border-[#c9d7d5] bg-white/95 px-4 py-3 shadow-md sm:left-auto sm:w-[330px]" aria-live="polite">
        {active ? <><div><p className="eyebrow">{metricLabel}</p><p className="mt-1 text-base font-bold text-[#143a4a]">{active.name}</p><p className="mt-0.5 text-sm font-black text-[#143a4a] tabular">{formatValue(metricValues?.[active.sourceName] ?? null)}</p><p className="mt-0.5 text-xs font-bold text-[#596c72] tabular">{changeLabel}: {formatChange(comparisonValues?.[active.sourceName] ?? null)}</p>{active.members.length > 1 && <p className="mt-1 text-xs text-[#68797e]">Represents {active.members.join(" + ")}</p>}</div><Link href={`/neighborhood/${active.slug}${profileQuery}`} style={{ color: "#ffffff" }} className="shrink-0 rounded-sm bg-[#0a766e] px-3 py-2 text-xs font-bold text-white hover:bg-[#075f59]">Open profile →</Link></> : <div><p className="eyebrow">Explore the map</p><p className="mt-1 text-sm font-semibold text-[#53666d]">Hover, focus, or select any area</p></div>}
      </div>
    </div>
  );
}

function MapLegend({ mode, thresholds, availableCount }: { mode: MapColorMode; thresholds: number[]; availableCount: number }) {
  if (mode === "change") return <div className="absolute left-1/2 top-4 z-10 w-[min(940px,calc(100%-2rem))] -translate-x-1/2 rounded-sm border border-[#d0dcda] bg-white/95 px-3 py-2 shadow-sm" aria-label="Change-rate color legend"><p className="text-center text-[0.6rem] font-black uppercase tracking-[0.09em] text-[#536970]">Decrease ← signed change (%) → increase</p><div className="mt-1 grid grid-cols-[repeat(17,minmax(0,1fr))] gap-px">{crimeLegendSteps.map((step, index) => <div key={`${step.label}-${index}`} className="min-w-0 text-center"><span className="block h-3" style={{ backgroundColor: step.color }} aria-hidden="true"/><span className="mt-0.5 block text-[0.48rem] font-bold text-[#536970] tabular sm:text-[0.56rem]">{index < 8 ? `−${step.label}` : index > 8 ? `+${step.label}` : step.label}</span></div>)}</div><p className="mt-1 text-center text-[0.56rem] text-[#68797e]">Only exact 0% is gray; hatching is unavailable. New activity uses strongest red. {availableCount} areas have a comparison.</p></div>;
  const formatThreshold = (value: number) => mode === "count" ? Math.round(value).toLocaleString() : value.toFixed(1);
  const bandLabels = [...thresholds.map(formatThreshold), thresholds.length ? `${formatThreshold(thresholds.at(-1)!)}+` : "—"];
  const steps = [...decreaseColors.map((color, index) => ({ color, label: `−${bandLabels[index] ?? "—"}` })).reverse(), { color: neutralChangeColor, label: "0" }, ...increaseColors.map((color, index) => ({ color, label: `+${bandLabels[index] ?? "—"}` }))];
  const title = mode === "count" ? "Decrease ← signed count change → increase" : "Decrease ← signed rate change per 1,000 → increase";
  const ariaLabel = mode === "count" ? "Reported count color legend" : "Rate per 1,000 color legend";
  return <div className="absolute left-1/2 top-4 z-10 w-[min(940px,calc(100%-2rem))] -translate-x-1/2 rounded-sm border border-[#d0dcda] bg-white/95 px-3 py-2 shadow-sm" aria-label={ariaLabel}><p className="text-center text-[0.6rem] font-black uppercase tracking-[0.09em] text-[#536970]">{title}</p><div className="mt-1 grid grid-cols-[repeat(17,minmax(0,1fr))] gap-px">{steps.map((step, index) => <div key={`${step.label}-${index}`} className="min-w-0 text-center"><span className="block h-3" style={{ backgroundColor: step.color }} aria-hidden="true"/><span className="mt-0.5 block text-[0.46rem] font-bold text-[#536970] tabular sm:text-[0.54rem]">{step.label}</span></div>)}</div><p className="mt-1 text-center text-[0.56rem] text-[#68797e]">Green is a decrease, red is an increase, and exact zero is gray. Bands are based on available neighborhood change magnitudes; hatching is unavailable. {availableCount} areas have a comparison.</p></div>;
}
