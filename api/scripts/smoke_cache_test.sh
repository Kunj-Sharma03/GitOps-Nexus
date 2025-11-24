#!/usr/bin/env bash
# Smoke test script for cache flows
# Usage: FILE=./smoke_cache_test.sh JWT=<jwt> REPO_ID=<id> API_URL=http://localhost:3000 bash ./api/scripts/smoke_cache_test.sh

API_URL=${API_URL:-http://localhost:3000}
# Default JWT/REPO_ID provided for convenience; override by setting env vars when running.
JWT=${JWT:-'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'}
REPO_ID=${REPO_ID:-'cmi4gjou50002geac3cupstjd'}
BRANCH=${BRANCH:-main}
FILE_PATH=${FILE_PATH:-README.md}

if ! command -v jq >/dev/null 2>&1; then
  echo "Please install 'jq' to run this script (e.g. apt install jq or brew install jq)"
  exit 1
fi

hdr=( -H "Authorization: Bearer $JWT" -H "Accept: application/json" )

echo "Starting smoke cache test against $API_URL for repo $REPO_ID"

echo "\n1) GET /files (first - expect miss)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/files?branch=$BRANCH" | jq '.files | length'

echo "\n2) GET /files (second - expect cached)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/files?branch=$BRANCH" | jq '.files | length'

echo "\n3) GET /file-content (explicit file - first - expect miss)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/file-content?path=$FILE_PATH&branch=$BRANCH" | jq '.path'

echo "\n4) GET /file-content (explicit file - second - expect cached)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/file-content?path=$FILE_PATH&branch=$BRANCH" | jq '.path'

echo "\n5) GET /file-content (no path - README discovery - first - expect miss)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/file-content" | jq '.path'

echo "\n6) GET /file-content (no path - README discovery - second - expect cached)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/file-content" | jq '.path'

echo "\n7) POST /refresh-cache (invalidate)"
http_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST ${hdr[@]} "$API_URL/api/repos/$REPO_ID/refresh-cache")
echo "status=$http_status"

echo "\n8) After refresh, GET /files (expect miss)"
time curl -s ${hdr[@]} "$API_URL/api/repos/$REPO_ID/files?branch=$BRANCH" | jq '.files | length'

echo "\nSmoke test complete"
