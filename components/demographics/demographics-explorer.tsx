"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ratioMarginOfError, type DemographicEstimate, type DemographicsData, type NeighborhoodDemographics, type PopulationObservation } from "@/lib/demographics";

const methodLabels: Record<string, string> = {
  decennial_census: "Decennial Census anchor",
  interpolated_decennial_anchors: "Linear interpolation between 2010 and 2020 anchors",
  decennial_carry_forward: "2020 Census carry-forward",
  acs_5year_allocated: "ACS 5-year estimate",
  latest_acs_carry_forward: "Latest ACS carry-forward",
};

type Area = NeighborhoodDemographics | { id: "citywide"; slug: "citywide"; name: "Citywide"; population: PopulationObservation[]; latestAcs: DemographicsData["citywide"]["latestAcs"] };

export function DemographicsExplorer({ data, fixedSlug }: { data: DemographicsData; fixedSlug?: string }) {
  const [slug, setSlug] = useState(fixedSlug ?? "citywide");
  const [year, setYear] = useState(data.metadata.currentPopulationYear);
  const citywide: Area = { id: "citywide", slug: "citywide", name: "Citywide", population: data.citywide.population, latestAcs: data.citywide.latestAcs };
  const area: Area = slug === "citywide" ? citywide : data.neighborhoods.find((row) => row.slug === slug) ?? citywide;
  const selected = area.population.find((row) => row.year === year) ?? area.population.at(-1)!;
  const acs = area.latestAcs;
  const cards = acs ? demographicCards(acs.measures) : [];

  return <section className="border border-[#d4dedc] bg-white p-5">
    <div className="flex flex-wrap items-end gap-4">
      {!fixedSlug ? <label className="min-w-[240px] flex-1"><span className="mb-1.5 block text-xs font-bold text-[#5b7076]">Area</span><select aria-label="Demographic area" value={slug} onChange={(event) => setSlug(event.target.value)} className="w-full rounded-sm border border-[#afbfbd] bg-white px-3 py-2 text-sm font-bold text-[#173e4a]"><option value="citywide">Citywide</option>{data.neighborhoods.map((row) => <option key={row.id} value={row.slug}>{row.name}</option>)}</select></label> : null}
      <label className="min-w-[180px]"><span className="mb-1.5 block text-xs font-bold text-[#5b7076]">Population year</span><select aria-label="Population year" value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-full rounded-sm border border-[#afbfbd] bg-white px-3 py-2 text-sm font-bold text-[#173e4a]">{area.population.map((row) => <option key={row.year} value={row.year}>{row.year}</option>)}</select></label>
      <div className="min-w-[250px] border-l-4 border-[#0a766e] pl-4"><p className="eyebrow">{area.name} population</p><p className="mt-1 text-2xl font-black text-[#143a4a] tabular">{selected.estimate.toLocaleString()}</p><p className="mt-1 text-xs leading-5 text-[#63757b]">{methodLabels[selected.method] ?? selected.method} · source vintage {selected.sourceVintage}{selected.marginOfError === null ? " · no sampling MOE" : ` · ±${selected.marginOfError.toLocaleString()} MOE`}</p></div>
    </div>
    <div className="mt-5 h-[300px]" role="img" aria-label={`${area.name} annual population denominator series from 2010 through ${area.population.at(-1)?.year}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={area.population} margin={{ top: 10, right: 22, bottom: 8, left: 12 }}><CartesianGrid stroke="#dbe4e3" strokeDasharray="3 3"/><XAxis dataKey="year" tick={{ fill: "#526970", fontSize: 11 }} tickLine={false}/><YAxis width={72} tick={{ fill: "#526970", fontSize: 11 }} tickLine={false} tickFormatter={(value) => Number(value).toLocaleString()}/><Tooltip formatter={(value) => [Number(value).toLocaleString(), "Population denominator"]} labelFormatter={(value) => String(value)}/><ReferenceLine x={2010} stroke="#6f7775" label={{ value: "2010 Census", fill: "#536970", fontSize: 10 }}/><ReferenceLine x={2020} stroke="#0a766e" label={{ value: "2020 Census", fill: "#0a665f", fontSize: 10 }}/><Line type="linear" dataKey="estimate" stroke="#143a4a" strokeWidth={3} dot={(props) => { const row = area.population[props.index]; return <circle key={props.key} cx={props.cx} cy={props.cy} r={row.method === "decennial_census" ? 5 : 3} fill={row.method === "decennial_census" ? "#0a766e" : row.method === "interpolated_decennial_anchors" ? "#82908d" : "#c07a42"} stroke="#fff" strokeWidth={1.5}/>; }} activeDot={{ r: 6 }}/></LineChart></ResponsiveContainer></div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#607278]"><span><strong>Teal:</strong> Census anchor</span><span><strong>Gray:</strong> interpolated</span><span><strong>Orange:</strong> post-2020 carry-forward</span></div>
    <p className="mt-3 border-l-4 border-[#82908d] bg-[#f4f7f6] px-4 py-3 text-xs leading-5 text-[#596d73]"><strong>Annual denominator method:</strong> This line is not an annual ACS series. Values for 2011–2019 are linearly interpolated between official Decennial Census anchors; 2021 onward transparently carries the 2020 anchor until a defensible newer SNA estimate is available.</p>
    <div className="mt-7 border-t border-[#dce5e4] pt-5"><p className="eyebrow">2016–2020 ACS 5-year profile</p><h2 className="mt-1 text-xl font-black text-[#173e4a]">Estimates with 90% margins of error</h2>{acs ? <><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="border border-[#d6e0df] p-4"><p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-[#667a80]">{card.label}</p><p className="mt-1 text-xl font-black text-[#143a4a] tabular">{card.value}</p><p className="mt-1 text-[0.7rem] text-[#718187] tabular">{card.context}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-[#62757b]">Counts retain the published 90% MOE. Percentage MOEs use the Census proportion approximation; combined-map-region and composite-education MOEs use root-sum-of-squares. Large MOEs mean comparisons should be treated cautiously.</p></> : <p className="mt-4 border-l-4 border-[#d77b33] bg-[#fff8ef] px-4 py-3 text-sm text-[#765536]">This official SNA profile is unavailable; the app does not substitute zeros.</p>}</div>
  </section>;
}

function demographicCards(measures: Record<string, DemographicEstimate>) {
  const count = (label: string, key: string) => { const value = measures[key]; return { label, value: value ? value.estimate.toLocaleString() : "Unavailable", context: value?.marginOfError === null ? "MOE unavailable" : `±${value?.marginOfError.toLocaleString()} MOE` }; };
  const ratio = (label: string, numeratorKey: string, denominatorKey: string) => {
    const numerator = measures[numeratorKey]; const denominator = measures[denominatorKey];
    if (!numerator || !denominator || denominator.estimate <= 0) return { label, value: "Unavailable", context: "No denominator" };
    const value = numerator.estimate / denominator.estimate * 100; const moe = ratioMarginOfError(numerator, denominator);
    return { label, value: `${value.toFixed(1)}%`, context: moe === null ? `${numerator.estimate.toLocaleString()} people/households` : `±${moe.toFixed(1)} pts · ${numerator.estimate.toLocaleString()} count` };
  };
  return [
    count("ACS population estimate", "acsPopulation"), count("Households", "households"),
    ratio("Bachelor's degree or higher", "bachelorsOrHigher", "education25Plus"), ratio("Families below poverty", "familiesBelowPoverty", "familyHouseholds"),
    ratio("Households with no vehicle", "householdsNoVehicle", "households"), ratio("Owner occupied", "ownerOccupiedHousing", "occupiedHousingUnits"),
    ratio("Renter occupied", "renterOccupiedHousing", "occupiedHousingUnits"), ratio("Internet subscription", "internetSubscription", "households"),
  ];
}
