#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import pc from "picocolors";
import { run } from "./run.js";

const HELP = `
${pc.bold("token-cost")} — see which files eat your LLM context window

${pc.bold("Usage")}
  token-cost [path] [options]

${pc.bold("Options")}
  -p, --path <dir>     Directory to scan (default: current directory)
  -t, --top <n>        Number of heaviest files in the headline (default: 5)
      --no-ignore      Ignore .gitignore/.tokenignore; scan everything
      --max-mb <n>     Skip files larger than n MB (default: 5)
      --json           Print machine-readable JSON instead of the report
      --html           Print a standalone HTML treemap report to stdout
      --save-html <f>  Write the HTML treemap report to a file
  -h, --help           Show this help
  -v, --version        Show version

${pc.bold("Examples")}
  token-cost                 # scan current directory
  token-cost ./src           # scan a subdirectory
  token-cost --json          # JSON for scripting/CI
  token-cost --save-html report.html   # screenshot-ready treemap
`;

async function readVersion(): Promise<string> {
  const pkgPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "package.json"
  );
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function fail(message: string): never {
  console.error(pc.red(`error: ${message}`));
  process.exit(1);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    args: process.argv.slice(2),
    options: {
      help: { default: false, short: "h", type: "boolean" },
      html: { default: false, type: "boolean" },
      json: { default: false, type: "boolean" },
      "max-mb": { default: "5", type: "string" },
      "no-ignore": { default: false, type: "boolean" },
      path: { short: "p", type: "string" },
      "save-html": { type: "string" },
      top: { short: "t", type: "string" },
      version: { default: false, short: "v", type: "boolean" },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }
  if (values.version) {
    console.log(await readVersion());
    return;
  }

  const root = values.path ?? positionals[0] ?? ".";

  const topNRaw = values.top ?? "5";
  const topN = Number.parseInt(topNRaw, 10);
  if (!Number.isFinite(topN) || topN < 1) {
    fail(`--top must be a positive integer, got "${topNRaw}"`);
  }

  const maxMbRaw = values["max-mb"] ?? "5";
  const maxMb = Number.parseFloat(maxMbRaw);
  if (!Number.isFinite(maxMb) || maxMb <= 0) {
    fail(`--max-mb must be a positive number, got "${maxMbRaw}"`);
  }

  const stat = await fs.stat(root).catch(() => null);
  if (!stat) {
    fail(`path not found: ${root}`);
  }
  if (!stat.isDirectory()) {
    fail(`not a directory: ${root}`);
  }

  const result = await run({
    maxBytes: Math.round(maxMb * 1024 * 1024),
    root,
    topN,
    useIgnoreFiles: !values["no-ignore"],
  });

  if (values.json) {
    console.log(result.json);
    return;
  }
  if (values.html) {
    console.log(result.html);
    return;
  }

  if (values["save-html"]) {
    const outPath = path.resolve(values["save-html"]);
    await fs.writeFile(outPath, result.html, "utf8");
    console.error(pc.dim(`wrote ${outPath}`));
  }

  console.log(result.terminal);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  fail(message);
});
