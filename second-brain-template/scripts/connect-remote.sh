#!/usr/bin/env bash
# Однократно: подключить локальную память к ПРИВАТНОМУ репозиторию и отправить историю.
# Использование: scripts/connect-remote.sh https://github.com/<user>/personal-second-brain.git
# Отказывается работать, если удалённый репозиторий уже содержит коммиты (чтобы не перезаписать чужие данные).
set -eu
URL="${1:?укажи URL приватного репозитория}"
cd "$(dirname "$0")/.."
if git remote get-url origin >/dev/null 2>&1; then
  echo "origin уже подключён: $(git remote get-url origin)"; exit 1
fi
if [ -n "$(git ls-remote "$URL" 2>/dev/null | head -1)" ]; then
  echo "!! В $URL уже есть данные. Остановлено: сначала изучи его историю (git clone) и объедини вручную."; exit 2
fi
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  VIS=$(gh repo view "$URL" --json visibility -q .visibility 2>/dev/null || echo "?")
  [ "$VIS" != "PRIVATE" ] && { echo "!! Репозиторий не приватный (visibility=$VIS). Остановлено."; exit 3; }
else
  echo "?? gh не авторизован — приватность проверить не могу. Убедись вручную, что репозиторий Private."
fi
git remote add origin "$URL"
git push -u origin main
[ "$(git ls-remote origin refs/heads/main | cut -f1)" = "$(git rev-parse HEAD)" ] && echo "== SYNCED: origin/main = $(git rev-parse --short HEAD)"
