import { createHash } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function fetchBytes(url: string) {
  const response = await fetch(url, { headers: { "user-agent": "cincy-crime-data-pipeline/0.2" } });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

export function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function pdfPageTokens(bytes: Uint8Array, pageNumber = 1) {
  // PDF.js transfers/detaches its input buffer. Pass a copy so provenance hashing still sees the original bytes.
  const document = await getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  if (pageNumber > document.numPages) throw new Error(`PDF has ${document.numPages} pages; requested page ${pageNumber}`);
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items
    .filter((item): item is (typeof content.items)[number] & { str: string } => "str" in item)
    .map((item) => item.str.trim())
    .filter(Boolean);
}

export async function pdfPageLines(bytes: Uint8Array, pageNumber = 1) {
  const document = await getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  if (pageNumber > document.numPages) throw new Error(`PDF has ${document.numPages} pages; requested page ${pageNumber}`);
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const rows = new Map<number, Array<{ x: number; text: string }>>();
  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim() || !("transform" in item)) continue;
    const y = Math.round(item.transform[5] * 2) / 2;
    const row = rows.get(y) ?? [];
    row.push({ x: item.transform[4], text: item.str.trim() });
    rows.set(y, row);
  }
  return [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim());
}

export async function pdfAllLines(bytes: Uint8Array, startPage = 1) {
  const document = await getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  const output: string[] = [];
  for (let pageNumber = Math.max(1, startPage); pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim() || !("transform" in item)) continue;
      const y = Math.round(item.transform[5] * 2) / 2;
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4], text: item.str.trim() });
      rows.set(y, row);
    }
    output.push(...[...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim()));
  }
  return output;
}

export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }));
  return results;
}
