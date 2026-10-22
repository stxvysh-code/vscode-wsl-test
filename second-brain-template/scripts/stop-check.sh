#!/usr/bin/env bash
# Хук Stop: не даёт Claude закончить ответ, пока изменения памяти не закоммичены и не отправлены.
# Код 2 + stderr = Claude получает напоминание и продолжает работу.
input=$(cat)
[ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
cd "$(dirname "$0")/.." || exit 0

if [ -n "$(git status --porcelain)" ]; then
  echo "Память изменена, но не сохранена. Выполни протокол сохранения из CLAUDE.md: обнови sessions/, STATUS.md, INDEX.md, затем scripts/memory-save.sh \"<сообщение>\" и сообщи результат честно." >&2
  exit 2
fi
if git remote get-url origin >/dev/null 2>&1; then
  BR=$(git branch --show-current)
  if git rev-parse -q --verify "origin/$BR" >/dev/null && [ "$(git rev-list --count "origin/$BR..HEAD")" -gt 0 ]; then
    echo "Есть неотправленные коммиты памяти. Запусти scripts/memory-save.sh и проверь подтверждение SYNCED." >&2
    exit 2
  fi
fi
exit 0
