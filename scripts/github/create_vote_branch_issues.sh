#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <owner/repo>" >&2
  exit 1
fi

REPO="$1"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "error: set GITHUB_TOKEN before running this script" >&2
  exit 2
fi

python3 scripts/github/sync_vote_issues.py --repo "$REPO" --update
