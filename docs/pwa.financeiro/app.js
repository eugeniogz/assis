const fileContentTextArea = document.getElementById('fileContent');
const statusMessage = document.getElementById('statusMessage');
const password = document.getElementById('password');
const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--red)' : 'var(--green)';
}

// IndexedDB helpers (mantém openDb, OBJECT_STORE_NAME, db)
let db;
const OBJECT_STORE_NAME = 'fileHandles';

async function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('myPWAFileDB', 1);
        request.onerror = (event) => reject("Erro ao abrir IndexedDB");
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                db.createObjectStore(OBJECT_STORE_NAME);
            }
        };
    });
}

// OFX Import
const importOfxBtn = document.getElementById('importOfxBtn');
const ofxInput = document.getElementById('ofxInput');

importOfxBtn.addEventListener('click', () => {
    ofxInput.value = '';
    ofxInput.click();
});

ofxInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showStatus(`Lendo arquivo OFX: ${file.name}`);

    const ofxText = await file.text();

    // Parse simples do OFX
    const transactions = [];
    const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;
    while ((match = regex.exec(ofxText)) !== null) {
        const trn = {};
        const fields = ['TRNTYPE', 'DTPOSTED', 'TRNAMT', 'MEMO'];
        for (const field of fields) {
            const fieldRegex = new RegExp(`<${field}>([^<\n\r]*)`);
            const fieldMatch = fieldRegex.exec(match[1]);
            if (fieldMatch) trn[field] = fieldMatch[1];
        }
        transactions.push(trn);
    }

    await openDb();
    let dadosCript = await new Promise((resolve) => {
        const tx = db.transaction([OBJECT_STORE_NAME], 'readonly');
        const store = tx.objectStore(OBJECT_STORE_NAME);
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    let dados = [];
    if (dadosCript) {
        try {
            dados = JSON.parse(sjcl.decrypt(password.value, dadosCript));
        } catch (e) {
            showStatus('Senha inválida ou dados corrompidos.', true);
            return;
        }
    }

    // Adicionar novas transações (evitar duplicatas simples)
    const novas = transactions.filter(trn =>
        !dados.some(d => d.DTPOSTED === trn.DTPOSTED && d.TRNAMT === trn.TRNAMT && d.MEMO === trn.MEMO)
    );
    dados = dados.concat(novas);

    // Criptografar e salvar no IndexedDB
    const dadosCriptografados = sjcl.encrypt(password.value, JSON.stringify(dados));
    await new Promise((resolve) => {
        const tx = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = tx.objectStore(OBJECT_STORE_NAME);
        store.put(dadosCriptografados, 'ofxData');
        tx.oncomplete = resolve;
    });

    showStatus(`Importação concluída: ${novas.length} novas transações.`);

    // Exibe o JSON atualizado no textarea
    fileContentTextArea.value = JSON.stringify(dados, null, 2);

    alert('Arquivo processado! Mova manualmente para /tmp: ' + file.name);
});

// Exibir JSON ao checar senha
verifyPasswordBtn.addEventListener('click', async () => {
    await openDb();
    let dadosCript = await new Promise((resolve) => {
        const tx = db.transaction([OBJECT_STORE_NAME], 'readonly');
        const store = tx.objectStore(OBJECT_STORE_NAME);
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    if (!dadosCript) {
        showStatus('Nenhum dado OFX importado ainda.', true);
        fileContentTextArea.value = '';
        return;
    }

    try {
        const dados = JSON.parse(sjcl.decrypt(password.value, dadosCript));
        fileContentTextArea.value = JSON.stringify(dados, null, 2);
        showStatus('Dados carregados.');
    } catch (e) {
        showStatus('Senha inválida ou dados corrompidos.', true);
        fileContentTextArea.value = '';
    }
});

// Desabilite edição do textarea
fileContentTextArea.disabled = true;