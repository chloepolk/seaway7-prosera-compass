#!/usr/bin/env bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🔎 Checking scaffold routes..."
echo "BASE_URL=$BASE_URL"
echo "--------------------------------"

check() {
  local route=$1
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")

  if [ "$status" = "200" ]; then
    echo "✅ $route → $status"
  else
    echo "❌ $route → $status"
    exit 1
  fi
}

check "/"
check "/prototype"

# Extract prototype slugs from registry
SLUGS=$(node -e "
const { PROTOTYPES } = require('./dist/lib/prototypes.js');
console.log(PROTOTYPES.map(p => p.slug).join(' '));
" 2>/dev/null || true)

# Fallback for dev mode (ts-node not compiled)
if [ -z \"$SLUGS\" ]; then
  SLUGS=$(grep -o 'slug: \"[^\"]*\"' src/lib/prototypes.ts | cut -d '\"' -f2)
fi

for slug in $SLUGS; do
  check \"/prototype/$slug\"
done

echo \"--------------------------------\"
echo \"✔ Scaffold route check complete\"
