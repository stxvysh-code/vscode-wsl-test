# Контекст: настройка Arch Linux на ноутбуке пользователя

Ты работаешь прямо на ноутбуке пользователя (Claude Code в `~/setup`). Общайся по-русски, просто и коротко: пользователь часто пишет с телефона.

## Железо
- HP Laptop 14s-fq0xxx, AMD 3020e (2 ядра/2 потока, 6 Вт), встроенная Radeon Vega.
- RAM 4 ГБ (доступно 3,2 ГБ), распаяна. SSD SATA 128 ГБ (SSSTC CVB-8D128-HP).
- Wi-Fi Realtek (rtw88). Город: Бийск, часовой пояс Asia/Barnaul (UTC+7).

## Что уже установлено и настроено
- Arch Linux, ядро `linux`, systemd-boot. Разделы: `/dev/sda1` 1G EFI → `/boot`, `/dev/sda2` ext4 (noatime) → `/`. Windows удалена.
- Пользователь `stxv` (группа wheel, sudo). Hostname `archbook`.
- zram (размер = RAM, zstd), swappiness 180, earlyoom, tlp, fstrim.timer, paccache.timer, журнал ограничен 100 МБ.
- NetworkManager (Wi-Fi через `nmcli`).
- Графика: sway (Wayland) запускается автоматически из `~/.zprofile` на tty1. waybar, foot, fuzzel, mako, swaylock/swayidle, тема Catppuccin Mocha, шрифт JetBrainsMono Nerd Font.
- XWayland, xcb-util-cursor, qt6-wayland; в `~/.zprofile` выставлены `XDG_SESSION_TYPE=wayland`, `QT_QPA_PLATFORM="wayland;xcb"`.
- zsh + starship + autosuggestions + syntax-highlighting; eza, bat, btop, fastfetch, ripgrep, fd; Firefox.
- VPN-клиент Happ (`/usr/bin/happ`, Qt) в TUN-режиме. **Не закрывай и не убивай Happ**: без VPN Claude Code теряет связь.

## Репозиторий
- `arch/install.sh`: скрипт постустановки (пакеты + копирование конфигов).
- `arch/dotfiles/`: конфиги sway, waybar, foot, fuzzel, mako, zshrc, zprofile. Это источник правды: меняя конфиг в `~/.config`, обновляй копию здесь и коммить.

## Что хочет пользователь (следующие шаги)
1. Красота: обои, waybar с иконками, красивый swaylock, GTK-тема/иконки/курсор Catppuccin.
2. Удобство как в Windows: Win+E файловый менеджер, Alt+Tab, Win+L блокировка, скриншоты, OSD громкости/яркости, история буфера обмена, автомонтирование флешек, Bluetooth.
3. Программы: VS Code, Python, Node.js, Telegram, лёгкий файловый менеджер.
4. Производительность под 4 ГБ RAM: без тяжёлых DE и сервисов, Electron-приложения по минимуму.

## Правила
- Перед командами с `sudo` коротко объясняй, что они делают.
- Учитывай 4 ГБ RAM: выбирай лёгкие варианты.
- Горячие клавиши sway: Mod = Win; Win+Enter терминал, Win+d меню, Win+q закрыть окно, Alt+Shift раскладка.
