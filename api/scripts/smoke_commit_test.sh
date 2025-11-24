#!/usr/bin/env bash
# Consolidated smoke-commit test for local API
# Usage: JWT=<jwt> REPO_ID=<repoId> [BRANCH=branch] API_URL=http://localhost:3000/api ./api/scripts/smoke_commit_test.sh

set -euo pipefail

# Defaults
API_URL="${API_URL:-http://localhost:3000/api}"
JWT="${JWT:-}"
REPO_ID="${REPO_ID:-}"
BRANCH="${BRANCH:-main}"

usage() {
  echo "Usage: JWT=<jwt> REPO_ID=<repoId> [BRANCH=branch] API_URL=http://localhost:3000/api $0"
  echo "Example: JWT=ey... REPO_ID=cmi4gjou50002geac3cupstjd BRANCH=feature/test $0"
}

if [ -z "$JWT" ] || [ -z "$REPO_ID" ]; then
  usage
  exit 2
fi

TS=$(date +%s)
FILE_PATH="smoke-tests/marker-${TS}.txt"
CONTENT="Smoke test marker created at $(date -u)"

echo "Running smoke commit test against $API_URL for repo $REPO_ID (branch: $BRANCH)"

# Headers
hdr=( -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" )

# Build JSON body. Prefer jq if available, otherwise fall back to python for safe escaping.
if command -v jq >/dev/null 2>&1; then
  body=$(jq -n --arg path "$FILE_PATH" --arg content "$CONTENT" --arg branch "$BRANCH" --arg message "smoke test: create marker $TS" '{path: $path, content: $content, branch: $branch, message: $message}')
else
  # Export variables so the python subprocess can read them from the environment
  export FILE_PATH CONTENT BRANCH TS
  # Use python to json-encode the content safely (fallback when jq not available)
  body=$(python - <<'PY'
import os, json
payload = {
    'path': os.environ.get('FILE_PATH'),
    'content': os.environ.get('CONTENT'),
    'branch': os.environ.get('BRANCH'),
    'message': f"smoke test: create marker {os.environ.get('TS')}"
}
print(json.dumps(payload))
PY
  )
fi

echo "Posting commit for $FILE_PATH"
resp=$(curl -s -w "\n%{http_code}" -X POST "${API_URL%/}/repos/$REPO_ID/commit" ${hdr[@]} -d "$body")
http=$(echo "$resp" | tail -n1)
resp_body=$(echo "$resp" | sed '$d')

echo "Commit response status: $http"
if command -v jq >/dev/null 2>&1; then
  echo "$resp_body" | jq . || echo "$resp_body"
else
  echo "$resp_body"
fi

if [ "$http" != "200" ] && [ "$http" != "201" ] && [ "$http" != "204" ]; then
  echo "Commit failed (status $http)"
  exit 3
fi

echo "Verifying file-content lookup for $FILE_PATH"
# URL-encode the path
if command -v python >/dev/null 2>&1; then
  ENC=$(python -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=''))" "$FILE_PATH")
else
  # Minimal fallback for url-encoding (not fully RFC-compliant)
  ENC=$(printf '%s' "$FILE_PATH" | sed -e 's/ /%20/g')
fi
# Parse args: support optional --dry-run flag
DRY_RUN=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      # stop parsing; remaining args expected as env overrides
      break
      ;;
  esac
done


fetch_resp=$(curl -s -w "\n%{http_code}" ${hdr[@]} "${API_URL%/}/repos/$REPO_ID/file-content?path=$ENC&branch=$BRANCH")
fetch_http=$(echo "$fetch_resp" | tail -n1)
fetch_body=$(echo "$fetch_resp" | sed '$d')

echo "File fetch status: $fetch_http"
if command -v jq >/dev/null 2>&1; then
  echo "$fetch_body" | jq . || echo "$fetch_body"
else
  echo "$fetch_body"
fi

if [ "$fetch_http" != "200" ]; then
  echo "Failed to fetch file content (status $fetch_http)"
  exit 4
fi

# Compare content if possible
if command -v jq >/dev/null 2>&1; then
  got=$(echo "$fetch_body" | jq -r '.content // empty')
  if [ "$got" = "$CONTENT" ]; then
    echo "Smoke commit verification succeeded. File content matches."
    exit 0
  else
    echo "Verification failed; expected '$CONTENT' but got: '$got'"
    exit 5
if [ "$DRY_RUN" -eq 1 ]; then
  echo "DRY RUN: would POST to ${API_URL%/}/repos/$REPO_ID/commit"
  echo "Payload: $body"
  exit 0
fi

if command -v jq >/dev/null 2>&1; then
else
  echo "Note: jq not available to verify content automatically. Inspect the fetch output above."
  exit 0
fi

