---
description: Run the test suite, typecheck, and lint together and diagnose failures
allowed-tools: Bash(npm test:*), Bash(npm run typecheck), Bash(npm run lint), Bash(npx vitest:*), Read, Edit, Grep
---

Run the full verification suite and fix anything that fails.

**Step 1 — run everything.**

```sh
npm run typecheck && npm run lint && npm test
```

Run them in that order. A type error often explains a lint error, and both
often explain a test failure — fixing them bottom-up avoids chasing
symptoms.

**Step 2 — diagnose.** For each failure:

- **Type error** — read the reported type and the source. Fix the type, do not
  cast it away with `any`, `as unknown`, or `@ts-ignore`.
- **Lint error** — check whether it is auto-fixable. Run `npm run check:fix`
  for the safe fixes, then hand-fix what remains. If a rule genuinely does not
  fit this codebase, disable it for that specific rule in `biome.json` rather
  than for the whole file, and say why.
- **Test failure** — read the test and the code it exercises. Fix the code, not
  the assertion, unless the assertion is wrong. If the test is correct and the
  behaviour is correct, the test is stale — update it.

**Step 3 — re-run** the failing step, then the full suite.

**Step 4 — report.** State what failed, what you changed, and the final result
of all three commands. If something could not be fixed, say exactly what is
blocking it and what you tried.

**Rules.**

- Never delete or skip a test to make the suite green. `.skip` and `.only` are
  blocked by the lint rules anyway.
- Never weaken a type assertion to silence the compiler.
- If a fix changes user-facing behaviour, flag that a changeset is needed.
