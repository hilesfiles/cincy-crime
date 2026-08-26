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
