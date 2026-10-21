import type { FileEntry, IgnoreSuggestion } from "./types.js";

const GENERATED_RE = /\.(generated|gen|g\.dart)\./;
const PB2_RE = /_pb2(_grpc)?\.py$/;
const PB_RE = /\.pb\.(go|cc|h)$/;
const DESIGNER_RE = /\.designer\.(ts|cs)$/;

interface Rule {
  /** gitignore-style pattern to suggest */
  pattern: string;
  /** Human explanation of why it's usually safe to drop */
  reason: string;
  /** Returns true if this file matches the rule */
  test: (relPath: string, size: number) => boolean;
}

function extIn(relPath: string, ...exts: string[]): boolean {
  const base = relPath.split("/").pop() ?? relPath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) {
    return false;
  }
  const ext = base.slice(dot + 1).toLowerCase();
  return exts.includes(ext);
}

function hasDir(relPath: string, dir: string): boolean {
  return relPath.split("/").includes(dir);
}

/** Ordered; first match wins per file so savings never double-count. */
const RULES: readonly Rule[] = [
  {
    pattern: "*.lock",
    reason: "lockfiles are regenerable and rarely worth context",
    test: (p) =>
      p === "package-lock.json" ||
      p === "yarn.lock" ||
      p === "pnpm-lock.yaml" ||
      p === "bun.lockb" ||
      p === "Cargo.lock" ||
      p === "poetry.lock" ||
      p === "composer.lock" ||
      p === "Gemfile.lock" ||
      extIn(p, "lock"),
  },
  {
    pattern: "__snapshots__/",
    reason: "test snapshots are generated output",
    test: (p) => hasDir(p, "__snapshots__") || extIn(p, "snap"),
  },
  {
    pattern: "*.min.js",
    reason: "minified bundles are unreadable to an LLM",
    test: (p) => extIn(p, "min.js", "min.css", "min.mjs", "min.map"),
  },
  {
    pattern: "*.map",
    reason: "sourcemaps are build artifacts",
    test: (p) => extIn(p, "map"),
  },
  {
    pattern: "*.generated.*",
    reason: "generated code is regenerable from a schema or source",
    test: (p) =>
      GENERATED_RE.test(p) ||
      PB2_RE.test(p) ||
      PB_RE.test(p) ||
      DESIGNER_RE.test(p),
  },
  {
    pattern: "vendor/",
    reason: "vendored third-party code is usually not your source of truth",
    test: (p) =>
      hasDir(p, "vendor") ||
      hasDir(p, "third_party") ||
      hasDir(p, "thirdparty"),
  },
  {
    pattern: "coverage/",
    reason: "coverage reports are generated output",
    test: (p) => hasDir(p, "coverage") || extIn(p, "lcov", "cov"),
  },
  {
    pattern: "*.csv",
    reason: "raw tabular data is bulky and rarely needed whole",
    test: (p) => extIn(p, "csv", "tsv"),
  },
  {
    pattern: "*.ndjson",
    reason: "line-delimited data dumps are bulky",
    test: (p) => extIn(p, "ndjson", "jsonl", "geojson"),
  },
  {
    pattern: "*.large.json",
    reason: "very large JSON blobs are rarely worth whole-file context",
    test: (p, size) => extIn(p, "json") && size > 200 * 1024,
  },
  {
    pattern: "*.ipynb",
    reason: "notebooks carry heavy output cells; prefer the .py source",
    test: (p) => extIn(p, "ipynb"),
  },
  {
    pattern: "*.po",
    reason: "translation catalogs are bulky and rarely needed whole",
    test: (p) => extIn(p, "po", "pot", "mo"),
  },
];

export interface IgnoreReport {
  /** Percentage of total scanned tokens the suggestions represent */
  percentOfTotal: number;
  suggestions: IgnoreSuggestion[];
  /** Total tokens that applying every suggestion would free */
  totalSavingsTokens: number;
}

/**
 * Groups scanned files by the first matching heuristic rule and ranks the
 * resulting patterns by token savings.
 */
export function suggestIgnores(
  files: FileEntry[],
  totalTokens: number,
  maxSuggestions = 8
): IgnoreReport {
  const buckets = new Map<string, IgnoreSuggestion>();

  for (const file of files) {
    const rule = RULES.find((r) => r.test(file.relPath, file.size));
    if (!rule) {
      continue;
    }
    const cur = buckets.get(rule.pattern) ?? {
      files: 0,
      pattern: rule.pattern,
      reason: rule.reason,
      tokens: 0,
    };
    cur.tokens += file.tokens;
    cur.files += 1;
    buckets.set(rule.pattern, cur);
  }

  const suggestions = [...buckets.values()]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, maxSuggestions);

  const totalSavingsTokens = suggestions.reduce((s, x) => s + x.tokens, 0);
  const percentOfTotal =
    totalTokens === 0 ? 0 : (totalSavingsTokens / totalTokens) * 100;

  return { percentOfTotal, suggestions, totalSavingsTokens };
}
