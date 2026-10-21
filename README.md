# Shrink

> See what actually eats your LLM context window.

Point shrink at a repository and it tells you which files are responsible,
how many tokens they cost, and what you can safely ignore. It produces a
terminal report, a machine-readable JSON report, and a self-contained HTML
report with a squarified treemap of token cost per file and directory.

[![CI](https://github.com/gabrielvfonseca/shrink/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielvfonseca/shrink/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/shrink.svg)](https://www.npmjs.com/package/shrink)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why

Developers feeding codebases to LLMs have no idea what is eating their context
window. You paste files until the model complains, guess at what to include, and
hope for the best. shrink gives you the answer in one command.

It counts tokens with a real BPE tokenizer — not a character estimate — and
aggregates them by file and directory, so the areas in the treemap reflect what
your model will actually see.

## Install

Run directly with npx — no install needed:

```sh
npx shrink
```

Or install globally:

```sh
npm install -g shrink
```

Requires Node.js 20 or newer.

## Quick start

Scan the current directory:

```sh
npx shrink
```

Scan a subdirectory:

```sh
npx shrink ./src
```

The headline tells you the Pareto shape of your repo — how many files hold
most of the tokens:

```
  shrink · /Users/dev/my-repo

  Top 5 files = 61.4% of your context
  12 files = 50% · 31 files = 80%

  Total  184.2k tokens  · 412 files · 793.4KB
```

If that number is high, your context window is spending most of its budget on a
handful of files. The **Suggested ignores** section tells you which ones you can
drop.

## Output modes

### Terminal report (default)

Colour-coded, plain text, optimised for a terminal. Sections appear only when
they have content.

### HTML report

A single self-contained HTML document — no CDN, no external assets, no
analytics, no font downloads. Works offline and from a `file://` URL. Ideal for
a README, issue, or Slack post.

```sh
npx shrink --save-html report.html
```

Includes an interactive squarified treemap (one cell per file, area proportional
to token count, coloured by top-level directory, with hover tooltips and labels on
cells large enough to fit them), tables of the heaviest files and directories
with inline share bars, per-model budget status, and the suggested ignore
patterns.

### JSON report

Machine-readable and stable for scripts and CI:

```sh
npx shrink --json
```

```json
{
  "budgets": [
    { "model": "Claude Opus 4.6", "percent": 18.4, "window": 1000000 }
  ],
  "pareto": {
    "filesTo50": 12,
    "filesTo80": 31,
    "topN": 5,
    "topNPercent": 61.4,
    "totalFiles": 412,
    "totalTokens": 184233
  },
  "totalTokens": 184233,
  "totalFiles": 412,
  "suggestedIgnores": {
    "totalSavingsTokens": 34210,
    "percentOfTotal": 18.5,
    "patterns": [ ... ]
  }
}
```

## Flags

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--path <dir>` | `-p` | `.` | Directory to scan |
| `--top <n>` | `-t` | `5` | Number of heaviest files in the headline |
| `--no-ignore` | — | off | Ignore `.gitignore` / `.tokenignore` and scan everything |
| `--max-mb <n>` | — | `5` | Skip files larger than n megabytes |
| `--json` | — | off | Print machine-readable JSON instead of the report |
| `--html` | — | off | Print the standalone HTML report to stdout |
| `--save-html <file>` | — | — | Write the HTML report to a file |
| `--help` | `-h` | — | Show help |
| `--version` | `-v` | — | Show the installed version |

## How it works

### Scanning

The scanner walks the directory tree and applies three layers of filtering:

1. **Built-in noise denylist** — `node_modules/`, `dist/`, `build/`, lockfiles,
   minified assets, sourcemaps, binaries, images, fonts, archives. Applied
   regardless of any ignore file.
2. **Ignore files** — `.gitignore`, `.tokenignore`, and `.ignore`, read at the
   scan root and in every subdirectory, matching git semantics.
3. **File-level guards** — oversized, empty, binary, symlink, and unreadable
   files are skipped and counted, never aborting the scan.

`--no-ignore` skips layer 2 but keeps layers 1 and 3.

### Token counting

Counts use the `o200k_base` BPE encoding from `js-tiktoken` — the same family
used by the GPT-4o generation.

- Exact for OpenAI models that use `o200k_base`
- A solid offline approximation for Claude, Gemini, and others — typically
  within about 10%
- Fully offline — no network calls, no API keys, no telemetry

The encoder is lazily constructed once and cached for the process lifetime.

### Ignore suggestions

The report proposes patterns for files that were scanned but probably should not
be in an agent's context — lockfiles, test snapshots, sourcemaps, generated
code, vendored directories, coverage reports, large CSV and NDJSON dumps, large
JSON blobs, notebook output cells, and translation catalogs.

Each suggestion shows the pattern, the tokens it would free, the number of files
it matches, and why it is usually safe to drop. Savings never double-count:
each file is matched by the first rule that applies.

To apply a suggestion, add the pattern to `.tokenignore` and rescan.

## Privacy

shrink runs entirely on your machine.

- No network calls, no telemetry, no data collection
- File contents, paths, and token counts never leave your machine
- The HTML report is self-contained — no CDN, no analytics, no tracking pixels
- The only dependencies are `js-tiktoken`, `ignore`, and `picocolors`

If you are counting tokens for a proprietary codebase, this is the only option
that does not involve pasting code into a web tool.

## Library use

The package exports its internals for programmatic use:

```ts
import { run, scan, countTokens } from "shrink";

const result = await run({
  root: ".",
  topN: 5,
  useIgnoreFiles: true,
  maxBytes: 5 * 1024 * 1024,
});
console.log(result.totalTokens);
```

## Development

```sh
git clone https://github.com/gabrielvfonseca/shrink.git
cd shrink
npm install
```

`npm install` runs the `prepare` script, which installs the Husky hooks and
compiles `src/` into `dist/`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Recompile on change |
| `npm run typecheck` | Type check without emitting |
| `npm run lint` | Biome lint and format check |
| `npm run format` | Apply Biome formatting |
| `npm test` | Run the Vitest suite |
| `npm run check:lint` | Ultracite check |
| `npm run check:fix` | Ultracite fix (applies safe fixes) |
| `npm run changeset` | Create a changeset |
| `npm run changeset:version` | Apply changesets and bump the version |
| `npm run changeset:publish` | Publish to npm |

### Testing

Tests live in `tests/` and run under Vitest. The suite covers tokenization, the
treemap layout, the analysis aggregates, the ignore suggestions, model
formatting, and the scanner's ignore handling against a real temporary
directory.

### Linting and formatting

Biome is the linter and formatter, on top of the Ultracite preset:

```json
{
  "extends": ["ultracite/biome/core", "ultracite/biome/vitest"]
}
```

A Husky pre-commit hook runs `lint-staged`, which formats and lints staged
files automatically. Genuine lint errors block the commit; style issues are
fixed in place.

### Releasing

Versioning is automated with Changesets. Never edit `package.json`'s `version`
field by hand.

1. `npm run changeset` — choose a bump type and write a summary
2. Merge to `main` — the release workflow opens a "Version Packages" pull
   request
3. Merge that pull request — the publish step runs `changeset publish` against
   npm using the `NPM_TOKEN` repository secret

## Documentation

Full documentation lives in `docs/`:

- `docs/getting_started.md` — install and first run
- `docs/command_line_interface.md` — every flag and output mode
- `docs/tokenization.md` — how tokens are counted
- `docs/ignore_handling.md` — what gets excluded and how to control it
- `docs/output_formats.md` — terminal, JSON, and HTML structure
- `docs/architecture.md` — module map and design decisions
- `docs/development.md` — setup, testing, and releasing

## Contributing

Issues and pull requests are welcome. The pull request template in
`.github/PULL_REQUEST_TEMPLATE.md` lists the verification checklist. For any
user-facing change, add a changeset with `npm run changeset`.

## License

[MIT](LICENSE.md) © Gabriel Fonseca
