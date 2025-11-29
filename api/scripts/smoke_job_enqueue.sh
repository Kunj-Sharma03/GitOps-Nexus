#!/usr/bin/env bash
# Usage: JWT=<jwt> REPO_ID=<repoId> API_URL=http://localhost:3000/api ./api/scripts/smoke_job_enqueue.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
JWT="${JWT:-}"
REPO_ID="${REPO_ID:-}"

if [ -z "$JWT" ] || [ -z "$REPO_ID" ]; then
  echo "Usage: JWT=<jwt> REPO_ID=<repoId> API_URL=http://localhost:3000/api $0"
  exit 2
fi

COMMAND="echo hello && sleep 1 && echo done"

echo "Enqueueing CI job for repo $REPO_ID"
resp=$(curl -s -w "\n%{http_code}" -X POST "${API_URL%/}/repos/$REPO_ID/jobs" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d "{\"command\": \"$COMMAND\"}")
http=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')

echo "Status: $http"
echo "$body"
if [ "$http" != "201" ]; then
  echo "Failed to enqueue job"
  exit 3
fi

JOB_ID=$(echo "$body" | sed -n 's/.*"jobId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -z "$JOB_ID" ]; then
  # fallback parse simple JSON
  JOB_ID=$(echo "$body" | sed -n 's/.*jobId[^0-9a-zA-Z_-]*\([0-9a-zA-Z_-]*\).*/\1/p')
fi

echo "Enqueued job: $JOB_ID"
echo "Polling job status (press Ctrl+C to stop)"
while true; do
  stat=$(curl -s -H "Authorization: Bearer $JWT" "${API_URL%/}/jobs/$JOB_ID")
  echo "$stat"
  if echo "$stat" | grep -q 'SUCCESS\|FAILED\|CANCELLED\|TIMEOUT'; then
    echo "Final status reached"
    exit 0
  fi
  sleep 1
done
