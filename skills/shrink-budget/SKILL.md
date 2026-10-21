---
name: shrink-budget
description: "Use shrink in CI to enforce context budgets. Use when: (1) adding a CI gate on context size, (2) failing builds that exceed a token budget, (3) tracking context cost over time, (4) user mentions 'budget', 'CI', 'gate', 'limit'."
---

# shrink budget

Enforce context budgets in CI.

## CI gate example

```bash
shrink --json | jq -e '.totalTokens < 100000' || exit 1
```

## GitHub Actions

```yaml
- run: npx shrink --json > report.json
- run: node -e "const r=require('./report.json'); if(r.totalTokens>100000) process.exit(1)"
```

## Tracking

Commit `report.json` or upload as artifact to track context cost over time.
