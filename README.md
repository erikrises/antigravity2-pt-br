# Antigravity 2.0 - Pacote de Tradução em Português do Brasil (pt-BR) 🇧🇷

Tradução moderna, completa e segura da interface desktop do **Google Antigravity 2.0** para Português do Brasil (pt-BR), com suporte multiplataforma (**Linux**, **Windows** e **macOS**), persistência pós-atualização e detecção inteligente de novidades.

---

> [!NOTE]
> **Aviso Legal / Trademark Disclaimer:**  
> **Antigravity** é uma marca registrada da **Google LLC**.  
> Este é um projeto independente de código aberto. Este projeto **NÃO** possui qualquer vínculo, afiliação, endosso ou patrocínio por parte da Google LLC.  
> O repositório distribui exclusivamente dicionários de tradução e scripts de modificação local (mod), não contendo nem redistribuindo quaisquer binários ou arquivos proprietários da Google.

---

## ✨ Características

- 🌐 **Interface 100% em Português:** Menus da barra de títulos, barra de status (tray), painel lateral, gerenciador de subagentes, permissões, workspaces, servidores MCP, paleta de comandos e configurações de modelos.
- 🛡️ **Isolamento Rígido de Código:** Jamais altera blocos de código (`pre`, `code`), terminais embutidos (`xterm`), editores (`Monaco`/`Lexical`), logs técnicos ou o conteúdo gerado pela IA no chat.
- 💻 **Multiplataforma:** Compatível com **Linux** (Debian, Ubuntu, Fedora, Arch, etc.), **Windows** (10/11) e **macOS** (Apple Silicon / Intel).
- 🔄 **100% Reversível com Backup Automático:** Cria backup oficial (`app.asar.bak`) na primeira execução, permitindo restaurar a versão oficial em inglês a qualquer momento com um único comando.
- 🍎 **Segurança no macOS (Gatekeeper Ready):** Aplica automaticamente assinatura ad-hoc (`codesign`) e remove atributos de quarentena (`xattr`), prevenindo erros de integridade do macOS.
- 🔍 **Detector de Novidades (`tools/sync_new_strings.py`):** Identifica e extrai novas strings adicionadas pelo Google a cada atualização do aplicativo.

---

## 🚀 Instalação Rápida

### 🐧 Linux

Abra o terminal e execute:

```bash
git clone https://github.com/erikrises/antigravity2-pt-br.git
cd antigravity2-pt-br
sudo ./install.sh
```

---

### 🪟 Windows

1. Abra o **PowerShell** como **Administrador**.
2. Navegue até a pasta onde deseja salvar o projeto e execute:

```powershell
git clone https://github.com/erikrises/antigravity2-pt-br.git
cd antigravity2-pt-br
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install.ps1
```

> **Dica para Windows:** Se o Antigravity já estiver aberto, use o parâmetro `-Kill` para fechá-lo automaticamente antes de aplicar o patch:
> ```powershell
> .\install.ps1 -Kill
> ```

---

### 🍎 macOS

Abra o Terminal e execute:

```bash
git clone https://github.com/erikrises/antigravity2-pt-br.git
cd antigravity2-pt-br
sudo ./install.sh
```

*(O instalador detecta a instalação em `/Applications/Antigravity.app`, aplica a tradução e renova a assinatura ad-hoc necessária para o Gatekeeper).*

---

## 🔄 Persistência em Atualizações do Sistema (Linux APT)

No Linux, para que o APT e a GNOME Software reapliquem a tradução automaticamente sempre que o Google Antigravity for atualizado:

```bash
REPO_DIR=$(pwd)
sudo bash -c "cat << EOF > /etc/apt/apt.conf.d/99antigravity-ptbr
DPkg::Post-Invoke {
    \"if [ -f $REPO_DIR/localization_engine.js ] && dpkg -s antigravity 2>/dev/null | grep -q 'Status: install ok installed'; then /usr/bin/node $REPO_DIR/localization_engine.js --no-kill >/dev/null 2>&1 || true; fi\";
};
EOF"
```

---

## ↩️ Desinstalação (Restaurar Inglês Original)

Para retornar ao padrão original oficial da Google a qualquer momento:

### Linux / macOS:
```bash
sudo ./uninstall.sh
```
*(ou execute: `sudo node localization_engine.js --restore`)*

### Windows:
```powershell
.\install.ps1 -Restore
```
*(ou execute: `node localization_engine.js --restore`)*

---

## 📂 Estrutura dos Dicionários

Os termos traduzidos ficam organizados em arquivos modulares em `dicts/`:

| Arquivo | Descrição |
|---|---|
| `dicts/common.json` | Botões globais e ações padrão (Salvar, Cancelar, Confirmar, etc.) |
| `dicts/menu_nav.json` | Menus do sistema operacional, barra de topo e status tray |
| `dicts/page_agents.json` | Subagentes autônomos, funções e permissões de execução |
| `dicts/page_workspaces.json` | Gestão de workspaces, pastas de projetos e ambientes |
| `dicts/page_mcp_knowledge.json` | Protocolo MCP, ferramentas conectadas e bases de conhecimento |
| `dicts/page_settings.json` | Configurações, seleção e potência de modelos, atalhos e sandbox |
| `dicts/page_v218_extra.json` | Diagnósticos, Git, telemetria e novos módulos |
| `dicts/web_ui.json` | Interface principal completa da aplicação web/desktop |
| `dicts/novidades.json` | Novas strings adicionadas incrementalmente |

---

## 🛠️ Ferramentas para Desenvolvedores e Colaboradores

- **`tools/sync_new_strings.py`**: Compara o `app.asar` atual com o backup original e extrai termos novos em inglês não cobertos pelos dicionários atuais.
- **`tools/auto_translate.js`**: Script auxiliar para tradução em lote de termos extraídos.
- **`tools/on_startup_check.sh`**: Script para verificação periódica de integridade da tradução.

Consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para saber como contribuir com correções de termos ou melhorias.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
