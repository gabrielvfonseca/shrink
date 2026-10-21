---
name: shrink-report
description: "Generate HTML/JSON reports from shrink. Use when: (1) creating a shareable treemap report, (2) exporting JSON for CI/dashboards, (3) visualizing context cost per file and directory, (4) user mentions 'report', 'treemap', 'html', 'json output'."
---

# shrink report

Generate reports from a shrink scan.

## HTML treemap

```bash
shrink --save-html report.html   # write to file
shrink --html > report.html      # stdout
```

Squarified treemap of token cost per file and directory. Screenshot-ready.

## JSON

```bash
shrink --json | jq '.pareto.topNPercent'
shrink --json > report.json
```

Machine-readable output for scripting, CI gates, dashboards.

## Fields

- totalTokens, fileCount, totalBytes
- pareto.topNPercent, pareto.filesFor50, pareto.filesFor80
- files[]: path, tokens, bytes, pct
- ignoreSuggestions[]
- budget: { window, usagePct, status }
