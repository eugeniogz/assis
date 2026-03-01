function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        body { font-family: sans-serif; }
        #print-container { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
        .map-wrapper { break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
        .map-header { text-align: center; font-weight: bold; margin-bottom: 5px; }
        .grid-container { 
            display: grid; 
            grid-template-columns: repeat(8, 40px); 
            grid-template-rows: repeat(8, 40px); 
            border: 2px solid #000;
        }
        .cell { 
            width: 40px; 
            height: 40px; 
            border: 1px solid #000; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 24px;
            box-sizing: border-box;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Renderiza todos os 12 mapas na página de impressão.
 */
function renderAllMaps() {
    const printContainer = document.getElementById('print-container');

    for (let mapId = 1; mapId <= 12; mapId++) {
        const path = generateFixedMap(mapId);
        if (!path || path.length === 0) {
            console.error(`Falha ao gerar o mapa com ID: ${mapId}`);
            continue;
        }

        // Cria os contêineres para o mapa
        const mapWrapper = document.createElement('div');
        mapWrapper.className = 'map-wrapper';

        const header = document.createElement('div');
        header.className = 'map-header';
        header.innerText = `Mapa ${mapId}`;
        mapWrapper.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'grid-container';

        // Define as posições de início e fim
        const startPos = path[0];
        const endPos = path[path.length - 1];

        // Preenche o grid 8x8
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const key = `${x},${y}`;

                if (path.includes(key)) {
                    cell.classList.add('path-true');
                    if (key === startPos) {
                        cell.innerText = '🐶'; // Cachorro no início
                    } else if (key === endPos) {
                        cell.innerText = '🏡'; // Casa no fim
                    }
                } else {
                    cell.innerText = '🌳'; // Árvore fora do caminho
                }
                grid.appendChild(cell);
            }
        }
        mapWrapper.appendChild(grid);
        printContainer.appendChild(mapWrapper);
    }
}

// Inicia a renderização quando a página carregar
window.onload = () => {
    injectStyles();
    renderAllMaps();
    window.print(); 
};