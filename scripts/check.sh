#!/usr/bin/env bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Checking scaffold routes..."
echo "BASE_URL=$BASE_URL"
echo "--------------------------------"

check() {
  local route=$1
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")

  if [ "$status" = "200" ]; then
    echo "OK $route → $status"
  else
    echo "FAIL $route → $status"
    exit 1
  fi
}

check "/"
check "/prototype"

SLUGS=$(node -e "
const fs = require('fs');
const src = fs.readFileSync('src/lib/prototypes.ts', 'utf8');
const slugs = [...src.matchAll(/slug:\s*\"([^\"]+)\"/g)].map(m => m[1]);
console.log(slugs.join(' '));
")

for slug in $SLUGS; do
  check "/prototype/$slug"
done

echo "--------------------------------"
echo "Scaffold route check complete"
