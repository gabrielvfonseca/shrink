---
description: Measure the token cost of this repo and explain what is eating the context window
argument-hint: [path]
allowed-tools: Bash(node bin/index.js:*), Bash(npx shrink:*), Read, Grep
---

Run the shrink scanner against `$ARGUMENTS` (default: the current directory)
and report what it finds.

**Step 1 — scan.** Run:

```sh
node bin/index.js --json $ARGUMENTS
```

If the path argument is empty, use `.`.

**Step 2 — report.** Summarise the result for the user, in this order:

1. **The headline.** Total tokens, file count, and the Pareto line — "top N files
   = X% of your context". Lead with this; it is the answer.
2. **The heavy hitters.** The top 5 files with their token counts and share.
3. **The concentration.** Which directories hold the most tokens, and how many
   files it takes to reach 50% and 80%.
4. **The budget.** Which model context windows the repo fits inside, and which
   it exceeds. Call out any model where it goes over.
5. **The ignores.** The suggested ignore patterns, the tokens each would free,
   and the total. If a pattern would free a meaningful share, show the exact
   line to add to `.tokenignore`.

**Step 3 — recommend.** Conclude with the single highest-leverage change. If
adding the suggested ignore patterns would materially shrink the context, say
so and show the `.tokenignore` snippet. If the repo is already lean, say that
plainly rather than inventing work.

**Rules.**

- Never invent numbers. Every figure comes from the JSON output.
- Do not read the repository's source files unless a specific number needs
  explaining.
- Do not add or edit ignore files without asking first.
- Keep the summary under 20 lines. Lead with the headline, not with method.
