#!/usr/bin/env bash
# Протокол начала сессии. Вызывается хуком SessionStart; stdout попадает в контекст Claude.
# Ничего не перезаписывает: только fetch + fast-forward. Любая проблема печатается явно.
set -u
cd "$(dirname "$0")/.." || exit 0

echo "=== MEMORY LOAD: $(date -u +%Y-%m-%dT%H:%MZ) ==="

# Локальный pre-commit хук со сканером секретов (настройка git не хранится в репозитории).
git config core.hooksPath .githooks 2>/dev/null

SYNC="UNKNOWN"
if ! git remote get-url origin >/dev/null 2>&1; then
  SYNC="NO_REMOTE"
  echo "!! Удалённый репозиторий не подключён. Память только локальная и может быть неактуальной."
else
  BR=$(git branch --show-current)
  if ! timeout 30 git fetch -q origin 2>/tmp/memload.err; then
    SYNC="FETCH_FAILED"
    echo "!! git fetch не удался: $(head -3 /tmp/memload.err)"
    echo "!! Работаю с ЛОКАЛЬНОЙ копией, она может быть устаревшей. Сообщи пользователю."
  else
    # Источник истины — main. Если работаем на другой ветке, сначала подтягиваем main.
    REFS="origin/main"; [ "$BR" != "main" ] && REFS="$REFS origin/$BR"
    for REF in $REFS; do
      git rev-parse -q --verify "$REF" >/dev/null || continue
      if [ -n "$(git status --porcelain)" ]; then
        echo "!! Есть локальные несохранённые изменения — слияние с $REF пропущено, чтобы ничего не потерять:"
        git status --short
        SYNC="DIRTY"
        break
      fi
      if git merge-base --is-ancestor "$REF" HEAD; then continue; fi
      if git merge -q --ff-only "$REF" 2>/dev/null; then
        echo "-- fast-forward до $REF"
      else
        echo "!! Ветки разошлись с $REF. Автослияние НЕ выполнено. Нужно изучить расхождение:"
        git log --oneline -5 HEAD..."$REF"
        SYNC="DIVERGED"
      fi
    done
    [ "$SYNC" = "UNKNOWN" ] && SYNC="OK"
  fi
fi
echo "SYNC_STATUS=$SYNC  HEAD=$(git rev-parse --short HEAD 2>/dev/null)"
echo

for f in STATUS.md INDEX.md; do
  echo "----- $f -----"
  cat "$f" 2>/dev/null || echo "(нет файла $f)"
  echo
done
echo "=== Дальше: прочитай CLAUDE.md (протокол) и нужные записи из INDEX.md ==="
