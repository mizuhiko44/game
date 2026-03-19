#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
API_BASE="${BASE_URL%/}/api"
NICKNAME="smoke_$(date +%s)"
TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

json_get() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json, sys
path, expr = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
value = eval(expr, {"__builtins__": {}}, {"data": data})
if value is None:
    sys.exit(1)
print(value)
PY
}

request() {
  local method="$1"
  local url="$2"
  local outfile="$3"
  shift 3
  curl -sS -X "$method" "$url" "$@" > "$outfile"
}

ONBOARD_JSON="$TMP_DIR/onboard.json"
request POST "$API_BASE/users/onboarding" "$ONBOARD_JSON" -H 'Content-Type: application/json' -d "{\"nickname\":\"$NICKNAME\",\"regionCode\":\"tokyo\",\"avatarType\":\"cat\"}"
USER_ID="$(json_get "$ONBOARD_JSON" 'data["id"]')"

LOGIN_JSON="$TMP_DIR/login.json"
request POST "$API_BASE/users/login" "$LOGIN_JSON" -H 'Content-Type: application/json' -d "{\"nickname\":\"$NICKNAME\"}"
json_get "$LOGIN_JSON" 'data["id"]' >/dev/null

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
VOTE_END="$(date -u -d '+8 seconds' +%Y-%m-%dT%H:%M:%SZ)"
RESULT_AT="$(date -u -d '+12 seconds' +%Y-%m-%dT%H:%M:%SZ)"
CREATE_JSON="$TMP_DIR/create.json"
request POST "$API_BASE/admin/events" "$CREATE_JSON" \
  -H 'Content-Type: application/json' \
  -H "x-user-id: $USER_ID" \
  -d "{\"eventType\":\"global\",\"category\":\"sports\",\"title\":\"Smoke Event $NICKNAME\",\"description\":\"api smoke test\",\"startAt\":\"$NOW\",\"voteEndAt\":\"$VOTE_END\",\"resultAt\":\"$RESULT_AT\",\"minBetPoints\":50,\"rewardItemId\":\"itm_exp_small\",\"rewardItemQuantity\":1,\"options\":[\"A\",\"B\"]}"
EVENT_ID="$(json_get "$CREATE_JSON" 'data["id"]')"
OPTION_ID="$(json_get "$CREATE_JSON" 'data["options"][0]["id"]')"

VOTE_JSON="$TMP_DIR/vote.json"
request POST "$API_BASE/votes" "$VOTE_JSON" -H 'Content-Type: application/json' -H "x-user-id: $USER_ID" -d "{\"eventId\":\"$EVENT_ID\",\"optionId\":\"$OPTION_ID\",\"betPoints\":50}"
json_get "$VOTE_JSON" 'data["id"]' >/dev/null

sleep 13

SETTLE_JSON="$TMP_DIR/settle.json"
request POST "$API_BASE/admin/events/settle" "$SETTLE_JSON" -H 'Content-Type: application/json' -H "x-user-id: $USER_ID" -d "{\"eventId\":\"$EVENT_ID\",\"winningOptionId\":\"$OPTION_ID\"}"
json_get "$SETTLE_JSON" 'data["eventStatus"]' >/dev/null

RESULTS_JSON="$TMP_DIR/results.json"
request GET "$API_BASE/results" "$RESULTS_JSON" -H "x-user-id: $USER_ID"
json_get "$RESULTS_JSON" 'data[0]["status"]' >/dev/null

AVATAR_JSON="$TMP_DIR/avatar_level.json"
request POST "$API_BASE/avatar/level-up" "$AVATAR_JSON" -H 'Content-Type: application/json' -H "x-user-id: $USER_ID" -d '{"itemId":"itm_exp_small","quantity":1}'
json_get "$AVATAR_JSON" 'data["avatar"]["level"]' >/dev/null

echo "Smoke API test completed successfully for user $USER_ID"
