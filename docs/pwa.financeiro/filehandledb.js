// Nome do banco de dados e versão
const DB_NAME = 'myPWAFileFinanceiroDB';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'fileHandles';

let findb; // Variável para armazenar a instância do banco de dados

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Erro ao abrir IndexedDB:", event.target.errorCode);
            reject("Erro ao abrir IndexedDB");
        };

        request.onsuccess = (event) => {
            findb = event.target.result;
            console.log("IndexedDB aberto com sucesso!");
            resolve(findb);
        };

        // Este evento é disparado se a versão do banco de dados mudar (para upgrades)
        request.onupgradeneeded = (event) => {
            findb = event.target.result;
            if (!findb.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                findb.createObjectStore(OBJECT_STORE_NAME);
                console.log(`Object Store '${OBJECT_STORE_NAME}' criada.`);
            }
        };
    });
}

async function saveHandle(fileHandle) {
    try {
        await openDb(); // Garante que o banco de dados esteja aberto

        const transaction = findb.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);

        const request = store.put(fileHandle, 'defaultFile'); // Salva o handle com a chave 'defaultFile'

        request.onsuccess = () => {
            console.log("FileHandle salvo com sucesso!");
        };

        request.onerror = (event) => {
            console.error("Erro ao salvar FileHandle:", event.target.errorCode);
        };

        // Espera a transação completar
        await transaction.complete;
        console.log("Transação de salvamento concluída.");

    } catch (error) {
        console.error("Erro no processo IndexedDB:", error);
    }
}

async function removeHandle() {
    try {
        await openDb(); // Garante que o banco de dados esteja aberto

        const transaction = findb.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);

        await store.delete('defaultFile'); // Deleta o item com a chave 'defaultFile'

        await transaction.complete; // Espera a transação completar
        console.log("Hash do fileHandle removido do IndexedDB com sucesso!");


    } catch (error) {
        console.error("Erro no processo IndexedDB:", error);
    }
}

async function loadHandle() {
    try {
        await openDb(); // Garante que o banco de dados esteja aberto

        const transaction = findb.transaction([OBJECT_STORE_NAME], 'readonly');
        const store = transaction.objectStore(OBJECT_STORE_NAME);

        const request = store.get('defaultFile'); // Carrega o handle pela chave

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log("FileHandle carregado:", request.result);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error("Erro ao carregar FileHandle:", event.target.errorCode);
                reject("Erro ao carregar FileHandle");
            };
        });

    } catch (error) {
        console.error("Erro no processo IndexedDB:", error);
        return null;
    }
}