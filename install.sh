#!/bin/bash
set -e

echo "======================================================"
echo " Instalador da Tradução pt-BR - Google Antigravity 2.0"
echo "======================================================"

# 1. Localizar runtime Node.js (sistema ou embutido no próprio Antigravity)
NODE_CMD=""

if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
else
  # O binário do Antigravity possui a fuse RunAsNode=1 ativa, trazendo Node v24 embutido!
  CANDIDATES=(
    "/opt/antigravity/antigravity"
    "/opt/Antigravity/antigravity"
    "$HOME/.local/share/antigravity/antigravity"
    "/Applications/Antigravity.app/Contents/MacOS/Antigravity"
  )
  for c in "${CANDIDATES[@]}"; do
    if [ -x "$c" ]; then
      NODE_CMD="env ELECTRON_RUN_AS_NODE=1 $c"
      echo "[INFO] Usando o Node.js v24 embutido no próprio Antigravity ($c)."
      break
    fi
  done
fi

if [ -z "$NODE_CMD" ]; then
  echo "[ERRO] Não foi possível encontrar o Node.js nem o binário do Antigravity!"
  echo "Por favor, instale o Node.js v18+ ou certifique-se de que o Antigravity esteja instalado:"
  echo "  - Linux: sudo apt install nodejs npm (ou via nvm)"
  echo "  - macOS: brew install node"
  exit 1
fi

# 2. Solicitar elevação de privilégios (sudo) se necessário
if [ "$EUID" -ne 0 ]; then
  echo "[INFO] Solicitando privilégios de administrador..."
  sudo -v || exit 1
  SUDO="sudo"
else
  SUDO=""
fi

# 3. Determinar se execução é local ou remota (via curl | bash)
CLEANUP=0
if [ -n "${BASH_SOURCE[0]}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/localization_engine.js" ]; then
  DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  echo "[INFO] Baixando a versão mais recente da tradução..."
  DIR=$(mktemp -d /tmp/antigravity-ptbr-XXXXXX)
  CLEANUP=1
  curl -fsSL https://github.com/erikrises/antigravity2-pt-br/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1 -C "$DIR"
fi

# 4. Executar motor de localização
$SUDO $NODE_CMD "$DIR/localization_engine.js" "$@"

# 5. Instalar persistência segura de atualizações no Linux
if [ "$(uname -s)" = "Linux" ] && [ "$EUID" -eq 0 -o -n "$SUDO" ]; then
  TARGET_SHARE="/usr/local/share/antigravity-ptbr"
  echo "[INFO] Configurando persistência segura de atualizações em $TARGET_SHARE..."
  $SUDO mkdir -p "$TARGET_SHARE"
  $SUDO cp -rf "$DIR/localization_engine.js" "$DIR/dicts" "$DIR/package.json" "$TARGET_SHARE/"
  if [ -d "$DIR/node_modules" ]; then
    $SUDO cp -rf "$DIR/node_modules" "$TARGET_SHARE/"
  fi
  $SUDO chown -R root:root "$TARGET_SHARE"
  $SUDO chmod -R 755 "$TARGET_SHARE"

  # Criar script executor protegido
  $SUDO bash -c "cat << 'RUNEOF' > $TARGET_SHARE/run.sh
#!/bin/bash
if command -v node >/dev/null 2>&1; then
  EXEC_NODE=\"node\"
elif [ -x /opt/antigravity/antigravity ]; then
  EXEC_NODE=\"env ELECTRON_RUN_AS_NODE=1 /opt/antigravity/antigravity\"
fi
if [ -n \"\$EXEC_NODE\" ] && [ -f /usr/local/share/antigravity-ptbr/localization_engine.js ]; then
  \$EXEC_NODE /usr/local/share/antigravity-ptbr/localization_engine.js \"\$@\"
fi
RUNEOF"
  $SUDO chmod +x "$TARGET_SHARE/run.sh"

  # Hook APT (Debian / Ubuntu / Mint / Pop!_OS / Zorin / KDE Discover)
  if [ -d "/etc/apt/apt.conf.d" ]; then
    $SUDO bash -c "cat << 'APTEOF' > /etc/apt/apt.conf.d/99antigravity-ptbr
DPkg::Post-Invoke {
    \"if [ -x /usr/local/share/antigravity-ptbr/run.sh ] && dpkg -s antigravity 2>/dev/null | grep -q 'Status: install ok installed'; then /usr/local/share/antigravity-ptbr/run.sh --no-kill >/dev/null 2>&1 || true; fi\";
};
APTEOF"
  fi

  # Hook DNF (Fedora / RHEL / CentOS)
  if [ -d "/etc/dnf/plugins/post-transaction-actions.d" ]; then
    $SUDO bash -c "echo 'antigravity:any:/usr/local/share/antigravity-ptbr/run.sh --no-kill' > /etc/dnf/plugins/post-transaction-actions.d/antigravity-ptbr.action"
  fi

  # Hook Pacman (Arch Linux / Manjaro / EndeavourOS)
  if [ -d "/etc/pacman.d/hooks" ]; then
    $SUDO bash -c "cat << 'PACMANEOF' > /etc/pacman.d/hooks/antigravity-ptbr.hook
[Trigger]
Operation = Install
Operation = Upgrade
Type = Path
Target = opt/antigravity/*

[Action]
Description = Reaplica a tradução pt-BR do Antigravity...
When = PostTransaction
Exec = /usr/local/share/antigravity-ptbr/run.sh --no-kill
PACMANEOF"
  fi
fi

# 6. Limpeza de arquivos temporários se foi download remoto
if [ "$CLEANUP" -eq 1 ]; then
  rm -rf "$DIR"
fi

echo ""
if [[ "$*" == *"--restore"* ]] || [[ "$*" == *"--uninstall"* ]]; then
  echo "Restauração do Antigravity concluída com sucesso!"
else
  echo "Instalação da tradução concluída com sucesso!"
  echo "Abra ou reinicie o Antigravity para visualizar a interface em Português."
fi
