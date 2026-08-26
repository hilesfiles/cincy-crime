const domain = "https://data.cincinnati-oh.gov";

export async function socrataQuery<T>(datasetId: string, query: string): Promise<T[]> {
  const url = `${domain}/resource/${datasetId}.json?$query=${encodeURIComponent(query)}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`Socrata ${response.status}: ${await response.text()}`);
      return (await response.json()) as T[];
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
}

export async function socrataMetadata(datasetId: string) {
  const response = await fetch(`${domain}/api/views/${datasetId}`, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Metadata ${response.status}: ${await response.text()}`);
  return response.json() as Promise<Record<string, unknown>>;
}
