#!/bin/bash
# Smoke test for commit flow and conflict detection

API_URL="http://localhost:3000/api"
# Use the JWT from your environment or login
if [ -z "$JWT" ]; then
  echo "Please set JWT environment variable"
  exit 1
fi

REPO_NAME="smoke-test-repo-$(date +%s)"
GIT_URL="https://github.com/octocat/Hello-World.git" # Public repo for testing clone

echo "1. Creating repo..."
REPO_ID=$(curl -s -X POST "$API_URL/repos" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"gitUrl\": \"$GIT_URL\", \"name\": \"$REPO_NAME\"}" | jq -r '.repo.id')

if [ "$REPO_ID" == "null" ]; then
  echo "Failed to create repo"
  exit 1
fi
echo "Repo ID: $REPO_ID"

FILE_PATH="test-file-$(date +%s).txt"
CONTENT_V1="Version 1"

echo "2. Creating file (Commit V1)..."
# No parentSha needed for creation
RESP=$(curl -s -X POST "$API_URL/repos/$REPO_ID/commit" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"$FILE_PATH\", \"content\": \"$CONTENT_V1\", \"message\": \"Create file\", \"dryRun\": false}")

SHA_V1=$(echo $RESP | jq -r '.result.content.sha')
echo "Created file. SHA: $SHA_V1"

if [ "$SHA_V1" == "null" ]; then
  echo "Failed to create file"
  echo $RESP
  exit 1
fi

echo "3. Updating file (Commit V2) with correct SHA..."
CONTENT_V2="Version 2"
RESP=$(curl -s -X POST "$API_URL/repos/$REPO_ID/commit" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"$FILE_PATH\", \"content\": \"$CONTENT_V2\", \"message\": \"Update file V2\", \"dryRun\": false, \"parentSha\": \"$SHA_V1\"}")

SHA_V2=$(echo $RESP | jq -r '.result.content.sha')
echo "Updated file. New SHA: $SHA_V2"

if [ "$SHA_V2" == "null" ]; then
  echo "Failed to update file"
  echo $RESP
  exit 1
fi

echo "4. Attempting conflict (Update with OLD SHA)..."
CONTENT_CONFLICT="Conflict Attempt"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/repos/$REPO_ID/commit" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"$FILE_PATH\", \"content\": \"$CONTENT_CONFLICT\", \"message\": \"Conflict update\", \"dryRun\": false, \"parentSha\": \"$SHA_V1\"}")

if [ "$HTTP_CODE" == "409" ]; then
  echo "SUCCESS: Got 409 Conflict as expected."
else
  echo "FAILURE: Expected 409, got $HTTP_CODE"
  exit 1
fi

echo "5. Force update (No SHA)..."
RESP=$(curl -s -X POST "$API_URL/repos/$REPO_ID/commit" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"$FILE_PATH\", \"content\": \"$CONTENT_CONFLICT\", \"message\": \"Force update\", \"dryRun\": false}")

SHA_V3=$(echo $RESP | jq -r '.result.content.sha')
echo "Force updated. New SHA: $SHA_V3"

if [ "$SHA_V3" == "null" ]; then
  echo "Failed to force update"
  echo $RESP
  exit 1
fi

echo "Smoke test passed!"

