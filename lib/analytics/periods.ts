export type PercentChange =
  | { kind: "value"; value: number }
  | { kind: "new-activity"; value: null }
  | { kind: "no-change"; value: 0 };

const asIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export function ytdWindows(cutoff: string) {
  const current = new Date(`${cutoff}T00:00:00Z`);
  const prior = new Date(current);
  prior.setUTCFullYear(prior.getUTCFullYear() - 1);
  return {
    comparisonStart: `${current.getUTCFullYear()}-01-01`, comparisonEnd: asIsoDate(current),
    priorStart: `${prior.getUTCFullYear()}-01-01`, priorEnd: asIsoDate(prior),
  };
}

export function rolling28Windows(cutoff: string) {
  const end = new Date(`${cutoff}T00:00:00Z`);
  const offset = (days: number) => { const value = new Date(end); value.setUTCDate(value.getUTCDate() - days); return asIsoDate(value); };
  return { currentStart: offset(27), currentEnd: offset(0), previousStart: offset(55), previousEnd: offset(28) };
}

export function percentChange(current: number, prior: number): PercentChange {
  if (prior === 0 && current === 0) return { kind: "no-change", value: 0 };
  if (prior === 0) return { kind: "new-activity", value: null };
  return { kind: "value", value: ((current - prior) / prior) * 100 };
}

export function ratePer1000(count: number, population: number | null) {
  if (!population || population <= 0) return null;
  return (count / population) * 1000;
}
