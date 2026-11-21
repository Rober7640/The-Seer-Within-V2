#!/usr/bin/env bash
# Gate G1 render check: English pages on this branch render the SAME HTML as on
# the commit the branch started from. Serves each tree with vite in turn on the
# same port, snapshots, compares.
#   scripts/l10n/en-snapshot.sh [base branch]   (default origin/development, where
#   l10n work now lands; pass origin/Production for a Production-based branch)
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
base="$(git merge-base HEAD "${1:-origin/development}")"
runs="$repo/localize/runs"; mkdir -p "$runs"
tmp="$(mktemp -d)"
cleanup() { [ -n "${vpid:-}" ] && kill "$vpid" 2>/dev/null || true; git -C "$repo" worktree remove --force "$tmp/wt" >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT
git -C "$repo" worktree add --detach "$tmp/wt" "$base" >/dev/null 2>&1
ln -s "$repo/node_modules" "$tmp/wt/node_modules"
snap() { # dir out
  ( cd "$1" && exec npx vite dev --port 5199 --strictPort ) > "$runs/vite-$(basename "$2" .json).log" 2>&1 &
  vpid=$!
  for _ in $(seq 1 60); do curl -s -o /dev/null http://localhost:5199/fb && break; sleep 1; done
  node "$repo/scripts/l10n/en-snapshot.mjs" --base http://localhost:5199 --out "$2"
  kill "$vpid"; wait "$vpid" 2>/dev/null || true; vpid=""
}
snap "$tmp/wt" "$runs/snap-base.json"
snap "$repo" "$runs/snap-branch.json"
node "$repo/scripts/l10n/en-snapshot.mjs" --compare "$runs/snap-base.json" "$runs/snap-branch.json"
