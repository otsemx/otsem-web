#!/usr/bin/env bash
# Verifies that package-lock.json is staged when package.json changes.
# Prevents deploying with a stale lock file (which breaks npm ci in Docker).

set -euo pipefail

staged_files=$(git diff --cached --name-only)

# If package.json is staged, package-lock.json must also be staged
if echo "$staged_files" | grep -q '^package\.json$'; then
  if ! echo "$staged_files" | grep -q '^package-lock\.json$'; then
    echo ""
    echo "ERROR: package.json was modified but package-lock.json was not staged."
    echo ""
    echo "Run the following commands:"
    echo ""
    echo "  npm install"
    echo "  git add package-lock.json"
    echo ""
    exit 1
  fi
fi
