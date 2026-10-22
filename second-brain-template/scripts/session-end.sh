#!/usr/bin/env bash
# Хук SessionEnd: страховка, если сессия закрыта до протокола сохранения.
# Делает WIP-коммит (через сканер секретов) и пытается отправить. Ход виден в .memory-sync.log.
cd "$(dirname "$0")/.." || exit 0
{
  echo "--- session-end $(date -u +%Y-%m-%dT%H:%MZ)"
  if [ -n "$(git status --porcelain)" ]; then
    scripts/memory-save.sh "memory: автосохранение при завершении сессии (WIP, проверить)"
  else
    scripts/memory-save.sh "noop"
  fi
} >> .memory-sync.log 2>&1
exit 0
