const statusMessage = document.getElementById('statusMessage');
const password = document.getElementById('password');
const showJsonBtn = document.getElementById('showJsonBtn');
const passwordBtn = document.getElementById('passwordBtn');
const transactionsTableContainer = document.getElementById('transactionsTableContainer');
const monthFilter = document.getElementById('monthFilter');
let allTransactions = [];

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--red)' : 'var(--green)';
}

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
            if (!findb.objectStoreNames.contains('financeiro')) {
                findb.createObjectStore('financeiro');
            }
        };
    });
}

// OFX Import
const importOfxBtn = document.getElementById('importOfxBtn');
const ofxInput = document.getElementById('ofxInput');

passwordBtn.addEventListener('click', async function(event) { 
    if (password.value === '') {
        showStatus('Senha não pode ser vazia.', true);
        return;
    }
    try {
        await openDb();
        let dadosCript = await new Promise((resolve) => {
            const tx = findb.transaction(['financeiro'], 'readonly');
            const store = tx.objectStore('financeiro');
            const req = store.get('ofxData');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });

        if (dadosCript) {
            try {
                dados = decrypt(password.value, dadosCript);
            } catch (e) {
                showStatus(e.message, true);
                return;
            }
        }
        loginOk();
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
        const tx = findb.transaction(['financeiro'], 'readonly');
        const store = tx.objectStore('financeiro');
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    let dados = [];
    if (dadosCript) {
        try {
            dados = decrypt(password.value, dadosCript);
        } catch (e) {
            showStatus(e.message, true);
            return;
        }
    }

    // Adicionar novas transações (evitar duplicatas simples)
    const novas = transactions.filter(trn =>
        !dados.some(d => d.DTPOSTED === trn.DTPOSTED && d.TRNAMT === trn.TRNAMT && d.MEMO === trn.MEMO)
    );
    dados = dados.concat(novas);

    // Ordena todos os dados por data (do mais recente para o mais antigo) antes de salvar
    dados.sort((a, b) => (b.DTPOSTED || '').localeCompare(a.DTPOSTED || ''));

    // Criptografar e salvar no IndexedDB
    if (password.value === '') {
        showStatus('Senha não pode ser vazia.', true);
        return;
    }
    const dadosCriptografados = sjcl.encrypt(password.value, JSON.stringify(dados));
    await new Promise((resolve) => {
        const tx = findb.transaction(['financeiro'], 'readwrite');
        const store = tx.objectStore('financeiro');
        store.put(dadosCriptografados, 'ofxData');
        tx.oncomplete = resolve;
    });

    showStatus(`Importação concluída: ${novas.length} novas transações.`);

    alert('Arquivo processado! Mova manualmente para /tmp: ' + file.name);
});

function formatDtPosted(dtPosted) {
    if (!dtPosted || dtPosted.length < 8) return 'N/A';
    const year = dtPosted.substring(2, 4);
    const month = dtPosted.substring(4, 6);
    const day = dtPosted.substring(6, 8);
    return `${day}/${month}/${year}`;
}

function renderTransactionsTable(month) {
    const filteredData = allTransactions.filter(trn => {
        if (!trn.DTPOSTED) return false;
        const trnMonth = trn.DTPOSTED.substring(0, 6); // YYYYMM
        return trnMonth === month.replace('-', '');
    });

    // A ordenação agora é feita ao carregar os dados em `allTransactions`,
    // então a lista `filteredData` já estará na ordem correta.

    if (filteredData.length === 0) {
        transactionsTableContainer.innerHTML = '<p style="text-align: center;">Nenhuma transação para este mês.</p>';
        return;
    }

    let tableHTML = '<table class="transactions-table"><thead><tr><th>Data</th><th>Descrição (MEMO)</th><th>Origem</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead><tbody>';

    filteredData.forEach(trn => {
        const amount = parseFloat(trn.TRNAMT);
        const amountClass = amount < 0 ? 'debit' : 'credit';
        tableHTML += `
            <tr>
                <td>${formatDtPosted(trn.DTPOSTED)}</td>
                <td>${trn.MEMO}</td>
                <td>${trn.origem}</td>
                <td>${trn.TRNTYPE}</td>
                <td class="${amountClass}" style="text-align:right">${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    transactionsTableContainer.innerHTML = tableHTML;
}

showJsonBtn.addEventListener('click', async () => {
    await openDb();
    let dadosCript = await new Promise((resolve) => {
        const tx = findb.transaction(['financeiro'], 'readonly');
        const store = tx.objectStore('financeiro');
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    if (!dadosCript) {
        showStatus('Nenhum dado OFX importado ainda.', true);
        if (transactionsTableContainer) transactionsTableContainer.innerHTML = '';
        if (monthFilter) monthFilter.innerHTML = '';
        return;
    }

    try {
        allTransactions = decrypt(password.value, dadosCript);

        // Garante que os dados estejam sempre ordenados ao serem carregados
        allTransactions.sort((a, b) => (b.DTPOSTED || '').localeCompare(a.DTPOSTED || ''));

        // Populate month filter
        const months = [...new Set(allTransactions.map(trn => (trn.DTPOSTED || '').substring(0, 6)))].filter(m => m);
        months.sort().reverse(); // Newest first

        if (monthFilter) {
            monthFilter.innerHTML = '';
            months.forEach(monthStr => {
                const year = monthStr.substring(0, 4);
                const month = monthStr.substring(4, 6);
                const option = document.createElement('option');
                option.value = `${year}-${month}`;
                option.textContent = `${month}/${year}`;
                monthFilter.appendChild(option);
            });
        }

        if (months.length > 0 && monthFilter) {
            renderTransactionsTable(monthFilter.value);
        } else if (transactionsTableContainer) {
            transactionsTableContainer.innerHTML = '<p style="text-align: center;">Nenhuma transação encontrada.</p>';
        }

        showPage('jsonViewPage');
    } catch (e) {
        if (transactionsTableContainer) transactionsTableContainer.innerHTML = '';
        if (monthFilter) monthFilter.innerHTML = '';
        showStatus(e.message, true);
    }
});

if (monthFilter) {
    monthFilter.addEventListener('change', () => {
        if (allTransactions.length > 0) {
            renderTransactionsTable(monthFilter.value);
        }
    });
}

const backupBtn = document.getElementById('backupBtn');
const restoreBtn = document.getElementById('restoreBtn');
const restoreInput = document.getElementById('restoreInput');

//  : exporta o dado criptografado como arquivo .json
backupBtn.addEventListener('click', async () => {
    await openDb();
    const tx = findb.transaction(['financeiro'], 'readonly');
    const store = tx.objectStore('financeiro');
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
        const tx = findb.transaction(['financeiro'], 'readwrite');
        const store = tx.objectStore('financeiro');
        store.put(text, 'ofxData');
        tx.oncomplete = () => {
            showStatus('Backup restaurado com sucesso!');
        };
    } catch (e) {
        showStatus(e.message, true);
    }
});

function loginOk() {
    // Oculta wrappers específicos
    const passwordWrapper = document.getElementById('password-wrapper');
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

}
function showPage(pageId) {
    showStatus('', false);
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });

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
