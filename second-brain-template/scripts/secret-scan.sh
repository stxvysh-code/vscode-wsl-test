#!/usr/bin/env bash
# Проверяет индексированные (staged) файлы на секреты и запрещённые пути. Код 1 = найдено.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
FAIL=0
FILES=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$FILES" ] && exit 0

while IFS= read -r f; do
  case "$f" in
    .env|.env.*|*/.env|*.pem|*.key|*id_rsa*|*id_ed25519*|private/*|*.p12|*.pfx|.claude/settings.local.json)
      echo "secret-scan: запрещённый файл в коммите: $f"; FAIL=1 ;;
  esac
done <<< "$FILES"

PATTERNS='(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}|(password|passwd|пароль|token|secret)[[:space:]]*[:=][[:space:]]*[^[:space:]<]{6,})'
HITS=$(git diff --cached -U0 | grep -E '^\+' | grep -v -- '^+++' | grep -niE "$PATTERNS" | grep -v 'secret-scan:allow')
if [ -n "$HITS" ]; then
  echo "secret-scan: похоже на секрет в добавленных строках:"
  echo "$HITS" | cut -c1-160
  FAIL=1
fi
exit $FAIL
