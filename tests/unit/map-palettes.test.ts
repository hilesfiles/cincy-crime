import { describe, expect, it } from "vitest";
import electionDataJson from "../../data/processed/elections/neighborhood-elections.json";
import type { ElectionsData } from "../../lib/elections";
import { countColors, electionFill, quantileThresholds, rateColors, sequentialColor, signedChangeColor } from "../../lib/map-colors";

describe("directional map palettes", () => {
  it("reserves gray for exact zero and directs every nonzero crime change", () => {
    expect(signedChangeColor(0)).toBe("#9ba3a1");
    expect(signedChangeColor(-0.1)).not.toBe(signedChangeColor(0));
    expect(signedChangeColor(0.1)).not.toBe(signedChangeColor(0));
    expect(signedChangeColor(-0.1)).not.toBe(signedChangeColor(0.1));
    expect(signedChangeColor(null)).toContain("missing-data-hatch");
  });

  it("uses progressively stronger colors at every requested band", () => {
    const values = [0.1, 2.5, 5, 7.5, 15, 20, 25, 50];
    expect(new Set(values.map((value) => signedChangeColor(value))).size).toBe(values.length);
    expect(new Set(values.map((value) => signedChangeColor(-value))).size).toBe(values.length);
  });

  it("builds distinct sequential scales for reported count and rate", () => {
    const thresholds = quantileThresholds([0, 5, 10, 15, 20, 25, 30, 35, 40]);
    expect(thresholds).toHaveLength(7);
    expect(sequentialColor(0, thresholds, countColors)).toBe(countColors[0]);
    expect(sequentialColor(40, thresholds, countColors)).toBe(countColors.at(-1));
    expect(sequentialColor(40, thresholds, rateColors)).toBe(rateColors.at(-1));
    expect(sequentialColor(20, thresholds, countColors)).not.toBe(sequentialColor(20, thresholds, rateColors));
    expect(sequentialColor(null, thresholds, countColors)).toContain("missing-data-hatch");
  });

  it("centers election margin at purple and separates party directions", () => {
    expect(electionFill(0, "margin")).toBe("#8759a8");
    expect(electionFill(-15, "margin")).not.toBe(electionFill(15, "margin"));
  });
});

describe("election artifact", () => {
  const data = electionDataJson as ElectionsData;

  it("publishes reconciled presidential and midterm contests", () => {
    expect(data.metadata.electionYears).toEqual([2016, 2018, 2020, 2022, 2024]);
    expect(data.elections.map((election) => election.id)).toEqual(["2016-president", "2018-governor", "2018-us_senate", "2020-president", "2022-governor", "2022-us_senate", "2024-president"]);
    for (const election of data.elections) {
      expect(election.coverage.matchedBallotsPercent).toBe(100);
      expect(election.neighborhoods).toHaveLength(50);
      const shares = (election.citywide.democraticPercent ?? 0) + (election.citywide.republicanPercent ?? 0) + (election.citywide.otherPercent ?? 0);
      expect(shares).toBeCloseTo(100, 6);
      const allocatedVotes = election.neighborhoods.reduce((sum, row) => sum + row.contestVotes, 0);
      expect(allocatedVotes).toBeCloseTo(election.citywide.contestVotes, 0);
    }
  });
});
