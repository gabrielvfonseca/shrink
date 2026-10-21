import { promises as fs } from "node:fs";
import path from "node:path";
import {
  estimateBudgets,
  paretoStat,
  topDirs,
  topExtensions,
  topFiles,
} from "./analyze.js";
import { renderHtml } from "./report/html.js";
import { renderTerminal } from "./report/terminal.js";
import { scan } from "./scan.js";
import { suggestIgnores } from "./suggest.js";
import { countTokens } from "./tokenize.js";
import type { FileEntry, SkipRecord } from "./types.js";

export interface RunOptions {
  maxBytes: number;
  root: string;
  topN: number;
  useIgnoreFiles: boolean;
}

export interface RunResult {
  html: string;
  json: string;
  terminal: string;
  totalTokens: number;
}

const DEFAULT_TOP_N = 5;

export async function run(options: RunOptions): Promise<RunResult> {
  const root = path.resolve(options.root);
  const topN = options.topN > 0 ? options.topN : DEFAULT_TOP_N;

  const { files: scanned, skipped } = await scan(root, {
    maxBytes: options.maxBytes,
    useIgnoreFiles: options.useIgnoreFiles,
  });

  const contents = await Promise.all(scanned.map((s) => readUtf8(s.absPath)));
  const entries: FileEntry[] = [];
  for (let i = 0; i < scanned.length; i += 1) {
    const content = contents[i];
    if (content === null) {
      continue;
    }
    const s = scanned[i];
    const tokens = countTokens(content);
    const lines = countLines(content);
    entries.push({
      absPath: s.absPath,
      lines,
      relPath: s.relPath,
      size: s.size,
      tokens,
    });
  }

  const totalTokens = entries.reduce((sum, e) => sum + e.tokens, 0);
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  const pareto = paretoStat(entries, topN);
  const dirs = topDirs(entries, 10);
  const exts = topExtensions(entries, 10);
  const heavyFiles = topFiles(entries, topN === 5 ? 10 : topN);
  const ignoreReport = suggestIgnores(entries, totalTokens);
  const budgets = estimateBudgets(totalTokens);

  const terminal = renderTerminal({
    budgets,
    files: entries,
    pareto,
    percentOfTotal: ignoreReport.percentOfTotal,
    root,
    skippedCount: skipped.length,
    suggestions: ignoreReport.suggestions,
    topDirs: dirs,
    topFiles: heavyFiles,
    totalSavingsTokens: ignoreReport.totalSavingsTokens,
    totalSize,
    totalTokens,
  });

  const html = renderHtml({
    budgets,
    pareto,
    percentOfTotal: ignoreReport.percentOfTotal,
    root,
    skippedCount: skipped.length,
    suggestions: ignoreReport.suggestions,
    topDirs: dirs,
    topFiles: heavyFiles,
    totalSavingsTokens: ignoreReport.totalSavingsTokens,
    totalSize,
    totalTokens,
    treemapFiles: entries,
  });

  const json = JSON.stringify(
    {
      budgets: budgets.map((b) => ({
        model: b.model,
        percent: b.percent === null ? null : Math.round(b.percent * 10) / 10,
        window: b.window,
      })),
      pareto,
      root,
      skipped: summariseSkipped(skipped),
      suggestedIgnores: {
        patterns: ignoreReport.suggestions,
        percentOfTotal: ignoreReport.percentOfTotal,
        totalSavingsTokens: ignoreReport.totalSavingsTokens,
      },
      topDirs: dirs,
      topExtensions: exts,
      topFiles: heavyFiles.map((f) => ({
        bytes: f.size,
        lines: f.lines,
        path: f.relPath,
        tokens: f.tokens,
      })),
      totalFiles: entries.length,
      totalSize,
      totalTokens,
    },
    null,
    2
  );

  return { html, json, terminal, totalTokens };
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  let n = 1;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      n += 1;
    }
  }
  return n;
}

async function readUtf8(absPath: string): Promise<string | null> {
  try {
    return await fs.readFile(absPath, "utf8");
  } catch {
    return null;
  }
}

function summariseSkipped(skipped: SkipRecord[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const s of skipped) {
    acc[s.reason] = (acc[s.reason] ?? 0) + 1;
  }
  return acc;
}
