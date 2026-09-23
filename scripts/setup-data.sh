#!/bin/bash
# Распаковывает стартовый кит в data/. Датасет не коммитим (см. docs/DECISIONS.md).
# Источник: $DATASET_ZIP, иначе ../Варианты/карьера/career_quest_dataset.zip рядом с репо.
# --if-missing: ничего не делать, если data/ уже заполнена (так его зовёт predev).
set -u
cd "$(dirname "$0")/.." || exit 1

FILES="employees.json events.json skills.json activity_history.csv"
have_all() { for f in $FILES; do [ -f "data/$f" ] || return 1; done; }

if [ "${1:-}" = "--if-missing" ] && have_all; then exit 0; fi

ZIP="${DATASET_ZIP:-../Варианты/карьера/career_quest_dataset.zip}"
if [ ! -f "$ZIP" ]; then
  echo "Нет data/ и не найден архив: $ZIP"
  echo "Положите employees.json, events.json, skills.json, activity_history.csv в data/ или задайте DATASET_ZIP=/путь/к/career_quest_dataset.zip"
  exit 1
fi

mkdir -p data
for f in $FILES; do
  unzip -o -j -q "$ZIP" "case_1/career_quest_dataset/$f" -d data || exit 1
done
echo "data/ готова из $ZIP"
