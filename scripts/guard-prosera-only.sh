#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCAN_DIRS=(
  "src/app/prototype/silver-state"
  "src/app/prototype/prosera-compass"
  "src/app/login"
)

fail=0
for dir in "${SCAN_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  while IFS= read -r -d '' file; do
    while IFS= read -r line; do
      [[ "$line" =~ ^import ]] || continue
      if echo "$line" | grep -qE '@/components/ui/'; then
        if ! echo "$line" | grep -qE '@/components/ui/prosera/'; then
          echo "FAIL: non-prosera UI import in $file"
          echo "  $line"
          fail=1
        fi
      fi
    done < <(grep '^import' "$file" || true)
  done < <(find "$dir" \( -name '*.tsx' -o -name '*.ts' \) -print0)
done

if [[ $fail -ne 0 ]]; then
  echo "Guard failed: use @/components/ui/prosera/* in silver-state and login."
  exit 1
fi

echo "OK: Prosera-only guard passed."
