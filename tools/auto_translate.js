const fs = require('fs');
const path = require('path');
const os = require('os');

const DICTS_DIR = path.join(__dirname, '..', 'dicts');
const EXTRA_DICT = path.join(DICTS_DIR, 'novidades.json');

function normalize(s) {
    if (!s) return '';
    return s.replace(/\s+/g, ' ').trim();
}

function loadAllExistingKeys() {
    const existing = new Set();
    if (!fs.existsSync(DICTS_DIR)) return existing;
    const files = fs.readdirSync(DICTS_DIR);
    for (const f of files) {
        if (f.endsWith('.json')) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(DICTS_DIR, f), 'utf-8'));
                for (const k of Object.keys(data)) {
                    existing.add(normalize(k));
                }
            } catch {}
        }
    }
    return existing;
}

function checkUntranslated() {
    const untranslatedFile = path.join(os.homedir(), '.config', 'Antigravity', 'untranslated_strings.json');
    if (!fs.existsSync(untranslatedFile)) {
        console.log('[Auto-Translate] Nenhum arquivo de strings não traduzidas encontrado em ~/.config/Antigravity/untranslated_strings.json');
        return [];
    }

    try {
        const list = JSON.parse(fs.readFileSync(untranslatedFile, 'utf-8'));
        const existing = loadAllExistingKeys();
        const pending = list.filter(item => item && !existing.has(normalize(item)));
        console.log(`[Auto-Translate] Termos pendentes encontrados: ${pending.length}`);
        return pending;
    } catch (e) {
        console.error('[Auto-Translate] Erro ao ler untranslated_strings.json:', e.message);
        return [];
    }
}

checkUntranslated();
