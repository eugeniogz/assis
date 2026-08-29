// DOM Elements
const selectFileBtn = document.getElementById('selectFileBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const clearHandleBtn = document.getElementById('clearHandleBtn');
const fileContentTextArea = document.getElementById('fileContent');
const statusMessage = document.getElementById('statusMessage');
const statusCard = document.getElementById('statusCard');
const passwordInput = document.getElementById('password');
const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const activeFileName = document.getElementById('activeFileName');
const fileChip = document.getElementById('fileChip');
const charCountSpan = document.getElementById('charCount');
const lineCountSpan = document.getElementById('lineCount');

let fileHandle = null; // Stores file reference
let content = '';      // Raw encrypted file content

// Helper function to update character and line counts
function updateEditorStats() {
    if (!fileContentTextArea) return;
    const text = fileContentTextArea.value;
    const charCount = text.length;
    const lineCount = text ? text.split('\n').length : 0;
    
    if (charCountSpan) charCountSpan.textContent = `${charCount} caractere${charCount !== 1 ? 's' : ''}`;
    if (lineCountSpan) lineCountSpan.textContent = `${lineCount} linha${lineCount !== 1 ? 's' : ''}`;
}

// Function to update File Chip in Header
function updateFileChip() {
    if (!activeFileName || !fileChip) return;
    if (fileHandle && fileHandle.name) {
        activeFileName.textContent = fileHandle.name;
        fileChip.classList.add('active-file');
    } else {
        activeFileName.textContent = 'Nenhum arquivo selecionado';
        fileChip.classList.remove('active-file');
    }
}

// Function to display status messages with visual style
function showStatus(message, isError = false) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    
    if (statusCard) {
        statusCard.classList.remove('status-success', 'status-error');
        if (isError) {
            statusCard.classList.add('status-error');
        } else if (message && !message.includes('Aguardando')) {
            statusCard.classList.add('status-success');
        }
    }
}

// Enable/Disable buttons and textarea
function updateUI() {
    const fileDecrypted = fileContentTextArea.value !== '';
    saveFileBtn.disabled = !fileDecrypted;
    clearHandleBtn.disabled = !fileHandle && !fileDecrypted;
    fileContentTextArea.disabled = !fileDecrypted;
    updateFileChip();
    updateEditorStats();
}

// 1. Select or Create File
selectFileBtn.addEventListener('click', async () => {
    try {
        const openOptions = {
            types: [
                {
                    description: 'Text files',
                    accept: {
                        'text/plain': ['.txt'],
                    },
                },
            ],
        };

        const [selectedHandle] = await window.showOpenFilePicker(openOptions);
        fileHandle = selectedHandle;
        showStatus(`Arquivo '${fileHandle.name}' selecionado com sucesso.`);

        // Read file content
        await readFile();
        updateUI();
        await saveHandle(fileHandle);

    } catch (openError) {
        if (openError.name === 'AbortError') {
            showStatus('Seleção de arquivo cancelada.', false);
            if (confirm("Deseja criar um novo arquivo criptografado?")) {
                try {
                    const saveOptions = {
                        types: [
                            {
                                description: 'Text files',
                                accept: {
                                    'text/plain': ['.txt'],
                                },
                            },
                        ],
                        suggestedName: 'SJCLDataApp.txt',
                    };
                    fileHandle = await window.showSaveFilePicker(saveOptions);
                    showStatus(`Arquivo '${fileHandle.name}' criado com sucesso.`);
                    fileContentTextArea.value = '';
                    updateUI();
                    await saveHandle(fileHandle);
                } catch (saveError) {
                    if (saveError.name === 'AbortError') {
                        showStatus('Criação do arquivo cancelada.', true);
                    } else {
                        showStatus(`Erro ao criar arquivo: ${saveError.message}`, true);
                        console.error('Error creating file:', saveError);
                    }
                    fileHandle = null;
                    updateUI();
                }
            } else {
                showStatus('Nenhuma ação de arquivo realizada.', false);
                updateUI();
            }
        } else {
            showStatus(`Erro ao abrir arquivo: ${openError.message}`, true);
            console.error('Unexpected error opening file:', openError);
            fileHandle = null;
            updateUI();
        }
    }
});

// 2. Read File Content
async function readFile() {
    if (!fileHandle) {
        showStatus('Nenhum arquivo selecionado para leitura.', true);
        return;
    }

    try {
        const file = await fileHandle.getFile();
        content = await file.text();
        showStatus(`Arquivo '${fileHandle.name}' carregado. Digite a senha e clique em Descriptografar.`);
    } catch (error) {
        showStatus(`Erro ao ler arquivo: ${error.message}`, true);
        console.error('Error reading file:', error);
    }
}

// 3. Save File Content
saveFileBtn.addEventListener('click', async () => {
    if (!fileHandle) {
        showStatus('Nenhum arquivo selecionado para salvar.', true);
        return;
    }

    if (!passwordInput.value) {
        showStatus('Informe a senha para criptografar antes de salvar.', true);
        passwordInput.focus();
        return;
    }

    try {
        const permissionStatus = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (permissionStatus !== 'granted') {
            showStatus('Permissão de escrita negada pelo navegador.', true);
            return;
        }

        const writableStream = await fileHandle.createWritable();
        const encryptedData = codificar(fileContentTextArea.value, passwordInput.value);
        await writableStream.write(encryptedData);
        await writableStream.close();

        content = encryptedData;
        showStatus(`Arquivo '${fileHandle.name}' salvo e criptografado com sucesso.`);
    } catch (error) {
        showStatus(`Erro ao salvar arquivo: ${error.message}`, true);
        console.error('Error saving file:', error);
    }
});

// 4. Remove File Handle Reference
clearHandleBtn.addEventListener('click', async () => {
    fileHandle = null;
    await removeHandle();
    fileContentTextArea.value = '';
    content = '';
    showStatus('Acesso ao arquivo removido. Selecione um novo arquivo.');
    updateUI();
});

// 5. Decrypt / Verify Password
verifyPasswordBtn.addEventListener('click', async () => {
    if (!fileHandle) {
        showStatus('Selecione um arquivo primeiro antes de descriptografar.', true);
        return;
    }

    if (!passwordInput.value) {
        showStatus('Por favor, digite a senha.', true);
        passwordInput.focus();
        return;
    }

    try {
        const permissionStatus = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (permissionStatus === 'granted') {
            await readFile();
        } else {
            showStatus('Permissão de acesso ao arquivo não concedida.', true);
            return;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showStatus('Operação de permissão cancelada.', true);
            return;
        } else {
            showStatus(`Erro de permissão: ${error.message}`, true);
            console.error('Error in permission:', error);
            return;
        }
    }

    const decrypted = await decodificar(content, passwordInput.value);
    if (decrypted !== '') {
        fileContentTextArea.value = decrypted;
        showStatus(`Arquivo '${fileHandle.name}' descriptografado com sucesso!`);
    }
    updateUI();
});

// 6. Password Visibility Toggle
if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
        const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');
        if (eyeOpen && eyeClosed) {
            eyeOpen.style.display = isPassword ? 'none' : 'block';
            eyeClosed.style.display = isPassword ? 'block' : 'none';
        }
    });
}

// 7. Keyboard Shortcuts
passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        verifyPasswordBtn.click();
    }
});

fileContentTextArea.addEventListener('input', () => {
    updateEditorStats();
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saveFileBtn.disabled) {
            saveFileBtn.click();
        }
    }
});

// Initialize on Load
window.onload = async function() {
    updateUI();

    if (!window.showSaveFilePicker) {
        showStatus('Seu navegador não suporta a File System Access API. Utilize o Google Chrome, Microsoft Edge ou Brave.', true);
        selectFileBtn.disabled = true;
        return;
    }

    if (!fileHandle) {
        fileHandle = await loadHandle();
        if (fileHandle) {
            const permissionStatus = await fileHandle.queryPermission({ mode: 'readwrite' });
            if (permissionStatus === 'granted') {
                showStatus(`Arquivo padrão '${fileHandle.name}' carregado. Digite a senha para abrir.`);
                await readFile();
            } else if (permissionStatus === 'prompt') {
                showStatus(`Permissão de acesso para '${fileHandle.name}' precisa ser confirmada.`);
            } else {
                showStatus(`Acesso ao arquivo '${fileHandle.name}' revogado. Selecione novamente.`, true);
                fileHandle = null;
                await removeHandle();
            }
            updateUI();
        }
    }
};

// Encryption Helper with SJCL
function codificar(texto, pwd) {
    if (texto.substring(0, 5) !== '{"iv"') {
        return sjcl.encrypt(pwd, texto);
    }
    return texto;
}

// Decryption Helper with SJCL
async function decodificar(texto, pwd) {
    try {
        if (!texto || texto.trim() === '') {
            showStatus('Arquivo vazio ou não carregado.', false);
            return '';
        }
        const decryptedText = sjcl.decrypt(pwd, texto);
        return decryptedText;
    } catch (error) {
        showStatus(`Senha incorreta ou conteúdo inválido (${error.message})`, true);
        console.error('Invalid password or content:', error);
        return '';
    }
}