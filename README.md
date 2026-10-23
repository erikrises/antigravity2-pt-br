# Antigravity 2.0 - Pacote de Tradução em Português do Brasil (pt-BR) 🇧🇷

Tradução moderna, completa e segura da interface desktop do **Google Antigravity 2.0** para Português do Brasil (pt-BR), com suporte multiplataforma (**Linux**, **Windows** e **macOS**), persistência automática pós-atualização e detecção inteligente de novidades.

---

> [!NOTE]
> **Aviso Legal / Trademark Disclaimer:**  
> **Antigravity** é uma marca registrada da **Google LLC**.  
> Este é um projeto independente de código aberto desenvolvido para fins de acessibilidade linguística e tradução local. Este projeto **NÃO** possui qualquer vínculo, afiliação, endosso ou patrocínio por parte da Google LLC ou da equipe do Google Antigravity.  
> O repositório distribui exclusivamente dicionários de tradução e scripts de modificação local (mod), não contendo nem redistribuindo quaisquer binários ou arquivos proprietários da Google.

---

## ✨ Características

- 🌐 **Interface 100% em Português:** Menus da barra de títulos, barra de status (tray), painel lateral, assistente de instalação/onboarding, gerenciador de subagentes, permissões, workspaces, servidores MCP, paleta de comandos e configurações de modelos.
- ⚡ **Sem Dependência de Node.js Externo:** O motor detecta automaticamente e utiliza o Node.js v24 embutido no próprio binário do Antigravity (`ELECTRON_RUN_AS_NODE=1`), funcionando mesmo se você não tiver Node.js instalado na máquina.
- 🛡️ **Isolamento Rígido de Código:** Jamais altera blocos de código (`pre`, `code`), terminais embutidos (`xterm`), editores (`Monaco`/`Lexical`), logs técnicos ou o conteúdo gerado pela IA no chat.
- 💻 **Universal e Multiplataforma:** Compatível com **Linux** (qualquer ambiente: KDE Plasma, GNOME, XFCE, Cinnamon, i3/Sway), **Windows** (10/11) e **macOS** (Apple Silicon / Intel).
- 🔄 **100% Reversível com Backup Sincronizado:** Mantém backup oficial (`app.asar.bak`) sincronizado com a versão exata do app, permitindo restaurar a versão oficial em inglês a qualquer momento com um único comando sem risco de downgrade.
- 🍎 **Segurança no macOS (Gatekeeper Ready):** Aplica automaticamente assinatura ad-hoc (`codesign`) e remove atributos de quarentena (`xattr`), prevenindo erros de integridade do macOS.
- 🔍 **Detector de Novidades (`tools/sync_new_strings.py`):** Identifica e extrai novas strings adicionadas pelo Google a cada atualização do aplicativo.

---

## 📥 1. Como Baixar e Instalar o Google Antigravity

Se você ainda não possui o **Google Antigravity** instalado em sua máquina, faça o download oficial diretamente no portal da Google:

🔗 **Site Oficial de Download:** **[antigravity.google/download](https://antigravity.google/download)**

| Sistema Operacional | Método de Instalação Oficial |
|---|---|
| **🪟 Windows (10 / 11)** | Baixe o instalador `.exe` oficial (x64 ou ARM64) e execute o assistente de instalação padrão. |
| **🍎 macOS (Apple Silicon / Intel)** | Baixe a imagem `.dmg` oficial e arraste o `Antigravity.app` para a sua pasta `/Applications`. |
| **🐧 Linux (Debian, Ubuntu, Fedora, Arch, etc.)** | Baixe o pacote oficial `Antigravity.tar.gz` e extraia em `/opt/antigravity` (ou instale o pacote correspondente à sua distro). |

> [!IMPORTANT]
> **Foco Exclusivo no Desktop:** Este pacote de tradução é desenvolvido **exclusivamente para a interface do aplicativo Desktop (IDE)** do Google Antigravity. Ele não cobre nem modifica a ferramenta de linha de comando (`agy`).

---

## 🚀 2. Instalação da Tradução pt-BR (Comando Único)

Após instalar o Antigravity, aplique a tradução completa em Português com um único comando:

### 🐧 Linux & 🍎 macOS

Abra o terminal e execute:

```bash
curl -fsSL https://raw.githubusercontent.com/erikrises/antigravity2-pt-br/main/install.sh | bash
```

*(No Linux, o instalador configura automaticamente a persistência protegida no gerenciador de pacotes do seu sistema: APT, DNF ou Pacman).*  
*(No macOS, o script detecta `/Applications/Antigravity.app`, aplica a tradução e renova a assinatura ad-hoc necessária para o Gatekeeper).*

---

### 🪟 Windows

Abra o **PowerShell** como **Administrador** e execute:

```powershell
irm https://raw.githubusercontent.com/erikrises/antigravity2-pt-br/main/install.ps1 | iex
```

*(Dica: certifique-se de que o Antigravity esteja fechado antes de rodar, ou passe `-Kill` caso utilize o modo manual).*

---

<details>
<summary><b>📦 Método Alternativo: Instalação via Git Clone</b></summary>

#### Linux / macOS:
```bash
git clone https://github.com/erikrises/antigravity2-pt-br.git
cd antigravity2-pt-br
sudo ./install.sh
```

#### Windows (PowerShell):
```powershell
git clone https://github.com/erikrises/antigravity2-pt-br.git
cd antigravity2-pt-br
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install.ps1
```

</details>

---

## 🔄 Persistência em Atualizações do Sistema (Linux Universal)

O `install.sh` configura automaticamente a persistência protegida em `/usr/local/share/antigravity-ptbr/` (propriedade de `root:root`, modo 0755), prevenindo qualquer risco de segurança:

* **Debian, Ubuntu, Linux Mint, Pop!_OS, Zorin OS (APT / dpkg / KDE Discover / GNOME Software):**  
  Instalado automaticamente em `/etc/apt/apt.conf.d/99antigravity-ptbr`. Dispara tanto por linha de comando (`apt`, `nala`) quanto por lojas gráficas baseadas em PackageKit.
* **Fedora, RHEL, CentOS (DNF):**  
  Ação registrada em `/etc/dnf/plugins/post-transaction-actions.d/antigravity-ptbr.action`.
* **Arch Linux, Manjaro, EndeavourOS (Pacman):**  
  Hook registrado em `/etc/pacman.d/hooks/antigravity-ptbr.hook`.

---

## ↩️ Desinstalação (Restaurar Inglês Original)

Para retornar ao padrão original oficial da Google a qualquer momento e remover os hooks do sistema:

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
| `dicts/v225_novidades.json` | Novas strings adicionadas na v2.25 (cotas Argon, tempo restante, etc.) |
| `dicts/novidades.json` | Novas strings adicionadas incrementalmente |

---

## 🛠️ Ferramentas para Desenvolvedores e Mantenedores

- **`npm test`**: Valida a sintaxe de todos os arquivos JSON, verifica ausência de conflitos de tradução e testa a sintaxe do motor de localização.
- **`tools/check_conflicts.js`**: Detecta chaves duplicadas ou conflitantes entre os dicionários.
- **`tools/sync_new_strings.py`**: Compara o `app.asar` atual com os dicionários e extrai novos termos em inglês introduzidos por atualizações do Google Antigravity para tradução incremental.

Consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para saber como contribuir com correções de termos ou melhorias.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
