import { MODELS } from "./models.js";
import type {
  BudgetStatus,
  DirStat,
  ExtStat,
  FileEntry,
  ParetoStat,
} from "./types.js";

export function extensionOf(relPath: string): string {
  const base = relPath.split("/").pop() ?? relPath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) {
    return base.toLowerCase();
  }
  return base.slice(dot + 1).toLowerCase();
}

export function topExtensions(files: FileEntry[], topN: number): ExtStat[] {
  const acc = new Map<string, ExtStat>();
  for (const f of files) {
    const ext = extensionOf(f.relPath);
    const cur = acc.get(ext) ?? { count: 0, ext, tokens: 0 };
    cur.count += 1;
    cur.tokens += f.tokens;
    acc.set(ext, cur);
  }
  return [...acc.values()].sort((a, b) => b.tokens - a.tokens).slice(0, topN);
}

/** Aggregates tokens by top-level directory (or "(root)" for loose files). */
export function topDirs(files: FileEntry[], topN: number): DirStat[] {
  const acc = new Map<string, DirStat>();
  for (const f of files) {
    const slash = f.relPath.indexOf("/");
    const key = slash === -1 ? "(root)" : f.relPath.slice(0, slash);
    const cur = acc.get(key) ?? { files: 0, path: key, tokens: 0 };
    cur.tokens += f.tokens;
    cur.files += 1;
    acc.set(key, cur);
  }
  return [...acc.values()].sort((a, b) => b.tokens - a.tokens).slice(0, topN);
}

export function topFiles(files: FileEntry[], topN: number): FileEntry[] {
  return [...files].sort((a, b) => b.tokens - a.tokens).slice(0, topN);
}

/**
 * Computes the Pareto headline: how many files account for the top N%
 * of tokens, plus the counts needed to reach 50% and 80%.
 */
export function paretoStat(files: FileEntry[], topN: number): ParetoStat {
  const sorted = [...files].sort((a, b) => b.tokens - a.tokens);
  const totalTokens = sorted.reduce((sum, f) => sum + f.tokens, 0);
  const head = sorted.slice(0, topN);
  const headTokens = head.reduce((sum, f) => sum + f.tokens, 0);
  const topNPercent = totalTokens === 0 ? 0 : (headTokens / totalTokens) * 100;

  let cumulative = 0;
  let filesTo50 = 0;
  let filesTo80 = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    cumulative += sorted[i].tokens;
    const pct = totalTokens === 0 ? 0 : (cumulative / totalTokens) * 100;
    if (filesTo50 === 0 && pct >= 50) {
      filesTo50 = i + 1;
    }
    if (filesTo80 === 0 && pct >= 80) {
      filesTo80 = i + 1;
    }
  }

  return {
    filesTo50,
    filesTo80,
    topN,
    topNPercent,
    totalFiles: sorted.length,
    totalTokens,
  };
}

export function estimateBudgets(totalTokens: number): BudgetStatus[] {
  return MODELS.map((m) => ({
    model: m.label,
    percent:
      m.contextWindow === null || m.contextWindow === 0
        ? null
        : (totalTokens / m.contextWindow) * 100,
    window: m.contextWindow,
  }));
}
