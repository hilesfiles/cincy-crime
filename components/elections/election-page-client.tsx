"use client";

import { useEffect, useState } from "react";
import { ElectionExplorer, type ElectionMapData } from "@/components/elections/election-explorer";
import type { ElectionsData } from "@/lib/elections";

type LoadedData = { elections: ElectionsData; map: ElectionMapData };

export function ElectionPageClient() {
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("../data/presidential-neighborhoods.json", { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error(`Election data request failed: ${response.status}`);
        return response.json() as Promise<ElectionsData>;
      }),
      fetch("../data/neighborhood-map.json", { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error(`Map data request failed: ${response.status}`);
        return response.json() as Promise<ElectionMapData>;
      }),
    ])
      .then(([elections, map]) => setLoaded({ elections, map }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, []);

  if (error) return <div role="alert" className="border-l-4 border-[#b51f2e] bg-[#fff3f2] p-5 text-sm font-semibold text-[#74202a]">Election data could not be loaded. Refresh the page or check the data-status page for source availability.</div>;
  if (!loaded) return <div role="status" className="border border-[#d2dcdb] bg-white p-6 text-sm font-semibold text-[#536970]">Loading election canvasses and precinct geography…</div>;
  return <ElectionExplorer data={loaded.elections} mapData={loaded.map}/>;
}
