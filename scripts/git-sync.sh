#!/usr/bin/env bash
set -euo pipefail

BASE_REMOTE="${1:-origin/main}"
MODE="${SYNC_MODE:-rebase}"

# ensure we are inside a git repo
git rev-parse --is-inside-work-tree >/dev/null

CURRENT="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT" == "main" || "$CURRENT" == "master" ]]; then
  echo "You are on $CURRENT. Checkout a feature branch first."
  exit 1
fi

echo "Fetching latest from origin..."
git fetch origin -q

# stash uncommitted changes so the rebase/merge can proceed
STASHED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -u -k -m "autosync-$(date +%s)" >/dev/null
  STASHED=1
  echo "Stashed your working changes."
fi

if [[ "$MODE" == "merge" ]]; then
  echo "Merging $BASE_REMOTE into $CURRENT..."
  git merge --no-ff "$BASE_REMOTE" || {
    echo "Merge has conflicts. Resolve, then commit."
    exit 2
  }
else
  echo "Rebasing $CURRENT onto $BASE_REMOTE..."
  git rebase "$BASE_REMOTE" || {
    echo "Rebase stopped due to conflicts. Resolve, then run: git rebase --continue"
    exit 2
  }
fi

if [[ $STASHED -eq 1 ]]; then
  echo "Reapplying stashed changes..."
  if ! git stash pop; then
    echo "Stash pop had conflicts. Resolve them, then continue."
    exit 3
  fi
fi

echo "✅ '$CURRENT' is now up to date with ${BASE_REMOTE}."

