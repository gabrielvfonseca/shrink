import { describe, expect, it } from "vitest";
import { placedArea, squarify } from "../src/treemap.js";

describe("squarify", () => {
  it("returns empty for no items", () => {
    expect(squarify([], { h: 100, w: 100, x: 0, y: 0 })).toEqual([]);
  });

  it("returns empty for non-positive values", () => {
    expect(
      squarify(
        [
          { data: "a", value: 0 },
          { data: "b", value: -1 },
        ],
        { h: 100, w: 100, x: 0, y: 0 }
      )
    ).toEqual([]);
  });

  it("places a single item across the full rect", () => {
    const placed = squarify([{ data: "a", value: 10 }], {
      h: 100,
      w: 100,
      x: 0,
      y: 0,
    });
    expect(placed).toHaveLength(1);
    expect(placed[0].x).toBe(0);
    expect(placed[0].y).toBe(0);
    expect(placed[0].w).toBe(100);
    expect(placed[0].h).toBe(100);
  });

  it("covers the full area with multiple items", () => {
    const placed = squarify(
      [
        { data: "a", value: 3 },
        { data: "b", value: 2 },
        { data: "c", value: 1 },
      ],
      { h: 100, w: 100, x: 0, y: 0 }
    );
    expect(placedArea(placed)).toBeCloseTo(100 * 100, 0);
    expect(placed.map((p) => p.data)).toEqual(["a", "b", "c"]);
  });

  it("sorts by descending value", () => {
    const placed = squarify(
      [
        { data: "small", value: 1 },
        { data: "large", value: 10 },
        { data: "mid", value: 5 },
      ],
      { h: 100, w: 100, x: 0, y: 0 }
    );
    expect(placed.map((p) => p.data)).toEqual(["large", "mid", "small"]);
  });

  it("handles zero-size rect", () => {
    expect(
      squarify([{ data: "a", value: 1 }], { h: 100, w: 0, x: 0, y: 0 })
    ).toEqual([]);
    expect(
      squarify([{ data: "a", value: 1 }], { h: 0, w: 100, x: 0, y: 0 })
    ).toEqual([]);
  });
});
