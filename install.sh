#!/bin/bash
set -e

echo "======================================================"
echo " Instalador da Tradução pt-BR - Google Antigravity 2.0"
echo "======================================================"

# 1. Verificar se Node.js está instalado
if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js não foi encontrado no PATH do sistema!"
  echo "Por favor, instale o Node.js v18 ou superior antes de prosseguir:"
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
$SUDO node "$DIR/localization_engine.js" "$@"

# 5. Limpeza de arquivos temporários se foi download remoto
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
