#!/bin/bash

# Quick commit script - makes committing easier
# Usage: ./commit.sh "feat: add login endpoint"

if [ -z "$1" ]; then
  echo "❌ Error: Commit message required"
  echo "Usage: ./commit.sh \"feat: your commit message\""
  exit 1
fi

git add .
git commit -m "$1"
git push

echo "✅ Committed and pushed: $1"
