const fileContentTextArea = document.getElementById('fileContent');
const statusMessage = document.getElementById('statusMessage');
const password = document.getElementById('password');
const showJsonBtn = document.getElementById('showJsonBtn');
const passwordBtn = document.getElementById('passwordBtn');

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--red)' : 'var(--green)';
}

// IndexedDB helpers (mantém openDb, OBJECT_STORE_NAME, findb)
// let findb;

async function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('myPWAFileDB', 1);
        request.onerror = (event) => reject("Erro ao abrir IndexedDB");
        request.onsuccess = (event) => {
            findb = event.target.result;
            resolve(findb);
        };
        request.onupgradeneeded = (event) => {
            findb = event.target.result;
            if (!findb.objectStoreNames.contains('fileHandles')) {
                findb.createObjectStore('fileHandles');
            }
        };
    });
}

// OFX Import
const importOfxBtn = document.getElementById('importOfxBtn');
const ofxInput = document.getElementById('ofxInput');

passwordBtn.addEventListener('click', async () => {
    if (password.value === '') {
        showStatus('Senha não pode ser vazia.', true);
        return;
    }
    try {
        await openDb();
        let dadosCript = await new Promise((resolve) => {
            const tx = findb.transaction(['fileHandles'], 'readonly');
            const store = tx.objectStore('fileHandles');
            const req = store.get('ofxData');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });

        if (dadosCript) {
            try {
                dados = decrypt(password.value, dadosCript);
            } catch (e) {
                showStatus(e.getmessage, true);
                return;
            }
        }

        showPieChartBtn.click(); // Exibe a página do dashboard
    } catch (e) {
        showStatus('Erro ao acessar o banco de dados: ' + e.message, true);
    }
});

importOfxBtn.addEventListener('click', () => {
    ofxInput.value = '';
    ofxInput.click();
});

function decrypt(password, dadosCript) {
    try {
        return JSON.parse(sjcl.decrypt(password, dadosCript));
    } catch (e) {
        if (password === '') {
            throw new Error('Senha não pode ser vazia.');
        } else {
            throw new Error('Senha inválida ou dados corrompidos.');
        }
    }
}

ofxInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showStatus(`Lendo arquivo OFX: ${file.name}`);

    const ofxText = await file.text();

    // Detecta origem do extrato
    let origem = 'conta';
    if (ofxText.includes('<CREDITCARDMSGSRSV1>')) {
        origem = 'cartao';
    }

    // Parse simples do OFX
    const transactions = [];
    const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;
    while ((match = regex.exec(ofxText)) !== null) {
        const trn = { origem }; // Adiciona campo origem
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
        const tx = findb.transaction(['fileHandles'], 'readonly');
        const store = tx.objectStore('fileHandles');
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    let dados = [];
    if (dadosCript) {
        try {
            dados = decrypt(password.value, dadosCript);
        } catch (e) {
            showStatus(e.getmessage, true);
            return;
        }
    }

    // Adicionar novas transações (evitar duplicatas simples)
    const novas = transactions.filter(trn =>
        !dados.some(d => d.DTPOSTED === trn.DTPOSTED && d.TRNAMT === trn.TRNAMT && d.MEMO === trn.MEMO)
    );
    dados = dados.concat(novas);

    // Criptografar e salvar no IndexedDB
    if (password.value === '') {
        showStatus('Senha não pode ser vazia.', true);
        return;
    }
    const dadosCriptografados = sjcl.encrypt(password.value, JSON.stringify(dados));
    await new Promise((resolve) => {
        const tx = findb.transaction(['fileHandles'], 'readwrite');
        const store = tx.objectStore('fileHandles');
        store.put(dadosCriptografados, 'ofxData');
        tx.oncomplete = resolve;
    });

    showStatus(`Importação concluída: ${novas.length} novas transações.`);

    // Exibe o JSON atualizado no textarea
    fileContentTextArea.value = JSON.stringify(dados, null, 2);

    alert('Arquivo processado! Mova manualmente para /tmp: ' + file.name);
});

// Exibir JSON ao checar senha
showJsonBtn.addEventListener('click', async () => {
    await openDb();
    let dadosCript = await new Promise((resolve) => {
        const tx = findb.transaction(['fileHandles'], 'readonly');
        const store = tx.objectStore('fileHandles');
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
        const dados = decrypt(password.value, dadosCript);
        fileContentTextArea.value = JSON.stringify(dados, null, 2);
        showPage('jsonViewPage');
    } catch (e) {
        fileContentTextArea.value = '';
        showStatus(e.getmessage, true);
    }
});

// Desabilite edição do textarea
fileContentTextArea.disabled = true;

const backupBtn = document.getElementById('backupBtn');
const restoreBtn = document.getElementById('restoreBtn');
const restoreInput = document.getElementById('restoreInput');

//  : exporta o dado criptografado como arquivo .json
backupBtn.addEventListener('click', async () => {
    await openDb();
    const tx = findb.transaction(['fileHandles'], 'readonly');
    const store = tx.objectStore('fileHandles');
    const req = store.get('ofxData');
    req.onsuccess = () => {
        if (!req.result) {
            showStatus('Nenhum dado para backup.', true);
            return;
        }
        const blob = new Blob([req.result], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financeiro-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('Backup exportado.');
    };
    req.onerror = () => showStatus('Erro ao exportar backup.', true);
});

// Restore: importa arquivo .json e grava no IndexedDB
restoreBtn.addEventListener('click', () => {
    restoreInput.value = '';
    restoreInput.click();
});

restoreInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
        // Testa se é um JSON válido (criptografado)
        decrypt(password.value, text);
        await openDb();
        const tx = findb.transaction(['fileHandles'], 'readwrite');
        const store = tx.objectStore('fileHandles');
        store.put(text, 'ofxData');
        tx.oncomplete = () => {
            showStatus('Backup restaurado com sucesso!');
        };
    } catch (e) {
        showStatus(e.getmessage, true);
    }
});

function showPage(pageId) {
    showStatus('', false);

    // Oculta todos os containers de conteúdo
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });

    // Oculta wrappers específicos
    const passwordWrapper = document.getElementById('password-wraper');
    if (passwordWrapper) {
        passwordWrapper.style.display = 'none';
    }
    
    // Mostra os wrappers fixos que devem estar sempre visíveis
    const topIconsWrapper = document.getElementById('top-icons-wrapper');
    if (topIconsWrapper) {
        topIconsWrapper.style.display = 'flex';
    }

    const bottomWrapper = document.getElementById('bottom-wrapper');
    if (bottomWrapper) {
        bottomWrapper.style.display = 'flex';
    }

    // Tenta exibir a página selecionada somente se ela existir
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.style.display = 'block';
    } else {
        console.error(`Erro: Elemento com o ID "${pageId}" não encontrado.`);
    }

    // Lógicas específicas de cada página
    if (pageId === 'categoryEditPage') {
        renderCategoriesList();
    }
}
