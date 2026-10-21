---
name: shrink-analyze
description: "Analyze context cost hotspots and ignore suggestions. Use when: (1) identifying which files/directories dominate context, (2) deciding what to add to .tokenignore, (3) reducing repo context cost, (4) user mentions 'hotspot', 'optimize', 'reduce tokens', 'ignore'."
---

# shrink analyze

Analyze context cost hotspots and act on ignore suggestions.

## Workflow

1. Run `shrink` to get the Pareto headline and top files.
2. Review ignore suggestions (large generated/lock/data files).
3. Add suggested patterns to `.tokenignore` (one glob per line).
4. Re-run `shrink` to verify reduction.

## .tokenignore

Same syntax as .gitignore. Patterns exclude files from scanning.

## Tips

- Lock files, generated code, and large JSON often dominate — ignore them.
- Use `--no-ignore` to see the unfiltered total before deciding.
- Target the top 5-10 files first; they usually account for 30-50% of cost.
