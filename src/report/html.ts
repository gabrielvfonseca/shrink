import { fmtBytes, fmtPct, fmtTokens } from "../models.js";
import type { PlacedItem } from "../treemap.js";
import { squarify } from "../treemap.js";
import type {
  BudgetStatus,
  DirStat,
  FileEntry,
  IgnoreSuggestion,
  ParetoStat,
} from "../types.js";

export interface HtmlInput {
  budgets: BudgetStatus[];
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
  /** Up to N files for the treemap; rest collapse into an "(other)" cell. */
  treemapFiles: FileEntry[];
}

const VIEW_W = 1000;
const VIEW_H = 640;
const PAD = 2;
const LABEL_MIN_W = 70;
const LABEL_MIN_H = 34;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Deterministic pleasant hue from a string. */
function hueFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) % 360;
  }
  return h;
}

function topDirOf(relPath: string): string {
  const slash = relPath.indexOf("/");
  return slash === -1 ? "(root)" : relPath.slice(0, slash);
}

function renderTreemap(files: FileEntry[]): string {
  const byTokens = [...files].sort((a, b) => b.tokens - a.tokens);
  const keep = byTokens.slice(0, 180);
  const rest = byTokens.slice(180);

  const items = keep.map((f) => ({
    data: { dir: topDirOf(f.relPath), label: f.relPath, tokens: f.tokens },
    value: f.tokens,
  }));

  const restTokens = rest.reduce((s, f) => s + f.tokens, 0);
  if (restTokens > 0) {
    items.push({
      data: {
        dir: "(other)",
        label: `(${rest.length} smaller files)`,
        tokens: restTokens,
      },
      value: restTokens,
    });
  }

  const placed: PlacedItem<{ label: string; tokens: number; dir: string }>[] =
    squarify(items, { h: VIEW_H, w: VIEW_W, x: 0, y: 0 });

  const total = items.reduce((s, it) => s + it.value, 0);

  const rects = placed
    .map((p) => {
      const x = p.x + PAD / 2;
      const y = p.y + PAD / 2;
      const w = Math.max(0, p.w - PAD);
      const h = Math.max(0, p.h - PAD);
      const hue = hueFor(p.data.dir);
      const fill = `hsl(${hue} 55% 45%)`;
      const pct = total === 0 ? 0 : (p.data.tokens / total) * 100;
      const title = `${p.data.label}\n${fmtTokens(p.data.tokens)} tokens · ${fmtPct(pct)}`;
      const showLabel = w >= LABEL_MIN_W && h >= LABEL_MIN_H;
      const label = showLabel
        ? `<text x="${x + 8}" y="${y + 18}" class="tm-name">${escapeHtml(
            truncateLabel(p.data.label, w)
          )}</text>
           <text x="${x + 8}" y="${y + 34}" class="tm-tok">${fmtTokens(
             p.data.tokens
           )} · ${fmtPct(pct)}</text>`
        : "";
      return `<g><title>${escapeHtml(title)}</title><rect x="${round(x)}" y="${round(
        y
      )}" width="${round(w)}" height="${round(h)}" rx="4" fill="${fill}"/>${label}</g>`;
    })
    .join("\n");

  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" class="treemap" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Token cost treemap">${rects}</svg>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function truncateLabel(label: string, width: number): string {
  const maxChars = Math.floor(width / 7);
  if (label.length <= maxChars) {
    return label;
  }
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`;
}

function budgetChip(b: BudgetStatus): string {
  if (b.percent === null) {
    return `<span class="chip"><span class="chip-model">${escapeHtml(
      b.model
    )}</span><span class="chip-val muted">n/a</span></span>`;
  }
  const { cls, label } = budgetClassAndLabel(b.percent);
  return `<span class="chip ${cls}"><span class="chip-model">${escapeHtml(
    b.model
  )}</span><span class="chip-val">${fmtPct(b.percent)} ${label}</span></span>`;
}

function budgetClassAndLabel(percent: number): { cls: string; label: string } {
  if (percent <= 50) {
    return { cls: "ok", label: "fits" };
  }
  if (percent <= 80) {
    return { cls: "warn", label: "tight" };
  }
  return { cls: "bad", label: "over" };
}

function fileRow(f: FileEntry, total: number): string {
  const pct = total === 0 ? 0 : (f.tokens / total) * 100;
  const width = Math.max(1, Math.min(100, pct));
  return `<tr>
    <td class="path">${escapeHtml(f.relPath)}</td>
    <td class="num">${fmtTokens(f.tokens)}</td>
    <td class="num muted">${fmtBytes(f.size)}</td>
    <td class="bar-cell"><div class="bar" style="width:${width}%"></div></td>
    <td class="num muted">${fmtPct(pct)}</td>
  </tr>`;
}

function dirRow(d: DirStat, total: number): string {
  const pct = total === 0 ? 0 : (d.tokens / total) * 100;
  const width = Math.max(1, Math.min(100, pct));
  return `<tr>
    <td class="path">${escapeHtml(d.path)}</td>
    <td class="num">${d.files}</td>
    <td class="num">${fmtTokens(d.tokens)}</td>
    <td class="bar-cell"><div class="bar dir" style="width:${width}%"></div></td>
    <td class="num muted">${fmtPct(pct)}</td>
  </tr>`;
}

export function renderHtml(input: HtmlInput): string {
  const { pareto, totalTokens } = input;
  const budgets = input.budgets
    .filter((b) => b.window !== null)
    .slice(0, 6)
    .map(budgetChip)
    .join("\n");

  const fileRows = input.topFiles
    .map((f) => fileRow(f, totalTokens))
    .join("\n");
  const dirRows = input.topDirs.map((d) => dirRow(d, totalTokens)).join("\n");

  const sugRows = input.suggestions
    .map(
      (s) => `<tr>
      <td><code>${escapeHtml(s.pattern)}</code></td>
      <td class="num">${fmtTokens(s.tokens)}</td>
      <td class="num muted">${s.files}</td>
      <td class="muted">${escapeHtml(s.reason)}</td>
    </tr>`
    )
    .join("\n");

  const savingsLine =
    input.suggestions.length > 0
      ? `<p class="savings">Ignoring these would free <strong>${fmtTokens(
          input.totalSavingsTokens
        )}</strong> tokens (<strong>${fmtPct(
          input.percentOfTotal
        )}</strong> of your context).</p>`
      : `<p class="savings muted">No obvious ignore candidates found.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>token-cost — ${escapeHtml(input.root)}</title>
<style>
  :root {
    --bg: #0d1117; --panel: #161b22; --border: #30363d;
    --fg: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
    --ok: #3fb950; --warn: #d29922; --bad: #f85149;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font: 14px/1.5 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 32px;
  }
  .wrap { max-width: 1080px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h1 .root { color: var(--muted); font-weight: 400; }
  h2 { font-size: 15px; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  .headline {
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    padding: 18px 20px; margin: 18px 0;
  }
  .headline .big { font-size: 26px; font-weight: 700; }
  .headline .big em { color: var(--accent); font-style: normal; }
  .headline .sub { color: var(--muted); margin-top: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px;
    font-size: 12px;
  }
  .chip.ok { border-color: var(--ok); } .chip.ok .chip-val { color: var(--ok); }
  .chip.warn { border-color: var(--warn); } .chip.warn .chip-val { color: var(--warn); }
  .chip.bad { border-color: var(--bad); } .chip.bad .chip-val { color: var(--bad); }
  .chip-model { color: var(--muted); }
  .treemap {
    width: 100%; height: auto; background: var(--panel);
    border: 1px solid var(--border); border-radius: 10px;
  }
  .tm-name { fill: #fff; font-size: 13px; font-weight: 600; }
  .tm-tok { fill: rgba(255,255,255,.85); font-size: 11px; }
  table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 7px 12px; border-bottom: 1px solid var(--border); }
  th { font-size: 12px; color: var(--muted); font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  td.path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .muted { color: var(--muted); }
  .bar-cell { width: 30%; }
  .bar { height: 8px; border-radius: 4px; background: var(--accent); min-width: 2px; }
  .bar.dir { background: #a371f7; }
  code { background: #21262d; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  .savings { margin: 10px 0 0; }
  .foot { color: var(--muted); font-size: 12px; margin-top: 32px; }
  .foot code { color: var(--fg); }
</style>
</head>
<body>
<div class="wrap">
  <h1>token-cost <span class="root">— ${escapeHtml(input.root)}</span></h1>

  <div class="headline">
    <div class="big">Top <em>${pareto.topN} files</em> = <em>${fmtPct(
      pareto.topNPercent
    )}</em> of your context</div>
    <div class="sub">${pareto.filesTo50} files = 50% · ${pareto.filesTo80} files = 80% · ${
      pareto.totalFiles
    } files · ${fmtTokens(totalTokens)} tokens · ${fmtBytes(input.totalSize)}</div>
    <div class="chips">
      ${budgets}
    </div>
  </div>

  <h2>Token cost treemap</h2>
  ${renderTreemap(input.treemapFiles)}

  <h2>Top directories</h2>
  <table>
    <thead><tr><th>Directory</th><th class="num">Files</th><th class="num">Tokens</th><th></th><th class="num">Share</th></tr></thead>
    <tbody>${dirRows}</tbody>
  </table>

  <h2>Top files</h2>
  <table>
    <thead><tr><th>File</th><th class="num">Tokens</th><th class="num">Size</th><th></th><th class="num">Share</th></tr></thead>
    <tbody>${fileRows}</tbody>
  </table>

  <h2>Suggested ignores</h2>
  ${savingsLine}
  ${
    sugRows
      ? `<table>
    <thead><tr><th>Pattern</th><th class="num">Tokens</th><th class="num">Files</th><th>Why</th></tr></thead>
    <tbody>${sugRows}</tbody>
  </table>`
      : ""
  }

  <p class="foot">Counts use the <code>o200k_base</code> tokenizer (offline, exact for GPT-4o family; solid approximation for Claude/Gemini). ${
    input.skippedCount > 0
      ? `${input.skippedCount} files skipped as binary/ignored/oversize.`
      : ""
  } Regenerate with <code>npx token-cost</code>.</p>
</div>
</body>
</html>`;
}
