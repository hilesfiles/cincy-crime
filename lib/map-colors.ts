export type SignedChangeValue = number | "new-activity" | null;
export type ElectionColorMeasure = "margin" | "turnout" | "democratic" | "republican" | "other";

export const decreaseColors = ["#d8f0df", "#b9e2c5", "#96d2a7", "#70bd88", "#48a66d", "#258c57", "#0d7447", "#005c38"];
export const increaseColors = ["#fde1de", "#f9c5bf", "#f4a79e", "#ec8278", "#e25f56", "#d43f3e", "#bd2832", "#9f1627"];
export const neutralChangeColor = "#9ba3a1";
export const magnitudeLabels = ["<2.5", "2.5", "5", "7.5", "15", "20", "25", "50+"];
export const crimeLegendSteps = [
  ...decreaseColors.map((color, index) => ({ label: magnitudeLabels[index], color })).reverse(),
  { label: "0", color: neutralChangeColor },
  ...increaseColors.map((color, index) => ({ label: magnitudeLabels[index], color })),
];

export const electionRedScale = ["#ad7a98", "#bd7182", "#cb666c", "#d75659", "#d94345", "#c92f38", "#b51f2e", "#981525"];
export const electionBlueScale = ["#7776b3", "#667bc0", "#5682c9", "#4387cf", "#2f79bd", "#1d65a8", "#10508e", "#073b73"];
export const electionGoldScale = ["#f4ead2", "#eed8aa", "#e6c27f", "#dca951", "#ca8b2d", "#ad7020", "#8d5818", "#6d4111"];
export const electionTealScale = ["#d8eeeb", "#b8dfda", "#92cbc4", "#69b4ad", "#449b94", "#267f78", "#12665f", "#07504a"];
export const electionPurple = "#8759a8";
export const electionMarginLegend = [...electionRedScale.map((color, index) => ({ label: magnitudeLabels[index], color })).reverse(), { label: "Even", color: electionPurple }, ...electionBlueScale.map((color, index) => ({ label: magnitudeLabels[index], color }))];

function intensityIndex(value: number) {
  const magnitude = Math.abs(value);
  return magnitude >= 50 ? 7 : magnitude >= 25 ? 6 : magnitude >= 20 ? 5 : magnitude >= 15 ? 4 : magnitude >= 7.5 ? 3 : magnitude >= 5 ? 2 : magnitude >= 2.5 ? 1 : 0;
}

export function signedChangeColor(value: SignedChangeValue) {
  if (value === null || value === undefined) return "url(#missing-data-hatch)";
  if (value === "new-activity") return increaseColors.at(-1)!;
  if (value === 0) return neutralChangeColor;
  return value < 0 ? decreaseColors[intensityIndex(value)] : increaseColors[intensityIndex(value)];
}

export function quantileThresholds(values: Array<number | null | undefined>, bands = 8) {
  const sorted = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length || bands < 2) return [];
  return Array.from({ length: bands - 1 }, (_, index) => {
    const position = ((index + 1) * (sorted.length - 1)) / bands;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
  });
}

export function signedMagnitudeColor(value: number | null | undefined, thresholds: number[]) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "url(#missing-data-hatch)";
  if (value === 0) return neutralChangeColor;
  const index = thresholds.findIndex((threshold) => Math.abs(value) <= threshold);
  const paletteIndex = index === -1 ? increaseColors.length - 1 : Math.min(index, increaseColors.length - 1);
  return value < 0 ? decreaseColors[paletteIndex] : increaseColors[paletteIndex];
}

export function electionFill(value: number | null, measure: ElectionColorMeasure) {
  if (value === null) return "url(#election-missing-hatch)";
  if (measure === "margin") return value === 0 ? electionPurple : value > 0 ? electionBlueScale[intensityIndex(value)] : electionRedScale[intensityIndex(value)];
  const palette = measure === "democratic" ? electionBlueScale : measure === "republican" ? electionRedScale : measure === "other" ? electionGoldScale : electionTealScale;
  return palette[Math.min(7, Math.max(0, Math.floor(value / 12.5)))];
}
