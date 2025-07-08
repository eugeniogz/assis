const selectFileBtn = document.getElementById('selectFileBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const clearHandleBtn = document.getElementById('clearHandleBtn');
const fileContentTextArea = document.getElementById('fileContent');
const statusMessage = document.getElementById('statusMessage');

let fileHandle = null; // Armazena a referência ao arquivo

// document.getElementById('form').addEventListener('submit', function(event) {
//         event.preventDefault();
// });

// Função para exibir mensagens de status
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--red)' : 'var(--green)';
}

// Habilitar/Desabilitar botões e textarea
function updateUI() {
    const fileDecryped = fileContentTextArea.value !== '';
    saveFileBtn.disabled = !fileDecryped;
    clearHandleBtn.disabled = !fileDecryped;
    fileContentTextArea.disabled = !fileDecryped;
}

// 1. Selecionar ou Criar o Arquivo
selectFileBtn.addEventListener('click', async () => {
    try {
        // Tentar abrir um arquivo existente primeiro
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

        // window.showOpenFilePicker retorna um array de handles
        const [selectedHandle] = await window.showOpenFilePicker(openOptions);
        
        fileHandle = selectedHandle; // Armazena o handle do arquivo selecionado
        showStatus(`File '${fileHandle.name}' selected.`);

        // Ler o conteúdo do arquivo
        await readFile();
        updateUI();
        await saveHandle(fileHandle);

    } catch (openError) {
        // Se o usuário cancelou a seleção de arquivo ou houve outro erro ao abrir
        if (openError.name === 'AbortError') {
            showStatus('File selection aborted..', false); // Mensagem informativa, não de erro fatal
            // Perguntar ao usuário se ele quer criar um novo arquivo
            if (confirm("Create a new file?")) {
                try {
                    // Opções para salvar/criar um novo arquivo
                    const saveOptions = {
                        types: [
                            {
                                description: 'Text files',
                                accept: {
                                    'text/plain': ['.txt'],
                                },
                            },
                        ],
                        suggestedName: 'SJCLDataApp.txt', // Sugere o nome do arquivo
                    };
                    fileHandle = await window.showSaveFilePicker(saveOptions);
                    showStatus(`File '${fileHandle.name}' created`);
                    fileContentTextArea.value = ''; // Limpa a área de texto para um novo arquivo
                    updateUI();
                    await saveHandle(fileHandle);
                } catch (saveError) {
                    if (saveError.name === 'AbortError') {
                        showStatus('File creation canceled.', true);
                    } else {
                        showStatus(`Error creating file: ${saveError.message}`, true);
                        console.error('Error creating file:', saveError);
                    }
                    fileHandle = null;
                    updateUI();
                }
            } else {
                // Se o usuário não quis abrir nem criar
                showStatus('File action not realized.', false);
                fileHandle = null;
                updateUI();
            }
        } else {
            showStatus(`Unexpected error opening file: ${openError.message}`, true);
            console.error('Unexpected error opening file:', openError);
            fileHandle = null;
            updateUI();
        }
    }
});

// 2. Ler o Conteúdo do Arquivo
content = '';

async function readFile() {
    if (!fileHandle) {
        showStatus('No file selected to read.', true);
        return;
    }

    try {
        const file = await fileHandle.getFile();
        content = await file.text();
        showStatus(`File '${fileHandle.name}' loaded.`);
    } catch (error) {
        showStatus(`Error reading file: ${error.message}`, true);
        console.error('Error reading file:', error);
    }
}

// 3. Escrever no Arquivo
saveFileBtn.addEventListener('click', async () => {
    if (!fileHandle) {
        showStatus('No file selected to save.', true);
        return;
    }

    try {
        // Solicita permissão de escrita (se ainda não tiver)
        const permissionStatus = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (permissionStatus !== 'granted') {
            showStatus('Write permission denied.', true);
            return;
        }

        // Crie um WritableStream para escrever no arquivo
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(codificar(fileContentTextArea.value, password.value));
        await writableStream.close(); // Feche o stream para garantir que os dados sejam gravados

        showStatus(`File '${fileHandle.name}' saved.`);
    } catch (error) {
        showStatus(`Error saving file: ${error.message}`, true);
        console.error('Error saving file:', error);
    }
});

// Remover a referência ao arquivo (opcional)
clearHandleBtn.addEventListener('click', () => {
    fileHandle = null;
    removeHandle();
    fileContentTextArea.value = '';
    showStatus('File access removed. Select a new file.');
    updateUI();
});

// Inicializa a UI
updateUI();

// Verifica se a API está disponível
if (!window.showSaveFilePicker) {
    showStatus('This browser do not supports the File System Access API. Por favor, use Chrome, Edge or other Chromium based browser.', true);
    selectFileBtn.disabled = true;
}

// Lógica de inicialização para carregar o arquivo padrão
//document.addEventListener('DOMContentLoaded', async () => {
verifyPasswordBtn.addEventListener('click', async () => {
    try {
        const permissionStatus = await fileHandle.requestPermission({ mode: 'readwrite' });

        if (permissionStatus === 'granted') {
            // Permissão concedida ou renovada, agora podemos ler e escrever
            await readFile(); // Sua função para ler do arquivo
        } else {
            showStatus('Write access denied.', true);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showStatus('File permission operation aborted.', true);
        } else {
            showStatus(`Error saving file: ${error.message}`, true);
            console.error('Error saving file:', error);
        }
    }
    fileContentTextArea.value = await decodificar(content, password.value);
    updateUI();
});

window.onload = async function() {
    if (!fileHandle && window.showSaveFilePicker) { // Verifique se não já abriu por outro método
        fileHandle = await loadHandle();
        // Verifica se a permissão ainda é válida
        const permissionStatus = await fileHandle.queryPermission({ mode: 'readwrite' });
        if (permissionStatus === 'granted') {
            showStatus(`Loading default file '${fileHandle.name}'.`);
            await readFile(fileHandle);
        } else if (permissionStatus === 'prompt') {
            // Permissão é 'prompt' (o navegador perguntará de novo)
            showStatus(`Access permission to '${fileHandle.name}' needs to be requested again.`);
        } else {
            showStatus(`Access permission to file '${fileHandle.name}' revoked. Select a file again.`, true);
            fileHandle = null;
            await removeHandle();
        }
        updateUI();
    }

}


function codificar(texto, pwd)
{

    if (texto.substring(1,5)!="iv:\"")
    {
        return sjcl.encrypt(pwd, texto);
    }

}

async function decodificar(texto, pwd)
{
    
    try {
        // Crie um stream legível a partir do arquivo
        if (texto=='') {
            showStatus(`File not opened`);
            return '';
        }
        texto2 = sjcl.decrypt(pwd, texto);
        return texto2;
    } catch (error) {
        showStatus(`Invalid password: ${error.message}`, true);
        console.error('Invalid password:', error);
        return '';
    }
}