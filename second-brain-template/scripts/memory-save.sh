#!/usr/bin/env bash
# Протокол сохранения: проверка -> коммит -> push -> подтверждение по удалённому SHA.
# Использование: scripts/memory-save.sh "сообщение коммита"
# Никогда не делает force-push и не переписывает историю.
set -u
cd "$(dirname "$0")/.." || exit 1
MSG="${1:-memory: обновление $(date -u +%Y-%m-%d)}"
git config core.hooksPath .githooks

if [ -n "$(git status --porcelain)" ]; then
  echo "== Изменения:"; git status --short
  git add -A
  if ! scripts/secret-scan.sh; then
    git reset -q
    echo "!! СОХРАНЕНИЕ ОСТАНОВЛЕНО: сканер нашёл секрет/запрещённый файл. Ничего не закоммичено."
    exit 3
  fi
  git commit -q -m "$MSG" || { echo "!! git commit не удался"; exit 4; }
  echo "== Коммит: $(git log -1 --format='%h %s')"
else
  echo "== Нет новых изменений для коммита."
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "!! NOT SYNCED: удалённый репозиторий не подключён. Данные сохранены только локально."
  echo "   Несинхронизировано коммитов: $(git rev-list --count HEAD)"
  exit 5
fi

BR=$(git branch --show-current)
TARGETS="$BR"
# Источник истины — main. Облачные сессии работают на своих ветках, поэтому
# дополнительно продвигаем main, но ТОЛЬКО fast-forward (без --force).
PUSH_MAIN=$(git config --get memory.pushMain || echo true)
[ "$BR" != "main" ] && [ "$PUSH_MAIN" = "true" ] && TARGETS="$TARGETS main"

RC=0
for T in $TARGETS; do
  ok=0
  for d in 0 2 4 8 16; do
    sleep $d
    if git push -q -u origin "HEAD:refs/heads/$T" 2>/tmp/memsave.err; then ok=1; break; fi
    grep -qiE 'rejected|non-fast-forward|denied|403|protected' /tmp/memsave.err && break
  done
  REMOTE=$(git ls-remote origin "refs/heads/$T" 2>/dev/null | cut -f1)
  if [ $ok = 1 ] && [ "$REMOTE" = "$(git rev-parse HEAD)" ]; then
    echo "== SYNCED: origin/$T = $(git rev-parse --short HEAD) (подтверждено ls-remote)"
  else
    echo "!! NOT SYNCED в origin/$T: $(head -3 /tmp/memsave.err)"
    echo "   Данные сохранены локально. Если ветка разошлась — выполни fetch и изучи расхождение, без force."
    RC=6
  fi
done
exit $RC
