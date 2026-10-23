#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================"
echo " Desinstalador da Tradução - Google Antigravity 2.0"
echo "======================================================"

if [ "$EUID" -ne 0 ]; then
  exec sudo bash "$0" "$@"
fi

# Detectar runtime Node.js (sistema ou embutido)
NODE_CMD=""
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif [ -x /opt/antigravity/antigravity ]; then
  NODE_CMD="env ELECTRON_RUN_AS_NODE=1 /opt/antigravity/antigravity"
fi

if [ -n "$NODE_CMD" ] && [ -f "$DIR/localization_engine.js" ]; then
  $NODE_CMD "$DIR/localization_engine.js" --restore "$@"
elif [ -n "$NODE_CMD" ] && [ -f /usr/local/share/antigravity-ptbr/localization_engine.js ]; then
  $NODE_CMD /usr/local/share/antigravity-ptbr/localization_engine.js --restore "$@"
fi

# Remover hooks de persistência no Linux
rm -f /etc/apt/apt.conf.d/99antigravity-ptbr
rm -f /etc/dnf/plugins/post-transaction-actions.d/antigravity-ptbr.action
rm -f /etc/pacman.d/hooks/antigravity-ptbr.hook
rm -rf /usr/local/share/antigravity-ptbr

echo ""
echo "Restauração concluída! O Antigravity voltou ao padrão oficial em inglês e os hooks foram removidos."
