const gridContainer = document.getElementById('grid-container');
const mapNumDisplay = document.getElementById('map-number');
const msgDisplay = document.getElementById('message');

let currentPath = [];
let playerPos = { x: 0, y: 7 };
let gameActive = true;
let mapID = Math.floor(Math.random() * 12) + 1;

// Gera caminhos determinísticos (sempre iguais para o mesmo ID)
function generateFixedMap(id) {
    let attempt = 0;
    let path = [];

    while (attempt < 5000) {
        path = [];
        let leftCount = 0;
        let rightCount = 0;

        // Define um ponto de início fixo para cada um dos 12 mapas
        let startX = [0, 2, 4, 6, 1, 3, 5, 7, 0, 3, 6, 2][(id - 1) % 12];
        let curr = { x: startX, y: 7 };
        path.push(`${curr.x},${curr.y}`);

        // Gerador pseudo-aleatório com semente fixa (o ID do mapa + tentativa)
        let seed = id + (attempt * 100);
        function seededRandom() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }

        // Verifica se a célula é válida e não toca em partes anteriores do caminho (exceto a imediatamente anterior)
        function isSafe(x, y) {
            if (x < 0 || x > 7 || y < 0 || y > 7) return false;
            if (path.includes(`${x},${y}`)) return false;
            
            const neighbors = [
                {nx: x, ny: y-1}, {nx: x, ny: y+1},
                {nx: x-1, ny: y}, {nx: x+1, ny: y}
            ];
            
            const lastKey = path[path.length - 1];

            for (let n of neighbors) {
                const key = `${n.nx},${n.ny}`;
                if (path.includes(key) && key !== lastKey) {
                    return false; 
                }
            }
            return true;
        }

        let stuck = false;
        while (curr.y > 0) {
            let r = seededRandom();
            let moved = false;

            if (r < 0.35) { // 35% Esquerda
                if (isSafe(curr.x - 1, curr.y)) {
                    curr.x--; leftCount++; moved = true;
                }
            } else if (r < 0.7) { // 35% Direita
                if (isSafe(curr.x + 1, curr.y)) {
                    curr.x++; rightCount++; moved = true;
                }
            } else if (r < 1) { // 30% Baixo
                if (isSafe(curr.x, curr.y + 1)) {
                    curr.y++; moved = true;
                }
            }
            
            if (!moved) {
                if (isSafe(curr.x, curr.y - 1)) {
                    curr.y--;
                } else {
                    stuck = true;
                    break;
                }
            }
            
            path.push(`${curr.x},${curr.y}`);
        }

        if (!stuck && leftCount >= 5 && rightCount >= 5) return path;
        attempt++;
    }
    return path;
}

function initGame(newMap = false, start = true) {
    if (newMap) {
        mapID++;
        if (mapID > 12) mapID = 1;
    } else if (start) {
        mapID = Math.floor(Math.random() * 12) + 1;
    }
    
    gridContainer.innerHTML = '';
    currentPath = generateFixedMap(mapID);
    mapNumDisplay.innerText = mapID;
    playerPos = { x: parseInt(currentPath[0].split(',')[0]), y: 7 };
    gameActive = true;
    msgDisplay.innerText = '';
    
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const cell = document.createElement('div');
            cell.id = `c-${x}-${y}`;
            cell.classList.add('cell');
            if (currentPath.includes(`${x},${y}`)) cell.classList.add('path-true');
            if (y === 7 && x === playerPos.x) cell.classList.add('start');
            if (y === 0 && currentPath.includes(`${x},0`)) {
                cell.classList.add('end');
                cell.innerText = '🏡';
            }
            gridContainer.appendChild(cell);
        }
    }
    updatePlayerUI();
}

function updatePlayerUI() {
    //🧒🤵🧖🐶
    document.querySelectorAll('.cell').forEach(c => { if (c.innerText === '🐶') c.innerText = ''; });
    const pCell = document.getElementById(`c-${playerPos.x}-${playerPos.y}`);
    if (pCell) pCell.innerText = '🐶';
}

// Configuração do Clique Longo (Mesma lógica do seu quadro branco)
function setupLongPress(btnId, ringId, callback) {
    const btn = document.getElementById(btnId);
    const ring = document.getElementById(ringId);
    let timer;
    const duration = 1200;

    const start = (e) => {
        e.preventDefault();
        const startTime = Date.now();
        timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            ring.style.strokeDashoffset = 219.9 - (progress * 219.9);
            if (progress >= 1) { clearInterval(timer); ring.style.strokeDashoffset = 219.9; callback(); }
        }, 50);
    };

    const stop = () => { clearInterval(timer); ring.style.strokeDashoffset = 219.9; };

    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
    btn.addEventListener('touchstart', start);
    btn.addEventListener('touchend', stop);
}

setupLongPress('btn-reiniciar', 'ring-reiniciar', () => initGame(false, false));
setupLongPress('btn-novo', 'ring-novo', () => initGame(true, false));

window.addEventListener('keydown', (e) => {
    if (!gameActive) return;

    // Atalho: Ctrl+Alt+S -> Mostra o caminho colorido em verde
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') {
        document.querySelectorAll('.path-true').forEach(el => el.style.backgroundColor = 'lightgreen');
        return;
    }

    // Atalho de Gabarito (Alt+P)
    if (e.altKey && e.key.toLowerCase() === 'p') { window.print(); return; }

    let next = { ...playerPos };
    if (e.key === 'ArrowUp') next.y--;
    else if (e.key === 'ArrowDown') next.y++;
    else if (e.key === 'ArrowLeft') next.x--;
    else if (e.key === 'ArrowRight') next.x++;
    else return;

    if (next.x >= 0 && next.x < 8 && next.y >= 0 && next.y < 8) {
        if (currentPath.includes(`${next.x},${next.y}`)) {
            // Preenche com árvores as células da linha atual que não são do caminho (apenas se mudar de linha)
            if (next.y !== playerPos.y) {
                for (let x = 0; x < 8; x++) {
                    if (!currentPath.includes(`${x},${playerPos.y}`)) {
                        const cell = document.getElementById(`c-${x}-${playerPos.y}`);
                        if (cell) cell.innerText = '🌳';
                    }
                }
            }
            // Limpa a célula atual
            const prevCell = document.getElementById(`c-${playerPos.x}-${playerPos.y}`);
            if (prevCell) prevCell.innerText = '';

            playerPos = next;
            updatePlayerUI();
            if (playerPos.y === 0) { 
                msgDisplay.innerText = "VITÓRIA! VOCÊ CONSEGUIU! 🎉"; 
                msgDisplay.style.color = "green";
                gameActive = false; 
                new Audio('tada.mp3').play();
            }
        } else {
            // Marca a célula errada com uma árvore
            const wrongCell = document.getElementById(`c-${next.x}-${next.y}`);
            if (wrongCell) wrongCell.innerText = '🌳';

            msgDisplay.innerText = "CAMINHO ERRADO! TENTE REPETIR. ❌"; 
            msgDisplay.style.color = "red";
            gameActive = false;
        }
    }
});

initGame();