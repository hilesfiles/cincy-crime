import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const url = "https://services8.arcgis.com/WQtGT9bHpwcYeBTA/ArcGIS/rest/services/Cincinnati_Neighborhood/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID%2CSNA_NAME%2CSNA_NUMBER%2CACRES%2CSQMI&returnGeometry=true&outSR=4326&f=geojson";
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`CAGIS ${response.status}: ${await response.text()}`);
  const data = await response.text();
  const directory = path.join(process.cwd(), "data/raw/geography");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "sna-2020.geojson"), data);
  console.log(JSON.stringify({ event: "geography_fetched", bytes: Buffer.byteLength(data), source: url }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
