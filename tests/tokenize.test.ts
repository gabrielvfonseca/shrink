import { describe, expect, it } from "vitest";
import { countTokens } from "../src/tokenize.js";

describe("countTokens", () => {
  it("returns 0 for empty input", () => {
    expect(countTokens("")).toBe(0);
  });

  it("counts tokens for a simple string", () => {
    expect(countTokens("hello world")).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const a = countTokens("deterministic check");
    const b = countTokens("deterministic check");
    expect(a).toBe(b);
  });

  it("counts more tokens for longer text", () => {
    expect(countTokens("a".repeat(1000))).toBeGreaterThan(
      countTokens("a".repeat(10))
    );
  });
});
