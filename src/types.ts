export interface FileEntry {
  absPath: string;
  lines: number;
  /** Path relative to scan root, posix-style */
  relPath: string;
  size: number;
  tokens: number;
}

export interface SkipRecord {
  reason: "symlink" | "too-large" | "empty" | "unreadable" | "binary";
  relPath: string;
  size?: number;
}

export interface ExtStat {
  count: number;
  ext: string;
  tokens: number;
}

export interface ParetoStat {
  /** How many files it takes to reach 50% of tokens */
  filesTo50: number;
  /** How many files it takes to reach 80% of tokens */
  filesTo80: number;
  /** Number of heaviest files in the headline (e.g. 5) */
  topN: number;
  /** Combined % of total tokens held by those topN files */
  topNPercent: number;
  totalFiles: number;
  totalTokens: number;
}

export interface IgnoreSuggestion {
  files: number;
  pattern: string;
  reason: string;
  tokens: number;
}

export interface BudgetStatus {
  model: string;
  /** null when window is unknown */
  percent: number | null;
  /** null when the context window is unknown/model-dependent */
  window: number | null;
}

export interface DirStat {
  files: number;
  path: string;
  tokens: number;
}
