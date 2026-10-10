#!/usr/bin/env bash
# on_startup_check.sh - Verificador autônomo de novidades ao iniciar o Antigravity

set -e

# Aguarda o Electron e o language_server inicializarem completamente
sleep 10

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$HOME/.config/Antigravity"
mkdir -p "$CONFIG_DIR"
LAST_VER_FILE="$CONFIG_DIR/last_translated_version.txt"
CURRENT_VER=$(dpkg-query -W -f='${Version}' antigravity 2>/dev/null || echo "unknown")
LAST_VER=$(cat "$LAST_VER_FILE" 2>/dev/null || echo "")

# Executa a verificação estática de novos termos
python3 "$REPO_DIR/tools/sync_new_strings.py" > /tmp/antigravity-ptbr-sync.log 2>&1 || true

# Verifica se foram gerados arquivos com novos termos em raw_dicts
shopt -s nullglob
PENDING_FILES=("$REPO_DIR/raw_dicts"/novidades_*.json)
shopt -u nullglob

if [ ${#PENDING_FILES[@]} -gt 0 ]; then
    echo "[Antigravity-PTBR] Novos termos detectados após atualização para $CURRENT_VER. Disparando agente de tradução..." >> /tmp/antigravity-ptbr-sync.log
    
    AGENT_BIN="$HOME/.gemini/antigravity/bin/agentapi"
    if [ -x "$AGENT_BIN" ]; then
        "$AGENT_BIN" new-conversation \
            --title="Tradução de Novidades ($CURRENT_VER)" \
            "O Antigravity foi atualizado para a versão $CURRENT_VER e foram detectados novos termos de interface em $REPO_DIR/raw_dicts/. Por favor: 1) Inspecione os arquivos de novidades em $REPO_DIR/raw_dicts/; 2) Traduza todos os termos inéditos para Português do Brasil mantendo terminologia técnica refinada de desenvolvimento; 3) Adicione as traduções ao arquivo $REPO_DIR/dicts/novidades.json; 4) Aplique a tradução executando 'sudo node $REPO_DIR/localization_engine.js --no-kill'; 5) Limpe os arquivos temporários de raw_dicts/." >/dev/null 2>&1 || true
    fi

    echo "$CURRENT_VER" > "$LAST_VER_FILE"
else
    echo "[Antigravity-PTBR] Nenhuma string nova detectada. Versão atual: $CURRENT_VER." >> /tmp/antigravity-ptbr-sync.log
    echo "$CURRENT_VER" > "$LAST_VER_FILE"
fi
