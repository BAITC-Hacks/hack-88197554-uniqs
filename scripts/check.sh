#!/bin/bash
# Единая проверка перед «готово». Впиши команды под выбранный стек.
# FAST=1 — без тестов (так его гоняет Stop-hook). Пока пусто — всегда зелёный.
set -u
cd "$(dirname "$0")/.." || exit 1

# Next.js: скрипты typecheck и lint заводит скелет (F0). До скелета — зелёный.
if [ -f package.json ]; then
  npm run -s typecheck || exit 1
  npm run -s lint || exit 1
fi

exit 0
