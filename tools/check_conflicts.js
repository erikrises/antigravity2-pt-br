#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dictDir = path.join(__dirname, '..', 'dicts');
if (!fs.existsSync(dictDir)) {
    console.error(`Diretório não encontrado: ${dictDir}`);
    process.exit(1);
}

const files = fs.readdirSync(dictDir).filter(f => f.endsWith('.json'));
const keyMap = new Map();
const conflicts = [];

for (const file of files) {
    const filePath = path.join(dictDir, file);
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const [k, v] of Object.entries(data)) {
            const normK = k.replace(/\s+/g, ' ').trim();
            if (keyMap.has(normK)) {
                const existing = keyMap.get(normK);
                if (existing.v !== v) {
                    conflicts.push({
                        key: normK,
                        orig: { file: existing.file, value: existing.v },
                        duplicate: { file, value: v }
                    });
                }
            } else {
                keyMap.set(normK, { v, file });
            }
        }
    } catch (e) {
        console.error(`Erro ao ler ${file}: ${e.message}`);
        process.exit(1);
    }
}

if (conflicts.length > 0) {
    console.error(`\x1b[31m[ERRO] Encontrados ${conflicts.length} conflito(s) de tradução entre dicionários:\x1b[0m\n`);
    for (const c of conflicts) {
        console.error(`  Chave: "${c.key}"`);
        console.error(`    - ${c.orig.file}: "${c.orig.value}"`);
        console.error(`    - ${c.duplicate.file}: "${c.duplicate.value}"\n`);
    }
    process.exit(1);
}

console.log(`\x1b[32m[OK] Todos os ${keyMap.size} termos únicos foram validados sem nenhum conflito entre os ${files.length} arquivos.\x1b[0m`);
