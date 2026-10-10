#!/usr/bin/env python3
"""
sync_new_strings.py - Detector e Gerenciador de Novos Termos do Antigravity 2.0

Verifica após atualizações se o Google introduziu novos textos, botões ou diálogos
na interface, comparando o bundle JS oficial com os dicionários já traduzidos.
"""

import os
import sys
import json
import glob
import re
import subprocess
from datetime import datetime

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICTS_DIR = os.path.join(REPO_DIR, 'dicts')
RAW_DIR = os.path.join(REPO_DIR, 'raw_dicts')
RUNTIME_UNTRANSLATED = os.path.expanduser('~/.config/Antigravity/untranslated_strings.json')

def find_asar_path():
    custom = os.environ.get('ANTIGRAVITY_PATH')
    if custom:
        cand = os.path.join(custom, 'resources', 'app.asar')
        if os.path.exists(cand): return cand
        cand = os.path.join(custom, 'app.asar')
        if os.path.exists(cand): return cand

    if sys.platform == 'linux':
        candidates = [
            '/opt/antigravity/resources/app.asar',
            '/opt/Antigravity/resources/app.asar',
            os.path.expanduser('~/.local/share/antigravity/resources/app.asar'),
            '/usr/lib/antigravity/resources/app.asar'
        ]
    elif sys.platform == 'darwin':
        candidates = [
            '/Applications/Antigravity.app/Contents/Resources/app.asar',
            os.path.expanduser('~/Applications/Antigravity.app/Contents/Resources/app.asar')
        ]
    elif sys.platform == 'win32':
        local_app = os.environ.get('LOCALAPPDATA', os.path.expanduser('~\\AppData\\Local'))
        prog_files = os.environ.get('ProgramFiles', 'C:\\Program Files')
        prog_x86 = os.environ.get('ProgramFiles(x86)', 'C:\\Program Files (x86)')
        candidates = [
            os.path.join(local_app, 'Programs', 'Antigravity', 'resources', 'app.asar'),
            os.path.join(local_app, 'Antigravity', 'resources', 'app.asar'),
            os.path.join(prog_files, 'Antigravity', 'resources', 'app.asar'),
            os.path.join(prog_x86, 'Antigravity', 'resources', 'app.asar')
        ]
    else:
        candidates = []

    for c in candidates:
        if os.path.exists(c):
            return c
    return '/opt/antigravity/resources/app.asar'

ASAR_PATH = find_asar_path()

def load_all_existing_keys():
    keys = set()
    for f in glob.glob(os.path.join(DICTS_DIR, '*.json')):
        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
                for k, v in data.items():
                    norm_k = k.strip().lower()
                    if norm_k:
                        keys.add(norm_k)
                    if isinstance(v, str):
                        norm_v = v.strip().lower()
                        if norm_v:
                            keys.add(norm_v)
        except Exception as e:
            print(f"[Aviso] Falha ao ler {f}: {e}")
    return keys

def scan_asar_strings():
    if not os.path.exists(ASAR_PATH):
        print(f"[Erro] app.asar não encontrado em {ASAR_PATH}")
        return set()

    node_script = f"""
    const asar = require('@electron/asar');
    const targets = ['dist/preload.js', 'dist/menu.js', 'dist/main.js'];
    let content = '';
    for (const t of targets) {{
        try {{
            let str = asar.extractFile('{ASAR_PATH}', t).toString('utf8');
            const startMarker = '/* --- ANTIGRAVITY PT-BR LOCALIZATION START --- */';
            const endMarker = '/* --- ANTIGRAVITY PT-BR LOCALIZATION END --- */';
            const sIdx = str.indexOf(startMarker);
            const eIdx = str.indexOf(endMarker);
            if (sIdx !== -1 && eIdx !== -1) {{
                str = str.substring(0, sIdx) + str.substring(eIdx + endMarker.length);
            }}
            content += str + ' ';
        }} catch(e) {{}}
    }}
    const regex = /(?:\"([A-Z][^\"\\n]{{2,100}})\"|'([A-Z][^'\\n]{{2,100}})')/g;
    const found = new Set();
    let m;
    while ((m = regex.exec(content)) !== null) {{
        let str = (m[1] || m[2] || '').trim();
        str = str.replace(/\\\\"/g, '"').replace(/\\\\'/g, "'").replace(/\\\\+$/, '').trim();
        if (str) found.add(str);
    }}
    console.log(JSON.stringify([...found]));
    """
    try:
        out = subprocess.check_output(
            ['node', '-e', node_script],
            cwd=REPO_DIR,
            stderr=subprocess.DEVNULL
        ).decode('utf-8')
        return set(json.loads(out))
    except Exception as e:
        print(f"[Aviso] Não foi possível inspecionar app.asar diretamente: {e}")
        return set()

def scan_runtime_strings():
    if not os.path.exists(RUNTIME_UNTRANSLATED):
        return set()
    try:
        with open(RUNTIME_UNTRANSLATED, 'r', encoding='utf-8') as fp:
            data = json.load(fp)
            if isinstance(data, list):
                return set(data)
    except Exception:
        pass
    return set()

HTML_TAGS = {
    'CANVAS', 'INPUT', 'OPTION', 'PRE', 'SCRIPT', 'SELECT', 'STYLE', 'SVG', 'TEXTAREA',
    'BUTTON', 'DIV', 'SPAN', 'BODY', 'HEAD', 'IMG', 'A', 'P', 'H1', 'H2', 'H3', 'H4',
    'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'TR', 'TD', 'TH', 'TBODY', 'THEAD', 'FORM',
    'LABEL', 'NAV', 'HEADER', 'FOOTER', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'DIALOG'
}

def is_potential_ui_string(s):
    if not s or len(s) < 3 or len(s) > 100:
        return False
    if s.upper() in HTML_TAGS:
        return False
    # Ignora URLs, comandos shell, rotas e caminhos técnicos
    if s.startswith(('http://', 'https://', 'file://', 'git ', 'node ', '/', './', '../')):
        return False
    if s.endswith(('.js', '.json', '.html', '.css', '.md', '.svg', '.png')):
        return False
    if s in {'DOMContentLoaded', 'AutomationControlled', 'CODE', 'TEXT', 'JSON', 'HTML', 'API', 'URL', 'CSS'}:
        return False
    if 'CmdOrCtrl' in s or re.match(r'^(?:Ctrl|Cmd|Alt|Shift)\+', s):
        return False
    if not re.search(r'[a-zA-Z]', s):
        return False
    return True

def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    existing_keys = load_all_existing_keys()
    print(f"[Sync] Total de termos conhecidos nos dicionários atuais: {len(existing_keys)}")

    asar_terms = scan_asar_strings()
    runtime_terms = scan_runtime_strings()
    all_candidates = asar_terms | runtime_terms

    new_terms = []
    for term in sorted(all_candidates):
        norm = term.strip().lower()
        if norm not in existing_keys and is_potential_ui_string(term):
            new_terms.append(term)

    print(f"[Sync] Novos termos potenciais identificados: {len(new_terms)}")

    if not new_terms:
        print("[Sync] Tudo 100% atualizado! Nenhuma nova string detectada.")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_raw = os.path.join(RAW_DIR, f"novidades_{timestamp}.json")
    with open(output_raw, 'w', encoding='utf-8') as fp:
        json.dump({k: "" for k in new_terms}, fp, ensure_ascii=False, indent=4)

    print(f"[Sync] Salvo lote de novidades para tradução em: {output_raw}")
    print("[Sync] Você pode traduzir este lote com auxílio do Antigravity ou script automatizado.")

if __name__ == '__main__':
    main()
