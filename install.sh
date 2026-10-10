#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================"
echo " Instalador da Tradução pt-BR - Google Antigravity 2.0"
echo "======================================================"

if [ "$EUID" -ne 0 ]; then
  exec sudo bash "$0" "$@"
fi

node "$DIR/localization_engine.js" "$@"

echo ""
if [[ "$*" == *"--restore"* ]] || [[ "$*" == *"--uninstall"* ]]; then
  echo "Restauração do Antigravity concluída com sucesso!"
else
  echo "Instalação da tradução concluída com sucesso!"
  echo "Abra ou reinicie o Antigravity para visualizar a interface em Português."
fi
