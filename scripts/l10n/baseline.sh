#!/usr/bin/env bash
# Rebuild the English copy baseline from a PRISTINE checkout of the Production
# commit this branch started from, with the current inventory rules. The
# baseline must never be generated from the branch's own (already wrapped)
# files, or the before/after comparison would compare the code with itself.
#   bash scripts/l10n/baseline.sh            → localize/baseline/inventory-en.json
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
base="$(git merge-base HEAD origin/Production)"
tmp="$(mktemp -d)"
trap 'git -C "$repo" worktree remove --force "$tmp/wt" >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT
git -C "$repo" worktree add --detach "$tmp/wt" "$base" >/dev/null 2>&1
( cd "$tmp/wt" && npx --prefix "$repo" tsx "$repo/scripts/l10n/literal-inventory.mts" --out "$repo/localize/baseline/inventory-en.json" ) | grep TOTAL
echo "baseline from Production $base"
