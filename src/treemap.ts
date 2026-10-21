export interface Rect {
  h: number;
  w: number;
  x: number;
  y: number;
}

export interface TreemapItem<T> {
  data: T;
  value: number;
}

export interface PlacedItem<T> extends Rect {
  data: T;
}

/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk).
 * Produces rectangles with aspect ratios close to 1 for readable cells.
 *
 * Values <= 0 are dropped. Returns placed rects in the same relative
 * positions as a stable sort of the input by descending value.
 */
export function squarify<T>(
  items: readonly TreemapItem<T>[],
  rect: Rect
): PlacedItem<T>[] {
  const positive = items.filter((it) => it.value > 0);
  if (positive.length === 0) {
    return [];
  }
  if (rect.w <= 0 || rect.h <= 0) {
    return [];
  }

  const sorted = [...positive].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, it) => s + it.value, 0);
  if (total <= 0) {
    return [];
  }

  const out: PlacedItem<T>[] = [];
  let free: Rect = { ...rect };
  let index = 0;

  while (index < sorted.length) {
    const side = Math.min(free.w, free.h);

    // Greedily grow the row while the aspect ratio keeps improving.
    const extent = rowExtent(sorted, index, side);
    const row = sorted.slice(index, index + extent.count);
    const rowSum = extent.sum;

    // Lay the row along the shorter side of the free rectangle.
    const rowArea = (rowSum / total) * (rect.w * rect.h);
    if (free.w >= free.h) {
      const stripW = rowArea / free.h;
      let { y } = free;
      for (const item of row) {
        const h = (item.value / rowSum) * free.h;
        out.push({ data: item.data, h, w: stripW, x: free.x, y });
        y += h;
      }
      free = { h: free.h, w: free.w - stripW, x: free.x + stripW, y: free.y };
    } else {
      const stripH = rowArea / free.w;
      let { x } = free;
      for (const item of row) {
        const w = (item.value / rowSum) * free.w;
        out.push({ data: item.data, h: stripH, w, x, y: free.y });
        x += w;
      }
      free = { h: free.h - stripH, w: free.w, x: free.x, y: free.y + stripH };
    }

    index += extent.count;
  }

  return out;
}

/**
 * Greedily grows a row starting at `start` while the worst aspect ratio
 * keeps improving. Returns the number of items to include and their sum.
 */
function rowExtent<T>(
  sorted: readonly TreemapItem<T>[],
  start: number,
  side: number
): { count: number; sum: number } {
  let count = 0;
  let sum = 0;
  let bestRatio = Number.POSITIVE_INFINITY;
  let i = start;

  while (i < sorted.length) {
    const { value } = sorted[i];
    const nextSum = sum + value;
    const ratio = worstRatioFor(sum, nextSum, value, side, i === start);
    const improved = i === start || ratio <= bestRatio;
    if (!improved) {
      return { count, sum };
    }
    count += 1;
    sum = nextSum;
    bestRatio = ratio;
    i += 1;
  }
  return { count, sum };
}

/**
 * Aspect-ratio cost of a row whose current sum is `rowSum`, after adding a
 * single item of `value` to reach `nextSum`. Lower is better.
 */
function worstRatioFor(
  rowSum: number,
  nextSum: number,
  value: number,
  side: number,
  isFirst: boolean
): number {
  if (side <= 0 || nextSum <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (isFirst) {
    // A single item: ratio is just how square its own rect is.
    const area = (value / nextSum) * (side * side);
    const w = Math.sqrt(area);
    const h = area / w;
    return Math.max(w / h, h / w);
  }
  const s2 = nextSum * nextSum;
  const side2 = side * side;
  const max = Math.max(rowSum, value);
  const min = Math.min(rowSum, value);
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
}

/** Total area covered by placed items (for validating layout). */
export function placedArea(placed: readonly Rect[]): number {
  return placed.reduce((s, r) => s + r.w * r.h, 0);
}
