#!/usr/bin/env bash
# Настройка Arch Linux после базовой установки:
# графика (sway + waybar), звук, шрифты, тема Catppuccin, zsh и инструменты.
# Запускать от обычного пользователя (не root): bash install.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOT="$DIR/dotfiles"

if [ "$(id -u)" -eq 0 ]; then
  echo "Запусти скрипт от обычного пользователя, не от root." >&2
  exit 1
fi

if ! ping -c1 -W3 archlinux.org >/dev/null 2>&1; then
  echo "Нет интернета. Подключись: nmcli device wifi connect \"СЕТЬ\" password \"ПАРОЛЬ\"" >&2
  exit 1
fi

echo "==> Настройка pacman (цвет, параллельная загрузка)"
sudo sed -i 's/^#Color/Color/; s/^#\?ParallelDownloads.*/ParallelDownloads = 5/' /etc/pacman.conf

echo "==> Установка пакетов"
sudo pacman -Syu --needed --noconfirm \
  mesa vulkan-radeon \
  pipewire pipewire-pulse wireplumber \
  sway swaybg swaylock swayidle waybar foot fuzzel mako \
  grim slurp wl-clipboard brightnessctl polkit xdg-desktop-portal-wlr \
  ttf-jetbrains-mono-nerd noto-fonts noto-fonts-emoji \
  firefox zsh zsh-autosuggestions zsh-syntax-highlighting starship \
  btop fastfetch ripgrep fd bat eza pacman-contrib reflector

echo "==> Ограничение размера журнала до 100 МБ"
sudo mkdir -p /etc/systemd/journald.conf.d
printf "[Journal]\nSystemMaxUse=100M\n" | sudo tee /etc/systemd/journald.conf.d/size.conf >/dev/null

echo "==> Автоочистка кэша пакетов"
sudo systemctl enable --now paccache.timer

backup() {
  if [ -e "$1" ] && [ ! -L "$1" ]; then
    mv "$1" "$1.bak.$(date +%s)"
  fi
}

echo "==> Копирование конфигов"
for app in sway waybar foot fuzzel mako; do
  backup "$HOME/.config/$app"
  mkdir -p "$HOME/.config/$app"
  cp -r "$DOT/$app/." "$HOME/.config/$app/"
done
backup "$HOME/.zshrc";    cp "$DOT/zshrc"    "$HOME/.zshrc"
backup "$HOME/.zprofile"; cp "$DOT/zprofile" "$HOME/.zprofile"
mkdir -p "$HOME/Pictures"

echo "==> Оболочка по умолчанию: zsh"
if [ "$(getent passwd "$USER" | cut -d: -f7)" != "/usr/bin/zsh" ]; then
  chsh -s /usr/bin/zsh
fi

echo
echo "Готово! Выйди (exit) и войди снова на tty1: sway запустится автоматически."
echo "Win+Enter терминал, Win+d меню, Win+q закрыть окно, Alt+Shift раскладка."
