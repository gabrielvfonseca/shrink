---
name: shrink-scan
description: "Run the shrink CLI to measure token/context cost of a repository. Use when: (1) scanning a repo to see which files eat the LLM context window, (2) measuring total tokens, file counts, Pareto headline, (3) comparing subdirectories, (4) user mentions 'shrink', 'token cost', 'context window', 'how much context'."
---

# shrink scan

CLI tool that counts tokens per file in a repo and reports total context cost.

## Commands

```bash
shrink                    # scan current directory
shrink ./src              # scan subdirectory
shrink --json             # machine-readable JSON for scripting/CI
shrink --top 3            # top 3 heaviest files in headline
shrink --no-ignore         # scan everything (ignore .gitignore/.tokenignore)
shrink --max-mb 1         # skip files larger than 1MB (default 5)
shrink --save-html report.html  # write HTML treemap report to file
shrink --html             # print standalone HTML treemap to stdout
```

## Output

- Total tokens, file count, total size
- Pareto headline (top N% files = X% of tokens)
- Top heaviest files
- Context window fit table (Claude, GPT, Gemini, Llama, Mistral)
- Ignore suggestions (files that could be excluded)

## Key concepts

- Respects .gitignore and .tokenignore by default
- Uses cl100k_base tokenizer (GPT-4/Claude-compatible approximation)
- Skips binary files and files > max-mb (default 5MB)
