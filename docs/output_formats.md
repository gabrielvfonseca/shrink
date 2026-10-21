# OUTPUT FORMATS

TOKEN-COST PRODUCES THREE OUTPUTS FROM THE SAME SCAN. ALL THREE REPORT THE
SAME NUMBERS.

## TERMINAL REPORT

THE DEFAULT. COLOUR-CODED, PLAIN TEXT, OPTIMISED FOR A TERMINAL.

```
  shrink · /Users/dev/my-repo

  Top 5 files = 61.4% of your context
  12 files = 50% · 31 files = 80%

  Total  184.2k tokens  · 412 files · 793.4KB

  Fits in which context windows?
    Claude Opus 4.6           18.4%  fits
    Claude Haiku 4.5          92.1%  over
    GPT-5.2                   46.1%  fits
    ...

  Top directories
    src/components/           41.2k  ████████████████████  22.4%
    src/services/             27.1k  ███████████░░░░░░░░  14.7%
    ...

  Top files
    src/components/DataGrid.tsx        12.8k  ████████████████████  6.9%
    ...

  Suggested ignores
    *.lock                      34.2k  1 files · lockfiles are regenerable and rarely worth context
    → saving 34.2k tokens (18.5% of context)
```

SECTIONS APPEAR ONLY WHEN THEY HAVE CONTENT — A REPO WITH NO IGNORE
CANDIDATES SIMPLY OMITS THE SUGGESTIONS BLOCK.

## JSON REPORT

`--json` PRINTS A SINGLE JSON OBJECT TO STDOUT. MACHINE-READABLE AND
STABLE FOR SCRIPTS AND CI.

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
  "root": "/Users/dev/my-repo",
  "skipped": { "binary": 12, "empty": 3 },
  "suggestedIgnores": {
    "patterns": [
      {
        "files": 1,
        "pattern": "*.lock",
        "reason": "lockfiles are regenerable and rarely worth context",
        "tokens": 34210
      }
    ],
    "percentOfTotal": 18.5,
    "totalSavingsTokens": 34210
  },
  "topDirs": [],
  "topExtensions": [],
  "topFiles": [],
  "totalFiles": 412,
  "totalSize": 812345,
  "totalTokens": 184233
}
```

THE `SKIPPED` FIELD IS A COUNT PER REASON RATHER THAN A LIST, SO IT STAYS SMALL
ON LARGE REPOSITORIES.

## HTML REPORT

`--html` PRINTS THE REPORT TO STDOUT. `--save-html <file>` WRITES IT TO A
FILE INSTEAD. THE OUTPUT IS A SINGLE SELF-CONTAINED HTML DOCUMENT — NO CDN, NO
EXTERNAL ASSETS, NO ANALYTICS, NO FONT DOWNLOADS. IT WORKS OFFLINE AND FROM A
`FILE://` URL.

SECTIONS:

1. **HEADLINE PANEL** — THE PARETO STATISTICS PLUS A CHIP PER MODEL SHOWING
   FITS, TIGHT, OR OVER
2. **TOKEN COST TREEMAP** — A SQUARIFIED SVG TREEMAP, ONE CELL PER FILE, AREA
   PROPORTIONAL TO TOKEN COUNT, COLOURED BY TOP-LEVEL DIRECTORY, WITH
   HOVER TOOLTIPS AND LABELS ON LARGE ENOUGH CELLS
3. **TOP DIRECTORIES** — A TABLE WITH INLINE SHARE BARS
4. **TOP FILES** — A TABLE WITH INLINE SHARE BARS
5. **SUGGESTED IGNORES** — PATTERN, TOKENS FREED, FILE COUNT, AND RATIONALE

### TREEMAP LIMITS

THE TREEMAP RENDERS THE 180 HEAVIEST FILES INDIVIDUALLY. ANYTHING REMAINING
IS COLLAPSED INTO A SINGLE `(N smaller files)` CELL SO THE LAYOUT STAYS
READABLE AND THE DOCUMENT STAYS SMALL.

CELL LABELS ARE ONLY DRAWN WHEN THE CELL IS LARGE ENOUGH TO FIT THEM, AND
LONG PATHS ARE TRUNCATED TO FIT THE CELL WIDTH. THE FULL PATH IS ALWAYS
AVAILABLE IN THE HOVER TOOLTIP.

## WHY THE HTML REPORT IS SELF-CONTAINED

THE REPORT IS DESIGNED TO BE SCREENSHOT-SHOT AND SHARED. A REPORT THAT
FETCHED A FONT OR A SCRIPT FROM A CDN WOULD RENDER INCOMPLETELY WHEN PASTED
INTO AN ISSUE, A SLACK MESSAGE, OR A CHAT THAT BLOCKS EXTERNAL REQUESTS.

THERE IS NO TELEMETRY AND NO NETWORK ACCESS ANYWHERE IN THE TOOL. FILE
CONTENTS, PATHS, AND TOKEN COUNTS NEVER LEAVE YOUR MACHINE.
