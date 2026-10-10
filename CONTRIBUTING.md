# Guia de Contribuição - Tradução pt-BR do Antigravity

Agradecemos o seu interesse em contribuir com a tradução do Antigravity para Português do Brasil!

---

## 📂 Como o Projeto é Estruturado

Os termos de tradução são mantidos em arquivos JSON modulares na pasta `dicts/`:

* `common.json`: Botões globais, ações padrão (Salvar, Cancelar, Confirmar, etc.).
* `menu_nav.json`: Menus de barra de tarefas/sistema, bandeja (tray) e navegação.
* `page_settings.json`: Preferências, modelos, atalhos de teclado e segurança.
* `page_agents.json`: Gerenciador de agentes, roles e permissões.
* `page_mcp_knowledge.json`: Protocolo MCP, ferramentas e conhecimento.
* `page_v218_extra.json`: Diagnósticos, git e recursos da versão 2.x.
* `web_ui.json`: Termos de interface do frontend da aplicação web.
* `novidades.json`: Termos inéditos adicionados por novas atualizações.

---

## ✍️ Regras e Padrões de Tradução

1. **Tom e Estilo:**
   * Usar tom profissional, moderno e direto, compatível com ferramentas para desenvolvedores (padrão VS Code / IntelliJ / Chrome DevTools).
   * Evitar gírias ou traduções literais truncadas ("machine translation" sem sentido).

2. **Termos Técnicos Preservados:**
   * Preservar siglas e jargões da área: *Git, CLI, URL, ID, Token, OAuth, Worktree, Terminal, Buffer, Cache, Sandbox, MCP*.
   * Não traduzir nomes próprios ou modelos de IA (*Gemini 3.8 Flash, Claude Sonnet, GPT-OSS*).

3. **Invariantes de Código:**
   * Blocos de código (`.font-mono`, `pre`, `code`), editores Monaco e terminais **não devem ser alterados**. O motor já protege esses seletores automaticamente.

4. **Formato JSON:**
   * Sempre mantenha a chave original em inglês: `"English String": "Tradução em Português"`.
   * Certifique-se de que o arquivo JSON é válido antes de abrir o Pull Request:
     ```bash
     npm run test:dicts
     ```

---

## 🚀 Como Enviar sua Contribuição

1. Faça um Fork do repositório.
2. Crie um branch para sua alteração: `git checkout -b fix/traducao-termo`.
3. Edite o arquivo JSON correspondente em `dicts/`.
4. Teste localmente executando `npm run install:ptbr` ou `node localization_engine.js --no-kill`.
5. Abra o Pull Request com uma breve descrição do que foi ajustado.
