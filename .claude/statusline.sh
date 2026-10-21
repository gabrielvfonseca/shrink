#!/usr/bin/env bash
# Claude Code status line for shrink.
#
# Renders: model | git branch | repo token cost
#
# The token count is cached for a minute so the status line stays responsive on
# large repositories. Every failure path degrades to plain text — the status
# line must never break the CLI.
set -uo pipefail

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cache_dir="${TMPDIR:-/tmp}/shrink-statusline"
cache_file="$cache_dir/cost.txt"
cache_ttl=60

# Extract a field from JSON on stdin. $1 is a JS expression evaluated with the
# parsed object bound to `j`. Prints nothing on any error.
json_get() {
  node -e '
    let d = "";
    process.stdin.on("data", (c) => { d += c; });
    process.stdin.on("end", () => {
      try {
        const j = JSON.parse(d);
        const v = eval(process.argv[1]);
        if (v !== undefined && v !== null) process.stdout.write(String(v));
      } catch { /* ignore */ }
    });
  ' "$1" 2>/dev/null || true
}

model="$(cat 2>/dev/null | json_get 'j.model && (j.model.display_name || j.model.id) || ""')"
branch="$(git -C "$project_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

cost=""
now="$(date +%s)"

if [ -f "$cache_file" ]; then
  mtime="$(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null || echo 0)"
  if [ "$now" -lt $((mtime + cache_ttl)) ]; then
    cost="$(cat "$cache_file" 2>/dev/null || true)"
  fi
fi

if [ -z "$cost" ]; then
  cost="$(node "$project_dir/bin/index.js" --json "$project_dir" 2>/dev/null |
    json_get '((j.totalTokens || 0) / 1000).toFixed(1) + "k tk"')"
  if [ -n "$cost" ]; then
    mkdir -p "$cache_dir" 2>/dev/null || true
    printf '%s' "$cost" >"$cache_file" 2>/dev/null || true
  fi
fi

printf '%s | %s | %s\n' "${model:-claude}" "${branch:-detached}" "${cost:-—}"
