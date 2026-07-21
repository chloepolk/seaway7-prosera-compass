#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEMO_DIR="src/app/prototype/prosera-ui-kit/demos"

if [[ ! -d "$DEMO_DIR" ]]; then
  echo "FAIL: Demo directory missing: $DEMO_DIR"
  exit 1
fi

allowed_prefixes=(
  "react"
  "next-themes"
  "sonner"
  "@radix-ui/"
  "@/components/ui/"
  "@/components/prosera-lib/"
  "@/lib/utils"
  "./"
  "../"
)

disallowed=0
while IFS= read -r -d '' file; do
  while IFS= read -r line; do
    module=$(echo "$line" | sed -n 's/^import[^"]*"\(.*\)".*/\1/p')
    if [[ -z "$module" ]]; then
      continue
    fi
    ok=false
    for prefix in "${allowed_prefixes[@]}"; do
      if [[ "$module" == "$prefix"* ]]; then
        ok=true
        break
      fi
    done
    if [[ "$ok" == false ]]; then
      echo "FAIL: disallowed import \"$module\" in $file"
      disallowed=1
    fi
  done < <(grep '^import' "$file")
done < <(find "$DEMO_DIR" -name "*.demo.tsx" -print0)

if [[ $disallowed -ne 0 ]]; then
  echo "Guard failed: restrict demo imports to approved primitives."
  exit 1
fi

echo "OK: primitives-only guard passed."
