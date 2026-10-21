import pc from "picocolors";
import { fmtBytes, fmtPct, fmtTokens } from "../models.js";
import type {
  BudgetStatus,
  DirStat,
  FileEntry,
  IgnoreSuggestion,
  ParetoStat,
} from "../types.js";

const ANSI_ESC = String.fromCharCode(27);
const ansiRegex = new RegExp(`${ANSI_ESC}\\[[0-9;]*m`, "g");

function bar(fraction: number, width = 20): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(clamped * width);
  return pc.green("█".repeat(filled)) + pc.dim("░".repeat(width - filled));
}

function visibleWidth(s: string): number {
  return s.replace(ansiRegex, "").length;
}

function padRight(s: string, n: number): string {
  const pad = Math.max(0, n - visibleWidth(s));
  return s + " ".repeat(pad);
}

function padLeft(s: string, n: number): string {
  const pad = Math.max(0, n - visibleWidth(s));
  return " ".repeat(pad) + s;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) {
    return s;
  }
  return `${s.slice(0, Math.max(0, n - 1))}…`;
}

export interface TerminalInput {
  budgets: BudgetStatus[];
  files: FileEntry[];
  pareto: ParetoStat;
  percentOfTotal: number;
  root: string;
  skippedCount: number;
  suggestions: IgnoreSuggestion[];
  topDirs: DirStat[];
  topFiles: FileEntry[];
  totalSavingsTokens: number;
  totalSize: number;
  totalTokens: number;
}

function pctOf(input: TerminalInput, n: number): string {
  return input.totalTokens === 0
    ? "0.0%"
    : fmtPct((n / input.totalTokens) * 100);
}

function budgetStatus(b: BudgetStatus): string {
  if (b.percent === null) {
    return pc.dim("unknown");
  }
  if (b.percent <= 50) {
    return pc.green("fits");
  }
  if (b.percent <= 80) {
    return pc.yellow("tight");
  }
  return pc.red("over");
}

function budgetPct(b: BudgetStatus): string {
  if (b.percent === null) {
    return pc.dim("n/a");
  }
  return padLeft(fmtPct(b.percent), 7);
}

function renderBudgets(input: TerminalInput): string[] {
  const lines: string[] = [];
  lines.push(`  ${pc.bold("Fits in which context windows?")}`);
  for (const b of input.budgets) {
    lines.push(
      `    ${padRight(b.model, 22)} ${budgetPct(b)}  ${budgetStatus(b)}`
    );
  }
  lines.push("");
  return lines;
}

function renderTopDirs(input: TerminalInput): string[] {
  const lines: string[] = [];
  if (input.topDirs.length === 0) {
    return lines;
  }
  lines.push(`  ${pc.bold("Top directories")}`);
  const maxDir = input.topDirs[0].tokens;
  for (const d of input.topDirs) {
    const frac = maxDir === 0 ? 0 : d.tokens / maxDir;
    lines.push(
      `    ${padRight(truncate(d.path, 28), 28)} ${padLeft(
        fmtTokens(d.tokens),
        7
      )}  ${bar(frac)}  ${pc.dim(pctOf(input, d.tokens))}`
    );
  }
  lines.push("");
  return lines;
}

function renderTopFiles(input: TerminalInput): string[] {
  const lines: string[] = [];
  if (input.topFiles.length === 0) {
    return lines;
  }
  lines.push(`  ${pc.bold("Top files")}`);
  const maxFile = input.topFiles[0].tokens;
  for (const f of input.topFiles) {
    const frac = maxFile === 0 ? 0 : f.tokens / maxFile;
    lines.push(
      `    ${padRight(truncate(f.relPath, 40), 40)} ${padLeft(
        fmtTokens(f.tokens),
        7
      )}  ${bar(frac)}  ${pc.dim(pctOf(input, f.tokens))}`
    );
  }
  lines.push("");
  return lines;
}

function renderSuggestions(input: TerminalInput): string[] {
  const lines: string[] = [];
  if (input.suggestions.length === 0) {
    return lines;
  }
  lines.push(`  ${pc.bold("Suggested ignores")}`);
  for (const s of input.suggestions) {
    lines.push(
      `    ${pc.yellow(padRight(s.pattern, 20))} ${padLeft(
        fmtTokens(s.tokens),
        7
      )}  ${pc.dim(`${s.files} files · ${s.reason}`)}`
    );
  }
  lines.push(
    `    ${pc.dim("→")} saving ${pc.bold(
      fmtTokens(input.totalSavingsTokens)
    )} tokens (${fmtPct(input.percentOfTotal)} of context)`
  );
  lines.push("");
  return lines;
}

function renderSkipped(input: TerminalInput): string[] {
  const lines: string[] = [];
  if (input.skippedCount <= 0) {
    return lines;
  }
  lines.push(
    `  ${pc.dim(`Skipped ${input.skippedCount} files (binary/ignored/oversize)`)}`
  );
  lines.push("");
  return lines;
}

export function renderTerminal(input: TerminalInput): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${pc.bold("shrink")} ${pc.dim("·")} ${pc.cyan(input.root)}`);
  lines.push("");

  // Headline
  const headline = `Top ${input.pareto.topN} files = ${pc.bold(
    fmtPct(input.pareto.topNPercent)
  )} of your context`;
  lines.push(`  ${headline}`);
  lines.push(
    `  ${pc.dim(
      `${input.pareto.filesTo50} files = 50% · ${input.pareto.filesTo80} files = 80%`
    )}`
  );
  lines.push("");

  // Totals
  lines.push(
    `  ${pc.dim("Total")}  ${pc.bold(fmtTokens(input.totalTokens))} tokens  ${pc.dim(
      `· ${input.files.length} files · ${fmtBytes(input.totalSize)}`
    )}`
  );
  lines.push("");

  lines.push(...renderBudgets(input));
  lines.push(...renderTopDirs(input));
  lines.push(...renderTopFiles(input));
  lines.push(...renderSuggestions(input));
  lines.push(...renderSkipped(input));

  return lines.join("\n");
}
