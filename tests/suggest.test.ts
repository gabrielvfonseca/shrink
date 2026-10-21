import { describe, expect, it } from "vitest";
import { suggestIgnores } from "../src/suggest.js";
import type { FileEntry } from "../src/types.js";

const file = (overrides: Partial<FileEntry>): FileEntry => ({
  absPath: "/root/src/a.ts",
  lines: 5,
  relPath: "src/a.ts",
  size: 100,
  tokens: 10,
  ...overrides,
});

describe("suggestIgnores", () => {
  it("returns empty when nothing matches", () => {
    const report = suggestIgnores(
      [file({ relPath: "src/a.ts", tokens: 5 })],
      5
    );
    expect(report.suggestions).toEqual([]);
    expect(report.totalSavingsTokens).toBe(0);
    expect(report.percentOfTotal).toBe(0);
  });

  it("groups by pattern and ranks by token savings", () => {
    const files = [
      file({ relPath: "package-lock.json", size: 200_000, tokens: 100 }),
      file({ relPath: "yarn.lock", size: 150_000, tokens: 90 }),
      file({ relPath: "src/a.ts", tokens: 10 }),
    ];
    const report = suggestIgnores(files, 200);
    expect(report.suggestions.length).toBeGreaterThan(0);
    expect(report.suggestions[0].pattern).toBe("*.lock");
    expect(report.suggestions[0].tokens).toBe(190);
    expect(report.suggestions[0].files).toBe(2);
  });

  it("respects maxSuggestions", () => {
    const files = [
      file({ relPath: "package-lock.json", size: 200_000, tokens: 100 }),
      file({ relPath: "coverage/lcov.info", size: 150_000, tokens: 90 }),
      file({ relPath: "src/a.ts", tokens: 10 }),
      file({ relPath: "data.csv", size: 100_000, tokens: 80 }),
    ];
    const report = suggestIgnores(files, 280, 2);
    expect(report.suggestions).toHaveLength(2);
  });

  it("computes percent of total correctly", () => {
    const files = [
      file({ relPath: "package-lock.json", size: 200_000, tokens: 60 }),
    ];
    const report = suggestIgnores(files, 100);
    expect(report.percentOfTotal).toBeCloseTo(60, 1);
  });
});
