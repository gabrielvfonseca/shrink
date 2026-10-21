import { describe, expect, it } from "vitest";
import {
  estimateBudgets,
  extensionOf,
  paretoStat,
  topDirs,
  topExtensions,
  topFiles,
} from "../src/analyze.js";
import type { FileEntry } from "../src/types.js";

const file = (overrides: Partial<FileEntry>): FileEntry => ({
  absPath: "/root/src/a.ts",
  lines: 5,
  relPath: "src/a.ts",
  size: 100,
  tokens: 10,
  ...overrides,
});

describe("extensionOf", () => {
  it("returns lowercased extension", () => {
    expect(extensionOf("src/Foo.TS")).toBe("ts");
  });

  it("returns the basename when there is no dot", () => {
    expect(extensionOf("Makefile")).toBe("makefile");
  });

  it("handles dotfiles", () => {
    expect(extensionOf(".eslintrc.json")).toBe("json");
  });
});

describe("topExtensions", () => {
  it("aggregates tokens by extension sorted desc", () => {
    const files = [
      file({ relPath: "a.ts", tokens: 10 }),
      file({ relPath: "b.ts", tokens: 20 }),
      file({ relPath: "c.js", tokens: 5 }),
    ];
    const result = topExtensions(files, 5);
    expect(result[0].ext).toBe("ts");
    expect(result[0].tokens).toBe(30);
    expect(result[0].count).toBe(2);
    expect(result[1].ext).toBe("js");
    expect(result[1].tokens).toBe(5);
  });

  it("limits to topN", () => {
    const files = [
      file({ relPath: "a.ts", tokens: 1 }),
      file({ relPath: "b.js", tokens: 2 }),
    ];
    expect(topExtensions(files, 1)).toHaveLength(1);
  });
});

describe("topDirs", () => {
  it("aggregates by top-level directory", () => {
    const files = [
      file({ relPath: "src/a.ts", tokens: 10 }),
      file({ relPath: "src/b.ts", tokens: 20 }),
      file({ relPath: "tests/c.ts", tokens: 5 }),
      file({ relPath: "d.ts", tokens: 1 }),
    ];
    const result = topDirs(files, 5);
    expect(result[0].path).toBe("src");
    expect(result[0].tokens).toBe(30);
    expect(result[0].files).toBe(2);
    const root = result.find((d) => d.path === "(root)");
    expect(root?.tokens).toBe(1);
  });
});

describe("topFiles", () => {
  it("returns files sorted by tokens desc", () => {
    const files = [
      file({ relPath: "a.ts", tokens: 1 }),
      file({ relPath: "b.ts", tokens: 5 }),
      file({ relPath: "c.ts", tokens: 3 }),
    ];
    const result = topFiles(files, 2);
    expect(result.map((f) => f.relPath)).toEqual(["b.ts", "c.ts"]);
  });
});

describe("paretoStat", () => {
  it("computes head percentage and 50/80 thresholds", () => {
    const files = [
      file({ relPath: "a.ts", tokens: 50 }),
      file({ relPath: "b.ts", tokens: 30 }),
      file({ relPath: "c.ts", tokens: 20 }),
    ];
    const stat = paretoStat(files, 2);
    expect(stat.topN).toBe(2);
    expect(stat.topNPercent).toBe(80);
    expect(stat.totalTokens).toBe(100);
    expect(stat.totalFiles).toBe(3);
    expect(stat.filesTo50).toBe(1);
    expect(stat.filesTo80).toBe(2);
  });

  it("handles empty input", () => {
    const stat = paretoStat([], 5);
    expect(stat.totalTokens).toBe(0);
    expect(stat.topNPercent).toBe(0);
    expect(stat.filesTo50).toBe(0);
    expect(stat.filesTo80).toBe(0);
  });
});

describe("estimateBudgets", () => {
  it("returns a status per model", () => {
    const budgets = estimateBudgets(100_000);
    expect(budgets.length).toBeGreaterThan(0);
    const claude = budgets.find((b) => b.model === "Claude Opus 4.6");
    expect(claude?.window).toBe(1_000_000);
    expect(claude?.percent).toBeCloseTo(10, 1);
  });
});
