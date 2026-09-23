#!/bin/bash
# Stop hook: не даёт агенту сказать «готово», пока scripts/check.sh (FAST=1) красный.
# Срабатывает только если есть незакоммиченные изменения в исходниках.
# Второй стоп подряд (stop_hook_active) пропускает — защита от бесконечного цикла.
set -u
INPUT=$(cat)
if printf '%s' "$INPUT" | grep -Eq '"stop_hook_active": *true'; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -x scripts/check.sh ] || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
CHANGES=$( { git diff --name-only HEAD; git diff --cached --name-only; git ls-files --others --exclude-standard; } 2>/dev/null \
  | grep -E '\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|sql|css|html|vue|svelte)$' | sort -u )
[ -z "$CHANGES" ] && exit 0
OUT=$(FAST=1 ./scripts/check.sh 2>&1); STATUS=$?
[ "$STATUS" -eq 0 ] && exit 0
TAIL=$(printf '%s\n' "$OUT" | tail -40)
MSG="scripts/check.sh (FAST=1) упал — почини и заверши работу снова. Не отключай проверки, чтобы пройти.

$TAIL"
if command -v jq >/dev/null 2>&1; then
  jq -n --arg r "$MSG" '{decision:"block", reason:$r}'
else
  printf '%s' "$MSG" | python3 -c 'import json,sys; print(json.dumps({"decision":"block","reason":sys.stdin.read()}))'
fi
exit 0
