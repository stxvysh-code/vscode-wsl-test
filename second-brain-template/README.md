# Шаблон personal-second-brain (без личных данных)

Публичная копия **только инструментов** долговременной памяти: протокол `CLAUDE.md`, скрипты загрузки
и сохранения, сканер секретов, хуки Claude Code. Личное содержимое здесь отсутствует намеренно —
оно хранится в приватном репозитории `personal-second-brain`.

Хуки в `.claude/settings.json` срабатывают, только когда этот каталог является корнем проекта
(т.е. в приватном репозитории), и не влияют на `vscode-wsl-test`.

## Восстановление памяти из бандла
1. На github.com: New repository → имя `personal-second-brain` → **Private** → без README/.gitignore/лицензии.
2. Локально:
   ```bash
   git clone personal-second-brain.bundle personal-second-brain
   cd personal-second-brain
   git remote remove origin
   scripts/connect-remote.sh https://github.com/<user>/personal-second-brain.git
   ```
3. Новая сессия Claude Code с этим репозиторием — хук SessionStart загрузит память.
