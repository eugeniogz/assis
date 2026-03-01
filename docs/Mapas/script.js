const gridContainer = document.getElementById('grid-container');
const mapNumDisplay = document.getElementById('map-number');
const msgDisplay = document.getElementById('message');

let currentPath = [];
let playerPos = { x: 0, y: 7 };
let gameActive = true;
let mapID = Math.floor(Math.random() * 12) + 1;

// Gera caminhos determinísticos (sempre iguais para o mesmo ID)
function generateFixedMap(id) {
    let path = [];
    // Define um ponto de início fixo para cada um dos 12 mapas
    let startX = [0, 2, 4, 6, 1, 3, 5, 7, 0, 3, 6, 2][id - 1];
    let curr = { x: startX, y: 7 };
    path.push(`${curr.x},${curr.y}`);

    // Gerador pseudo-aleatório com semente fixa (o ID do mapa)
    let seed = id;
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    while (curr.y > 0) {
        let r = seededRandom();
        // Tenta mover para os lados, mas prioriza subir
        if (r < 0.3 && curr.x < 7 && !path.includes(`${curr.x+1},${curr.y}`)) {
            curr.x++; 
        } else if (r > 0.7 && curr.x > 0 && !path.includes(`${curr.x-1},${curr.y}`)) {
            curr.x--;
        } else {
            curr.y--;
        }
        path.push(`${curr.x},${curr.y}`);
    }
    return path;
}

function initGame(newMap = false, start = true) {
    if (newMap) {
        mapID++;
        if (mapID > 12) mapID = 1;
    } else if (start) {
        mapID = Math.floor(Math.random() * 12) + 1;
    } else {
        mapID = 1;
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
                cell.innerText = '🏁';
            }
            gridContainer.appendChild(cell);
        }
    }
    updatePlayerUI();
}

function updatePlayerUI() {
    document.querySelectorAll('.cell').forEach(c => { if (c.innerText === '🟦') c.innerText = ''; });
    const pCell = document.getElementById(`c-${playerPos.x}-${playerPos.y}`);
    if (pCell) pCell.innerText = '🟦';
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
            playerPos = next;
            updatePlayerUI();
            if (playerPos.y === 0) { 
                msgDisplay.innerText = "VITÓRIA! VOCÊ CONSEGUIU! 🎉"; 
                msgDisplay.style.color = "green";
                gameActive = false; 
            }
        } else {
            msgDisplay.innerText = "CAMINHO ERRADO! TENTE REPETIR. ❌"; 
            msgDisplay.style.color = "red";
            gameActive = false;
        }
    }
});

initGame();