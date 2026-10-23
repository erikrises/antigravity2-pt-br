const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

const DICTS_FOLDER = 'dicts';
const SIGNATURE_START = "/* --- ANTIGRAVITY PT-BR LOCALIZATION START --- */";
const SIGNATURE_END = "/* --- ANTIGRAVITY PT-BR LOCALIZATION END --- */";

function getOptionValue(name, defaultValue) {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        if (args[i] === name) return args[i + 1] || defaultValue;
        if (args[i].startsWith(name + '=')) return args[i].slice(name.length + 1);
    }
    return defaultValue;
}

const IS_UNINSTALL = process.argv.includes('--restore') || process.argv.includes('--uninstall');
const NO_KILL = process.argv.includes('--no-kill');

function log(msg) {
    console.log(`[Antigravity-PT-BR] ${msg}`);
}

function error(msg) {
    console.error(`[Antigravity-PT-BR] ERRO: ${msg}`);
}

function findResourcesDir() {
    const customDir = getOptionValue('--install-dir', process.env.ANTIGRAVITY_PATH || null);
    if (customDir) {
        const res = path.join(customDir, 'resources');
        if (fs.existsSync(res)) return res;
        if (fs.existsSync(customDir) && fs.existsSync(path.join(customDir, 'app.asar'))) return customDir;
        throw new Error(`Diretório de instalação customizado inválido: ${customDir}`);
    }

    const candidates = [];
    if (process.platform === 'linux') {
        candidates.push(
            '/opt/antigravity/resources',
            '/opt/Antigravity/resources',
            path.join(os.homedir(), '.local', 'share', 'antigravity', 'resources'),
            '/usr/lib/antigravity/resources'
        );
    } else if (process.platform === 'darwin') {
        candidates.push(
            '/Applications/Antigravity.app/Contents/Resources',
            path.join(os.homedir(), 'Applications', 'Antigravity.app', 'Contents', 'Resources')
        );
    } else if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        candidates.push(
            path.join(localAppData, 'Programs', 'Antigravity', 'resources'),
            path.join(localAppData, 'Antigravity', 'resources'),
            path.join(programFiles, 'Antigravity', 'resources'),
            path.join(programFilesX86, 'Antigravity', 'resources')
        );
    }

    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }

    throw new Error('Não foi possível localizar o diretório de recursos do Antigravity automaticamente. Use a opção --install-dir <caminho> para especificar manualmente.');
}

function checkRunningProcesses() {
    if (process.platform === 'win32') {
        try {
            const out = child_process.execSync('tasklist /FI "IMAGENAME eq antigravity.exe"', { stdio: 'pipe' }).toString();
            if (out.toLowerCase().includes('antigravity.exe')) {
                if (process.argv.includes('--kill')) {
                    log('Fechando instâncias ativas do Antigravity no Windows...');
                    child_process.execSync('taskkill /F /IM antigravity.exe', { stdio: 'pipe' });
                } else if (!NO_KILL) {
                    throw new Error('O Antigravity está em execução. No Windows, feche o aplicativo antes de prosseguir ou execute com --kill.');
                }
            }
        } catch (e) {
            if (e.message.includes('O Antigravity está em execução')) throw e;
        }
    }
}

function getAsarModule() {
    try {
        const localModule = path.join(__dirname, 'node_modules', '@electron', 'asar');
        if (fs.existsSync(localModule)) {
            return require(localModule);
        }
        return require('@electron/asar');
    } catch (_) {
        return null;
    }
}

function getAsarCmd() {
    const isWin = process.platform === 'win32';
    const localBin = path.join(__dirname, 'node_modules', '.bin', isWin ? 'asar.cmd' : 'asar');
    if (fs.existsSync(localBin)) {
        return isWin ? `"${localBin}"` : `"${process.execPath}" "${localBin}"`;
    }
    const asarJs = path.join(__dirname, 'node_modules', '@electron', 'asar', 'bin', 'asar.js');
    if (fs.existsSync(asarJs)) {
        return `"${process.execPath}" "${asarJs}"`;
    }
    try {
        const whichCmd = isWin ? 'where asar' : 'which asar';
        const globalAsar = child_process.execSync(whichCmd, { stdio: 'pipe' }).toString().trim().split(/\r?\n/)[0];
        if (globalAsar && fs.existsSync(globalAsar)) {
            return `"${globalAsar}"`;
        }
    } catch (_) {}
    const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
    return nodeMajor >= 22 ? 'npx --yes @electron/asar' : 'npx --yes @electron/asar@3';
}

function normalizeText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, ' ')
               .trim()
               .replace(/’/g, "'")
               .replace(/‘/g, "'")
               .replace(/“/g, '"')
               .replace(/”/g, '"')
               .replace(/…/g, '...');
}

function loadDictionaries() {
    const totalMap = {};
    const dictsDir = path.join(__dirname, DICTS_FOLDER);
    if (!fs.existsSync(dictsDir)) {
        throw new Error(`Pasta de dicionários não encontrada: ${dictsDir}`);
    }

    const files = fs.readdirSync(dictsDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const filePath = path.join(dictsDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                for (const [k, v] of Object.entries(data)) {
                    const normK = normalizeText(k);
                    if (normK && v) {
                        totalMap[normK] = v;
                    }
                }
            } catch (err) {
                log(`Aviso: falha ao carregar dicionário ${file}: ${err.message}`);
            }
        }
    }
    return totalMap;
}

function buildPreloadScript(dictionary) {
    const dictJson = JSON.stringify(dictionary);

    return `${SIGNATURE_START}
(() => {
    try {
        const dict = ${dictJson};
        const map = new Map(Object.entries(dict));
        const lowerMap = new Map();
        for (const [k, v] of map.entries()) {
            lowerMap.set(k.toLowerCase(), v);
        }

        const translatedValues = new WeakMap();
        const exclusionCache = new WeakMap();
        const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'PRE', 'CODE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'CANVAS', 'SVG']);
        const LOCAL_EXCLUSION_SELECTOR = 'pre, code, textarea, input, select, .monaco-editor, .cm-editor, [contenteditable="true"], [data-lexical-editor], [role="textbox"], .terminal, .xterm, .code-block, .font-mono, [class*="font-mono"], [translate="no"], .notranslate';

        function isElementExcluded(el) {
            if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
            const cached = exclusionCache.get(el);
            if (cached !== undefined) return cached;

            if (EXCLUDED_TAGS.has(el.tagName) || el.isContentEditable) {
                exclusionCache.set(el, true);
                return true;
            }

            if (typeof el.matches === 'function' && el.matches(LOCAL_EXCLUSION_SELECTOR)) {
                exclusionCache.set(el, true);
                return true;
            }

            if (el.parentElement) {
                const parentExcluded = isElementExcluded(el.parentElement);
                exclusionCache.set(el, parentExcluded);
                return parentExcluded;
            }

            exclusionCache.set(el, false);
            return false;
        }

        let isMutating = false;

        function translateDuration(str) {
            if (!str) return str;
            return str
                .replace(/\\babout\\b/gi, 'cerca de')
                .replace(/\\bless than\\b/gi, 'menos de')
                .replace(/\\bmore than\\b/gi, 'mais de')
                .replace(/\\ba few seconds\\b/gi, 'poucos segundos')
                .replace(/\\ba minute\\b/gi, 'um minuto')
                .replace(/\\ban hour\\b/gi, 'uma hora')
                .replace(/\\ba day\\b/gi, 'um dia')
                .replace(/\\band\\b/gi, 'e')
                .replace(/\\b(\\d+)\\s+days?\\b/gi, function(m, n) { return n === '1' ? '1 dia' : n + ' dias'; })
                .replace(/\\b(\\d+)\\s+hours?\\b/gi, function(m, n) { return n === '1' ? '1 hora' : n + ' horas'; })
                .replace(/\\b(\\d+)\\s+minutes?\\b/gi, function(m, n) { return n === '1' ? '1 minuto' : n + ' minutos'; })
                .replace(/\\b(\\d+)\\s+seconds?\\b/gi, function(m, n) { return n === '1' ? '1 segundo' : n + ' segundos'; });
        }

        function translateTextNode(node) {
            if (!node || node.nodeType !== Node.TEXT_NODE) return;
            const text = node.nodeValue;
            if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) return;
            if (translatedValues.get(node) === text) return;
            if (isElementExcluded(node.parentElement)) return;

            const trimmed = text.trim();
            if (!trimmed) return;

            let replacement = map.get(trimmed);
            if (!replacement) {
                const norm = trimmed.replace(/\\s+/g, ' ');
                replacement = map.get(norm);
            }
            if (!replacement && trimmed.endsWith(':')) {
                const withoutColon = trimmed.slice(0, -1).trim();
                const trans = map.get(withoutColon);
                if (trans) replacement = trans + ':';
            }

            // Fallback case-insensitive apenas para sentenças ou termos iniciados em maiúsculas (nunca identificadores curtos em minúsculas)
            if (!replacement && (trimmed.length > 5 || /[A-Z]/.test(trimmed))) {
                const lower = trimmed.toLowerCase();
                replacement = lowerMap.get(lower);
                if (!replacement && trimmed.endsWith(':')) {
                    const withoutColon = lower.slice(0, -1).trim();
                    const trans = lowerMap.get(withoutColon);
                    if (trans) replacement = trans + ':';
                }
            }

            // Nível/potência de modelos (ex: "Gemini 3.8 Flash High" -> "Gemini 3.8 Flash Alta")
            if (!replacement) {
                const modelTierMatch = trimmed.match(/^(.+?)(\\s+)(\\(?(?:High|Medium|Low|Minimal)\\)?)$/i);
                if (modelTierMatch) {
                    const prefix = modelTierMatch[1];
                    const space = modelTierMatch[2];
                    const tier = modelTierMatch[3];
                    const tierClean = tier.replace(/[()]/g, '');
                    const tierMap = {
                        'High': 'Alta', 'high': 'Alta',
                        'Medium': 'Média', 'medium': 'Média',
                        'Low': 'Baixa', 'low': 'Baixa',
                        'Minimal': 'Mínima', 'minimal': 'Mínima'
                    };
                    if (tierMap[tierClean]) {
                        const isLikelyModel = 
                            /(\\b(?:Flash|Pro|Sonnet|Opus|Haiku|GPT|Preview|Thinking|Gemini|Claude|DeepSeek|Llama|Qwen|Mistral|Codestral|o1|o3|o4|Model|OSS|Argon)\\b)/i.test(prefix) ||
                            (node.parentElement && node.parentElement.closest && !!node.parentElement.closest('[aria-label*=\"model\" i], [aria-label*=\"modelo\" i], [class*=\"model\" i], [id*=\"model\" i], [data-testid*=\"model\" i], button, [role=\"button\"], [role=\"menuitem\"], [role=\"option\"]'));

                        if (isLikelyModel) {
                            const translatedTier = tier.startsWith('(') ? '(' + tierMap[tierClean] + ')' : tierMap[tierClean];
                            const translatedPrefix = map.get(prefix) || prefix;
                            replacement = translatedPrefix + space + translatedTier;
                        }
                    }
                }
            }

            // Frases dinâmicas de cota / Créditos de IA (Argon)
            if (!replacement) {
                const quotaMatch = trimmed.match(/^Your plan's baseline quota will refresh on (.+?)\\.?$/i);
                if (quotaMatch) {
                    replacement = 'A cota básica do seu plano será renovada em ' + quotaMatch[1] + '.';
                }
            }
            if (!replacement) {
                const creditMatch = trimmed.match(/^You need (?:at least (\\d+)|more) AI Credits to send messages\\. To continue using (.+?) now, purchase more AI Credits\\.?$/i);
                if (creditMatch) {
                    const amount = creditMatch[1];
                    const modelName = creditMatch[2];
                    const qtyStr = amount ? ('pelo menos ' + amount) : 'mais';
                    replacement = 'Você precisa de ' + qtyStr + ' Créditos de IA para enviar mensagens. Para continuar usando ' + modelName + ' agora, compre mais Créditos de IA.';
                }
            }
            if (!replacement) {
                const overageMatch = trimmed.match(/^To continue using (.+?) now, enable AI Credit overages\\.?$/i);
                if (overageMatch) {
                    replacement = 'Para continuar usando ' + overageMatch[1] + ' agora, ative os excedentes de Crédito de IA.';
                }
            }

            // Títulos de cota de modelo (ex: "Gemini 4 Argon Weekly Limit" -> "Limite Semanal do Gemini 4 Argon")
            if (!replacement) {
                const limitTitleMatch = trimmed.match(/^(.+?)\\s+(Weekly|5-Hour|Five-Hour|Daily|Monthly)\\s+Limit$/i);
                if (limitTitleMatch) {
                    const modelName = limitTitleMatch[1];
                    const period = limitTitleMatch[2].toLowerCase();
                    const periodMap = {
                        'weekly': 'Semanal',
                        '5-hour': 'de 5 Horas',
                        'five-hour': 'de 5 Horas',
                        'daily': 'Diário',
                        'monthly': 'Mensal'
                    };
                    const transPeriod = periodMap[period] || period;
                    const transModel = map.get(modelName) || modelName;
                    replacement = 'Limite ' + transPeriod + ' do ' + transModel;
                }
            }

            // Descrição dinâmica de cota (ex: "You have used some of your weekly limit, it will fully refresh in 1 day, 8 hours.")
            if (!replacement) {
                const quotaUsageMatch = trimmed.match(/^You have (?:(used)(?:\\s+(some|all|most))?|(exhausted)|(reached))\\s+(?:of\\s+)?your\\s+([a-zA-Z0-9-]+)\\s+limit,\\s*it\\s+will\\s+fully\\s+refresh\\s+in\\s+(.+?)\\.?$/i);
                if (quotaUsageMatch) {
                    const action = (quotaUsageMatch[1] || quotaUsageMatch[3] || quotaUsageMatch[4] || '').toLowerCase();
                    const quant = (quotaUsageMatch[2] || '').toLowerCase();
                    const limitType = (quotaUsageMatch[5] || '').toLowerCase();
                    const duration = translateDuration(quotaUsageMatch[6]);

                    const limitMap = {
                        'weekly': 'semanal',
                        '5-hour': 'de 5 horas',
                        'five-hour': 'de 5 horas',
                        'daily': 'diário',
                        'monthly': 'mensal'
                    };
                    const transLimit = limitMap[limitType] || ('de ' + limitType);

                    let prefix = 'Você utilizou parte do';
                    if (action === 'exhausted') {
                        prefix = 'Você esgotou o';
                    } else if (action === 'reached') {
                        prefix = 'Você atingiu o';
                    } else if (quant === 'all') {
                        prefix = 'Você utilizou todo o';
                    } else if (quant === 'most') {
                        prefix = 'Você utilizou a maior parte do';
                    } else if (!quant) {
                        prefix = 'Você utilizou o';
                    }

                    replacement = prefix + ' seu limite ' + transLimit + ', ele será totalmente renovado em ' + duration + '.';
                }
            }

            // Subtexto de renovação de modelo ("Resets in 4h 35m", "Refreshes in <1m")
            if (!replacement) {
                const resetsMatch = trimmed.match(/^(?:Resets|Refreshes)\\s+in\\s+(.+)$/i);
                if (resetsMatch) {
                    replacement = 'Renova em ' + translateDuration(resetsMatch[1]);
                }
            }

            if (!replacement) {
                const refreshOnlyMatch = trimmed.match(/^(?:It|Your\\s+limit)\\s+will\\s+fully\\s+refresh\\s+in\\s+(.+?)\\.?$/i);
                if (refreshOnlyMatch) {
                    replacement = 'Ele será totalmente renovado em ' + translateDuration(refreshOnlyMatch[1]) + '.';
                }
            }

            if (replacement && replacement !== trimmed) {
                const newText = text.replace(trimmed, replacement);
                translatedValues.set(node, newText);
                isMutating = true;
                try {
                    node.nodeValue = newText;
                } finally {
                    isMutating = false;
                }
            }
        }

        function translateAttributes(el) {
            if (!el || el.nodeType !== Node.ELEMENT_NODE || !el.hasAttributes || !el.hasAttributes()) return;
            if (isElementExcluded(el)) return;

            const attrs = ['aria-label', 'placeholder', 'title'];
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (!el.hasAttribute(attr)) continue;
                const val = el.getAttribute(attr);
                if (!val || val.length < 2 || !/[a-zA-Z]/.test(val)) continue;

                if (attr === 'aria-label' && val.startsWith('Select model, current: ')) {
                    let modelName = val.replace('Select model, current: ', '');
                    modelName = modelName
                        .replace(/\\bHigh\\b/gi, 'Alta')
                        .replace(/\\bMedium\\b/gi, 'Média')
                        .replace(/\\bLow\\b/gi, 'Baixa')
                        .replace(/\\bMinimal\\b/gi, 'Mínima');
                    const newVal = 'Selecionar modelo, atual: ' + modelName;
                    if (newVal !== val) {
                        isMutating = true;
                        try {
                            el.setAttribute(attr, newVal);
                        } finally {
                            isMutating = false;
                        }
                    }
                    continue;
                }

                const trimmed = val.trim();
                let replacement = map.get(trimmed) || lowerMap.get(trimmed.toLowerCase());
                if (!replacement) {
                    const norm = trimmed.replace(/\\s+/g, ' ');
                    replacement = map.get(norm) || lowerMap.get(norm.toLowerCase());
                }
                if (replacement && replacement !== trimmed) {
                    const newVal = val.replace(trimmed, replacement);
                    if (newVal !== val) {
                        isMutating = true;
                        try {
                            el.setAttribute(attr, newVal);
                        } finally {
                            isMutating = false;
                        }
                    }
                }
            }
        }

        function walk(root) {
            if (!root) return;
            if (root.nodeType === Node.TEXT_NODE) {
                translateTextNode(root);
                return;
            }
            if (root.nodeType === Node.ELEMENT_NODE) {
                if (isElementExcluded(root)) return;
                if (root.hasAttributes && root.hasAttributes()) {
                    translateAttributes(root);
                }
                let child = root.firstChild;
                while (child) {
                    walk(child);
                    child = child.nextSibling;
                }
            }
        }

        function translateTitle() {
            if (!document.title) return;
            const parts = document.title.split(' - ');
            let changed = false;
            for (let i = 0; i < parts.length; i++) {
                const t = parts[i].trim();
                const trans = map.get(t) || lowerMap.get(t.toLowerCase());
                if (trans) {
                    parts[i] = trans;
                    changed = true;
                }
            }
            if (changed) {
                document.title = parts.join(' - ');
            }
        }

        function init() {
            if (!document.body) {
                setTimeout(init, 50);
                return;
            }

            walk(document.body);
            translateTitle();
            setTimeout(() => { if (document.body) { walk(document.body); translateTitle(); } }, 400);
            setTimeout(() => { if (document.body) { walk(document.body); translateTitle(); } }, 1500);

            const observer = new MutationObserver((mutations) => {
                if (isMutating) return;
                for (let i = 0; i < mutations.length; i++) {
                    const m = mutations[i];
                    if (m.type === 'characterData') {
                        translateTextNode(m.target);
                    } else if (m.type === 'childList') {
                        const added = m.addedNodes;
                        for (let j = 0; j < added.length; j++) {
                            walk(added[j]);
                        }
                    } else if (m.type === 'attributes') {
                        translateAttributes(m.target);
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['title', 'placeholder', 'aria-label']
            });

            // Otimização de eventos: tradução cirúrgica de menus e tooltips sem varrer todo o document.body
            window.addEventListener('click', () => {
                setTimeout(() => {
                    const popovers = document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], [data-radix-popper-content-wrapper]');
                    for (let i = 0; i < popovers.length; i++) {
                        walk(popovers[i]);
                    }
                }, 80);
            }, true);

            window.addEventListener('mouseover', (e) => {
                const target = e.target;
                if (!target || typeof target.closest !== 'function') return;
                const tooltip = target.closest('[role="tooltip"], .react-tooltip, .compact-tooltip');
                if (tooltip) {
                    walk(tooltip);
                }
            }, true);

            window.__antigravity_ptbr_walk = () => {
                if (document.body) {
                    walk(document.body);
                    translateTitle();
                }
            };
        }

        init();
    } catch (e) {
        console.error('[Antigravity-PTBR] Preload localization error:', e);
    }
})();
${SIGNATURE_END}`;
}

async function run() {
    checkRunningProcesses();
    const resDir = findResourcesDir();
    const asarPath = path.join(resDir, 'app.asar');
    const backupPath = path.join(resDir, 'app.asar.bak');

    if (!fs.existsSync(asarPath)) {
        throw new Error(`app.asar não encontrado em ${asarPath}`);
    }

    if (IS_UNINSTALL) {
        log('Restaurando versão original do Antigravity...');
        if (!fs.existsSync(backupPath)) {
            log('Aviso: app.asar.bak não encontrado. Nada a restaurar.');
            return;
        }
        try {
            fs.copyFileSync(backupPath, asarPath);
        } catch (e) {
            if (e.code === 'EACCES' || e.code === 'EPERM') {
                throw new Error(`Permissão negada ao restaurar ${asarPath}. Execute com privilégios de administrador (sudo no Linux/macOS, ou como Administrador no Windows).`);
            }
            throw e;
        }
        if (process.platform !== 'win32') {
            try { fs.chmodSync(asarPath, 0o644); } catch (_) {}
        }
        if (process.platform === 'darwin') {
            const appBundle = resDir.includes('.app') ? resDir.replace(/\/Contents\/Resources.*$/, '') : '/Applications/Antigravity.app';
            if (fs.existsSync(appBundle)) {
                try {
                    child_process.execSync(`codesign --force --deep --sign - "${appBundle}"`, { stdio: 'pipe' });
                } catch (_) {}
            }
        }
        log('Restauração concluída com sucesso! Antigravity voltou ao padrão oficial.');
        return;
    }

    log('Iniciando aplicação da tradução em Português (pt-BR)...');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-ptbr-'));
    let packedAsar = null;

    try {
        log(`Extraindo app.asar para ${tempDir}...`);
        const asarCmd = getAsarCmd();
        child_process.execSync(`${asarCmd} extract "${asarPath}" "${tempDir}"`, { stdio: 'pipe' });

        // Limpeza prévia de injeções anteriores para garantir integridade
        const preloadPath = path.join(tempDir, 'dist', 'preload.js');
        if (fs.existsSync(preloadPath)) {
            let content = fs.readFileSync(preloadPath, 'utf-8');
            if (content.includes(SIGNATURE_START)) {
                const sIdx = content.indexOf(SIGNATURE_START);
                const eIdx = content.indexOf(SIGNATURE_END) + SIGNATURE_END.length;
                content = content.slice(0, sIdx) + content.slice(eIdx);
                fs.writeFileSync(preloadPath, content, 'utf-8');
            }
        }

        const wizardPreloadPath = path.join(tempDir, 'dist', 'ideInstall', 'wizardPreload.js');
        if (fs.existsSync(wizardPreloadPath)) {
            let content = fs.readFileSync(wizardPreloadPath, 'utf-8');
            if (content.includes(SIGNATURE_START)) {
                const sIdx = content.indexOf(SIGNATURE_START);
                const eIdx = content.indexOf(SIGNATURE_END) + SIGNATURE_END.length;
                content = content.slice(0, sIdx) + content.slice(eIdx);
                fs.writeFileSync(wizardPreloadPath, content, 'utf-8');
            }
        }

        const menuPath = path.join(tempDir, 'dist', 'menu.js');
        if (fs.existsSync(menuPath)) {
            let content = fs.readFileSync(menuPath, 'utf-8');
            if (content.includes('/* PTBR_MENU_INJECTION */')) {
                const mStart = content.indexOf('/* PTBR_MENU_INJECTION */');
                const mEnd = content.indexOf('/* PTBR_MENU_INJECTION_END */') + '/* PTBR_MENU_INJECTION_END */'.length;
                content = content.slice(0, mStart) + content.slice(mEnd);
                fs.writeFileSync(menuPath, content, 'utf-8');
            }
        }

        const trayPath = path.join(tempDir, 'dist', 'tray.js');
        if (fs.existsSync(trayPath)) {
            let content = fs.readFileSync(trayPath, 'utf-8');
            content = content.replace(/\/\* --- ANTIGRAVITY PT-BR TRAY START --- \*\/[\s\S]*?\/\* --- ANTIGRAVITY PT-BR TRAY END --- \*\/\s*/g, '');
            while (content.includes("act.label === 'No agents running'")) {
                content = content.replace(/\s*if\s*\(Array\.isArray\(actions\)\)\s*\{[\s\S]*?act\.label\s*===\s*'Reopen Locally'[\s\S]*?\}\s*\}\s*\}/, '');
            }
            fs.writeFileSync(trayPath, content, 'utf-8');
        }

        // 1. Gerenciamento inteligente e seguro do backup oficial
        let currentVersion = '2.0.0';
        try {
            const pkgJson = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'));
            if (pkgJson.version) currentVersion = pkgJson.version;
        } catch (_) {}

        let shouldCreateBackup = !fs.existsSync(backupPath);
        if (!shouldCreateBackup) {
            const asarMod = getAsarModule();
            if (asarMod) {
                try {
                    const bakPkg = JSON.parse(asarMod.extractFile(backupPath, 'package.json').toString('utf-8'));
                    if (bakPkg.version && bakPkg.version !== currentVersion) {
                        log(`Backup oficial existente (${bakPkg.version}) difere da versão atual (${currentVersion}). Atualizando backup...`);
                        shouldCreateBackup = true;
                    }
                } catch (_) {
                    shouldCreateBackup = true;
                }
            }
        }

        if (shouldCreateBackup) {
            log(`Criando backup oficial limpo (${currentVersion}) em ${backupPath}...`);
            const bakTemp = path.join(os.tmpdir(), `antigravity-bak-${Date.now()}.asar`);
            child_process.execSync(`${asarCmd} pack "${tempDir}" "${bakTemp}" --unpack-dir "**/node_modules/chrome-devtools-mcp/**"`, { stdio: 'pipe' });
            try {
                fs.copyFileSync(bakTemp, backupPath);
            } catch (e) {
                if (e.code === 'EACCES' || e.code === 'EPERM') {
                    throw new Error(`Permissão negada ao criar backup em ${backupPath}. Execute com privilégios de administrador (sudo no Linux/macOS, ou como Administrador no Windows).`);
                }
                throw e;
            } finally {
                try { fs.rmSync(bakTemp, { force: true }); } catch (_) {}
                try { fs.rmSync(`${bakTemp}.unpacked`, { recursive: true, force: true }); } catch (_) {}
            }
        }

        // 2. Carregar dicionários
        log('Carregando dicionários pt-BR...');
        const dict = loadDictionaries();
        log(`Total de termos carregados no dicionário: ${Object.keys(dict).length}`);
        const preloadScript = buildPreloadScript(dict);

        // 3. Injetar no dist/preload.js
        if (fs.existsSync(preloadPath)) {
            log('Injetando motor de tradução no preload.js...');
            let preloadContent = fs.readFileSync(preloadPath, 'utf-8');
            preloadContent += '\n' + preloadScript;
            fs.writeFileSync(preloadPath, preloadContent, 'utf-8');
        }

        // 4. Injetar no dist/ideInstall/wizardPreload.js (Assistente de Instalação/Boas-vindas)
        if (fs.existsSync(wizardPreloadPath)) {
            log('Injetando motor de tradução no assistente de instalação (wizardPreload.js)...');
            let wizardContent = fs.readFileSync(wizardPreloadPath, 'utf-8');
            wizardContent += '\n' + preloadScript;
            fs.writeFileSync(wizardPreloadPath, wizardContent, 'utf-8');
        }

        // 5. Injetar tradução do menu do aplicativo em dist/menu.js
        if (fs.existsSync(menuPath)) {
            log('Injetando tradução no menu do aplicativo (dist/menu.js)...');
            let menuContent = fs.readFileSync(menuPath, 'utf-8');
            const menuInjection = `
/* PTBR_MENU_INJECTION */
const _PTBR_MENU_DICT = {
    "File": "Arquivo",
    "Edit": "Editar",
    "View": "Exibir",
    "Window": "Janela",
    "Help": "Ajuda",
    "New Window": "Nova Janela",
    "Close Window": "Fechar Janela",
    "Close Tab": "Fechar Aba",
    "Check for Updates": "Verificar Atualizações",
    "Docs": "Documentação",
    "Documentation": "Documentação",
    "Connect to WSL": "Conectar ao WSL",
    "Reopen Locally": "Reabrir Localmente",
    "Undo": "Desfazer",
    "Redo": "Refazer",
    "Cut": "Recortar",
    "Copy": "Copiar",
    "Paste": "Colar",
    "Paste and Match Style": "Colar e Manter Estilo",
    "Delete": "Excluir",
    "Select All": "Selecionar Tudo",
    "Reload": "Recarregar",
    "Force Reload": "Forçar Recarregamento",
    "Toggle Developer Tools": "Alternar Ferramentas do Desenvolvedor",
    "Actual Size": "Tamanho Real",
    "Zoom In": "Aumentar Zoom",
    "Zoom Out": "Diminuir Zoom",
    "Reset Zoom": "Redefinir Zoom",
    "Toggle Full Screen": "Alternar Tela Cheia",
    "Minimize": "Minimizar",
    "Zoom": "Zoom",
    "Close": "Fechar",
    "Quit": "Sair",
    "Quit Antigravity": "Sair do Antigravity",
    "About Antigravity": "Sobre o Antigravity",
    "About": "Sobre",
    "Services": "Serviços",
    "Hide Antigravity": "Ocultar Antigravity",
    "Hide Others": "Ocultar Outros",
    "Show All": "Mostrar Tudo",
    "Open Antigravity": "Abrir Antigravity",
    "No agents running": "Nenhum agente em execução"
};

const _PTBR_ROLE_DICT = {
    "undo": "Desfazer",
    "redo": "Refazer",
    "cut": "Recortar",
    "copy": "Copiar",
    "paste": "Colar",
    "pasteandmatchstyle": "Colar e Manter Estilo",
    "delete": "Excluir",
    "selectall": "Selecionar Tudo",
    "reload": "Recarregar",
    "forcereload": "Forçar Recarregamento",
    "toggledevtools": "Alternar Ferramentas do Desenvolvedor",
    "actualsize": "Tamanho Real",
    "resetzoom": "Redefinir Zoom",
    "zoomin": "Aumentar Zoom",
    "zoomout": "Diminuir Zoom",
    "togglefullscreen": "Alternar Tela Cheia",
    "window": "Janela",
    "minimize": "Minimizar",
    "close": "Fechar",
    "help": "Ajuda",
    "about": "Sobre",
    "services": "Serviços",
    "hide": "Ocultar Antigravity",
    "hideothers": "Ocultar Outros",
    "unhide": "Mostrar Tudo",
    "quit": "Sair"
};

function _translateMenuTree(menuInstance) {
    if (!menuInstance || !menuInstance.items) return;
    for (const item of menuInstance.items) {
        if (item.label) {
            const trimmed = item.label.trim();
            if (_PTBR_MENU_DICT[trimmed]) {
                item.label = _PTBR_MENU_DICT[trimmed];
            }
        } else if (item.role) {
            const r = item.role.toLowerCase();
            if (_PTBR_ROLE_DICT[r]) {
                item.label = _PTBR_ROLE_DICT[r];
            }
        }
        if (item.submenu) {
            _translateMenuTree(item.submenu);
        }
    }
}
/* PTBR_MENU_INJECTION_END */
`;
            menuContent = menuInjection + '\n' + menuContent;

            menuContent = menuContent.replace(
                `const submenuItem = appMenu.items.find((item) => item.label === submenuLabel);`,
                `const submenuItem = appMenu.items.find((item) => item.label === submenuLabel || (_PTBR_MENU_DICT[submenuLabel] && item.label === _PTBR_MENU_DICT[submenuLabel]));`
            );

            menuContent = menuContent.replace(
                /electron_1\.Menu\.setApplicationMenu\(menu\);/g,
                `_translateMenuTree(menu); electron_1.Menu.setApplicationMenu(menu);`
            );

            fs.writeFileSync(menuPath, menuContent, 'utf-8');
        }

        // 6. Injetar tradução da bandeja do sistema (tray) e botão Reiniciar em dist/tray.js
        if (fs.existsSync(trayPath)) {
            log('Injetando tradução e botão Reiniciar na bandeja do sistema (dist/tray.js)...');
            let trayContent = fs.readFileSync(trayPath, 'utf-8');

            const buildTemplateTarget = 'contextMenu = electron_1.Menu.buildFromTemplate(actions);';
            const newTrayInjection = `/* --- ANTIGRAVITY PT-BR TRAY START --- */
    if (Array.isArray(actions)) {
        for (const act of actions) {
            if (act.label) {
                if (act.label === 'No agents running') act.label = 'Nenhum agente em execução';
                else if (act.label.startsWith('Open ')) act.label = 'Abrir ' + act.label.slice(5);
                else if (act.label === 'Quit') act.label = 'Sair';
                else if (act.label === 'Connect to WSL') act.label = 'Conectar ao WSL';
                else if (act.label === 'Reopen Locally') act.label = 'Reabrir Localmente';
            }
        }
        const hasRestart = actions.some(act => act.id === 'restart-app' || act.label === 'Reiniciar');
        if (!hasRestart) {
            const quitIndex = actions.findIndex(act => act.label === 'Sair' || act.label === 'Quit');
            const restartItem = {
                id: 'restart-app',
                label: 'Reiniciar',
                click: () => {
                    try {
                        (0, utils_1.setShowQuitConfirmation)(false);
                    } catch (_) {}
                    electron_1.app.relaunch();
                    electron_1.app.quit();
                }
            };
            if (quitIndex !== -1) {
                actions.splice(quitIndex, 0, restartItem);
            } else {
                actions.push(restartItem);
            }
        }
    }
/* --- ANTIGRAVITY PT-BR TRAY END --- */
    contextMenu = electron_1.Menu.buildFromTemplate(actions);`;

            if (trayContent.includes(buildTemplateTarget)) {
                trayContent = trayContent.replace(buildTemplateTarget, newTrayInjection);
            }

            const trayRegex = /countItem\.label\s*=\s*[\s\S]*?' running';/;
            if (trayRegex.test(trayContent)) {
                trayContent = trayContent.replace(trayRegex, `countItem.label = count > 0 ? \`\${count} agente\${count === 1 ? '' : 's'} em execução\` : 'Nenhum agente em execução';`);
            }

            fs.writeFileSync(trayPath, trayContent, 'utf-8');
        }

        // 7. Recompactar app.asar
        log('Reempacotando app.asar traduzido...');
        packedAsar = path.join(os.tmpdir(), `antigravity-repacked-${Date.now()}.asar`);
        child_process.execSync(`${asarCmd} pack "${tempDir}" "${packedAsar}" --unpack-dir "**/node_modules/chrome-devtools-mcp/**"`, { stdio: 'pipe' });

        if (!fs.existsSync(packedAsar)) {
            throw new Error('Falha ao empacotar: repacked.asar não foi gerado.');
        }
        const stat = fs.statSync(packedAsar);
        if (stat.size < 1000000) {
            throw new Error(`Arquivo gerado repacked.asar parece corrompido ou incompleto (${stat.size} bytes). Operação abortada para segurança.`);
        }

        try {
            fs.copyFileSync(packedAsar, asarPath);
        } catch (e) {
            if (e.code === 'EACCES' || e.code === 'EPERM') {
                throw new Error(`Permissão negada ao gravar em ${asarPath}. Execute com privilégios de administrador (sudo no Linux/macOS, ou como Administrador no Windows).`);
            }
            throw e;
        }

        if (process.platform !== 'win32') {
            try { fs.chmodSync(asarPath, 0o644); } catch (_) {}
        }

        // Assinatura de código ad-hoc no macOS para evitar que o Gatekeeper bloqueie o app
        if (process.platform === 'darwin') {
            const appBundle = resDir.includes('.app') ? resDir.replace(/\/Contents\/Resources.*$/, '') : '/Applications/Antigravity.app';
            if (fs.existsSync(appBundle)) {
                log(`Assinando aplicativo ad-hoc no macOS (${appBundle})...`);
                try {
                    child_process.execSync(`xattr -cr "${appBundle}"`, { stdio: 'pipe' });
                    child_process.execSync(`codesign --force --deep --sign - "${appBundle}"`, { stdio: 'pipe' });
                    log('Assinatura ad-hoc aplicada com sucesso no macOS.');
                } catch (err) {
                    log(`Aviso ao re-assinar no macOS: ${err.message}.`);
                }
            }
        }

        log('Tradução em Português (pt-BR) aplicada com sucesso no Antigravity 2.0!');
    } finally {
        if (packedAsar) {
            try { fs.rmSync(packedAsar, { force: true }); } catch (_) {}
            try { fs.rmSync(`${packedAsar}.unpacked`, { recursive: true, force: true }); } catch (_) {}
        }
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
}

run().catch((err) => {
    error(err.message);
    process.exit(1);
});
