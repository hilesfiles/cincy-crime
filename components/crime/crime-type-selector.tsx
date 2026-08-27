"use client";

import { useEffect, useState } from "react";
import { crimeMetricKeys, crimeMetrics, type CrimeMetricKey } from "@/lib/crime/metrics";

export function useCrimeMetricSelection(defaultValue: CrimeMetricKey = "violent") {
  const [crime, setCrime] = useState<CrimeMetricKey>(defaultValue);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("crime") as CrimeMetricKey | null;
    if (requested && crimeMetricKeys.has(requested)) {
      const timer = window.setTimeout(() => setCrime(requested), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const setCrimeAndUrl = (value: CrimeMetricKey) => {
    setCrime(value);
    const url = new URL(window.location.href);
    url.searchParams.set("crime", value);
    window.history.replaceState({}, "", url);
  };

  return { crime, setCrime: setCrimeAndUrl };
}

export function CrimeTypeSelector({ value, onChange, className = "min-w-[240px]" }: { value: CrimeMetricKey; onChange: (value: CrimeMetricKey) => void; className?: string }) {
  const summary = crimeMetrics.filter((metric) => metric.group === "summary");
  const violent = crimeMetrics.filter((metric) => metric.group === "violent");
  const property = crimeMetrics.filter((metric) => metric.group === "property");
  const supplemental = crimeMetrics.filter((metric) => metric.group === "supplemental");
  return <label className="block"><span className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5b7278]">Crime type</span><select aria-label="Crime type" value={value} onChange={(event) => onChange(event.target.value as CrimeMetricKey)} className={`${className} rounded-sm border border-[#aebfbd] bg-white px-3 py-2 text-sm font-bold text-[#173d4a]`}><optgroup label="Summary measures">{summary.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</optgroup><optgroup label="Violent offenses">{violent.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</optgroup><optgroup label="Property offenses">{property.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}{metric.availableFrom > 2011 ? " (2024+)" : ""}</option>)}</optgroup><optgroup label="Separately reported">{supplemental.map((metric) => <option key={metric.key} value={metric.key}>{metric.label} (2024+)</option>)}</optgroup></select></label>;
}
