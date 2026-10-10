#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================"
echo " Desinstalador da Tradução - Google Antigravity 2.0"
echo "======================================================"

if [ "$EUID" -ne 0 ]; then
  exec sudo bash "$0" "$@"
fi

node "$DIR/localization_engine.js" --restore "$@"

echo ""
echo "Restauração concluída! O Antigravity voltou ao padrão oficial em inglês."
