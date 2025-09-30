#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-origin/main}"
git fetch origin -q
# left = commits only in BASE, right = only in HEAD
read BEHIND AHEAD < <(git rev-list --left-right --count "$BASE"...HEAD)
echo "$BEHIND"

