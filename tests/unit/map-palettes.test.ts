import { describe, expect, it } from "vitest";
import electionDataJson from "../../data/processed/elections/presidential-neighborhoods.json";
import type { ElectionsData } from "../../lib/elections";
import { electionFill, signedChangeColor } from "../../lib/map-colors";

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

  it("centers election margin at purple and separates party directions", () => {
    expect(electionFill(0, "margin")).toBe("#8759a8");
    expect(electionFill(-15, "margin")).not.toBe(electionFill(15, "margin"));
  });
});

describe("election artifact", () => {
  const data = electionDataJson as ElectionsData;

  it("publishes three reconciled presidential elections", () => {
    expect(data.metadata.electionYears).toEqual([2016, 2020, 2024]);
    for (const election of data.elections) {
      expect(election.coverage.matchedBallotsPercent).toBe(100);
      expect(election.neighborhoods).toHaveLength(50);
      const shares = (election.citywide.democraticPercent ?? 0) + (election.citywide.republicanPercent ?? 0) + (election.citywide.otherPercent ?? 0);
      expect(shares).toBeCloseTo(100, 6);
      const allocatedVotes = election.neighborhoods.reduce((sum, row) => sum + row.presidentialVotes, 0);
      expect(allocatedVotes).toBeCloseTo(election.citywide.presidentialVotes, 0);
    }
  });
});
