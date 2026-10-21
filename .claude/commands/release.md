---
description: Prepare a release — changeset, version bump, changelog, publish
allowed-tools: Bash(npm run:*), Bash(npx changeset:*), Bash(git status), Bash(git diff:*), Bash(git log:*), Read, Edit, Grep
---

Walk through the Changesets release flow for this repository.

**Step 1 — review what changed.** Run `git log --oneline main..HEAD` and
`git status`. If the working tree has uncommitted changes, stop and say so —
do not release from a dirty tree.

**Step 2 — classify the changes.** For each commit, decide the bump type:

- `patch` — bug fixes, internal refactors, docs
- `minor` — new features, new flags, new output
- `major` — breaking changes to the CLI, the JSON schema, or the library API

**Step 3 — write the changeset.** Run `npm run changeset` is interactive, so
write the file directly instead:

```sh
npx changeset add --empty
```

then replace the generated file's contents with a properly formed changeset:

```markdown
---
"shrink": minor
---

Describe the user-facing change in one sentence, in the past tense.
```

Create one changeset per logical change, not one per commit. Use the `minor`
or `major` bump only if the release contains at least one such change; a
release with only fixes is a `patch`.

**Step 4 — verify the version bump.** Run:

```sh
npx changeset status
```

Confirm the bump type is the one you intended before continuing.

**Step 5 — report.** Show the user the changeset file(s) you wrote and the
resulting version bump. Then tell them the remaining steps, which are run by
the release workflow when the PR is merged:

- `npm run changeset:version` — applies the changesets and regenerates
  `CHANGELOG.md`
- `npm run changeset:publish` — publishes to npm

**Do not** run `npm run changeset:version` or `npm run changeset:publish`
yourself. Both are CI-driven, and publishing is irreversible.

**Rules.**

- The summary is for a human reading a changelog. No commit hashes, no
  file paths, no implementation detail.
- Never publish without the user explicitly asking.
- If a commit needs a version bump but is ambiguous, describe both options and
  let the user choose.
