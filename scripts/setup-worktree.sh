#!/bin/bash
# Подготовка нового worktree: git не копирует .env и зависимости.
# Поставить как setup-хук репо в Orca или запустить руками в новом worktree.
set -u
cd "$(dirname "$0")/.." || exit 1

MAIN=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
if [ "$MAIN" != "$(pwd)" ]; then
  for f in .env .env.local; do
    [ -f "$MAIN/$f" ] && [ ! -f "$f" ] && cp "$MAIN/$f" "$f" && echo "скопирован $f"
  done
  # датасет не в git — берём из основного checkout
  [ -d "$MAIN/data" ] && [ ! -d data ] && cp -R "$MAIN/data" data && echo "скопирована data/"
fi

[ -f package-lock.json ] && [ ! -d node_modules ] && npm ci

exit 0
