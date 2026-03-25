#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <owner/repo>" >&2
  exit 1
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "error: GH_TOKEN is required" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required" >&2
  exit 3
fi

REPO="$1"
SPEC_PATH="docs/issues/vote-branch-priority-issues.json"

python3 - <<'PY' "$SPEC_PATH" | while IFS=$'\t' read -r title labels body; do
import json, sys
spec_path = sys.argv[1]
with open(spec_path, encoding='utf-8') as f:
    specs = json.load(f)
for row in specs:
    title = row["title"].replace("\t", " ").replace("\n", " ")
    labels = ",".join(row.get("labels", []))
    body = row["body"].replace("\t", " ")
    print(f"{title}\t{labels}\t{body}")
PY
  # 既存タイトルがあればスキップ
  if gh issue list --repo "$REPO" --state open --search "$title in:title" --json title --jq ".[] | select(.title == \"$title\") | .title" | grep -Fxq "$title"; then
    echo "exists: $title"
    continue
  fi

  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels"
  echo "created: $title"
done
