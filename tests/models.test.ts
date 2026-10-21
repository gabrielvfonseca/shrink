import { describe, expect, it } from "vitest";
import { findModel, fmtBytes, fmtPct, fmtTokens } from "../src/models.js";

describe("fmtTokens", () => {
  it("formats small numbers plainly", () => {
    expect(fmtTokens(42)).toBe("42");
  });

  it("formats thousands with k", () => {
    expect(fmtTokens(1500)).toBe("1.5k");
  });

  it("formats millions with m", () => {
    expect(fmtTokens(2_500_000)).toBe("2.50M");
  });
});

describe("fmtBytes", () => {
  it("formats bytes", () => {
    expect(fmtBytes(42)).toBe("42B");
  });

  it("formats kilobytes", () => {
    expect(fmtBytes(2048)).toBe("2.0KB");
  });

  it("formats megabytes", () => {
    expect(fmtBytes(2_097_152)).toBe("2.0MB");
  });
});

describe("fmtPct", () => {
  it("formats with one decimal", () => {
    expect(fmtPct(33.333)).toBe("33.3%");
  });
});

describe("findModel", () => {
  it("finds by id", () => {
    const m = findModel("gpt-5.2");
    expect(m?.label).toBe("GPT-5.2");
    expect(m?.contextWindow).toBe(400_000);
  });

  it("finds by label case-insensitive", () => {
    const m = findModel("CLAUDE SONNET 4.6");
    expect(m?.id).toBe("claude-sonnet-4.6");
  });

  it("returns undefined for unknown", () => {
    expect(findModel("nope")).toBeUndefined();
  });
});
