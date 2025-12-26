const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let mouseX = 0;
let mouseY = 0;

let isTyping = false;
let textCursorX = 0;
let textCursorY = 0;
let lineStartX = 0;

let savedCursorData = null;
let savedCursorX = 0;
let savedCursorY = 0;

let textHistory = [];
let cursorInterval = null;

ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);

function removeCursor() {
    if (savedCursorData) {
        ctx.putImageData(savedCursorData, savedCursorX, savedCursorY);
        savedCursorData = null;
    }
}

function drawCursor() {
    const cursorHeight = 20;
    const cursorYOffset = -18;
    const lineWidth = 2;

    // Uma linha de 2px pode afetar 3 colunas de pixels devido ao anti-aliasing
    // quando as coordenadas não são inteiras. Salvamos uma área um pouco
    // mais larga para garantir que o cursor seja completamente apagado.
    // Aumentamos a área salva verticalmente também para evitar rastros.
    const saveWidth = 4;
    const saveHeight = cursorHeight + 4;
    savedCursorX = Math.floor(textCursorX - (saveWidth / 2));
    savedCursorY = Math.floor(textCursorY + cursorYOffset - 2);
    savedCursorData = ctx.getImageData(savedCursorX, savedCursorY, saveWidth, saveHeight);

    ctx.beginPath();
    ctx.moveTo(textCursorX, textCursorY + cursorYOffset);
    ctx.lineTo(textCursorX, textCursorY + cursorYOffset + cursorHeight);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();
}

function stopBlinking() {
    clearInterval(cursorInterval);
    cursorInterval = null;
    removeCursor();
}

function startBlinking() {
    stopBlinking();
    let isCursorVisible = true;
    drawCursor();
    cursorInterval = setInterval(() => {
        if (isCursorVisible) {
            removeCursor();
        } else {
            drawCursor();
        }
        isCursorVisible = !isCursorVisible;
    }, 500);
}

function draw(e) {
    if (!isDrawing) return;
    if (isTyping) {
        stopBlinking();
        isTyping = false; // Stop typing when drawing
    }
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
canvas.addEventListener('mousemove', draw);

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (isTyping) {
        stopBlinking();
        isTyping = false; // Reset typing sequence on mouse move
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (isTyping) {
            // Guarda a informação da nova linha para o backspace funcionar entre linhas
            textHistory.push({
                isNewLine: true,
                prevX: textCursorX,
                prevY: textCursorY,
                lineStartX: lineStartX,
            });
            textCursorY += 25; // Altura da linha
            textCursorX = lineStartX;
            startBlinking();
        }
    } else if (e.key === 'Backspace') {
        if (isTyping && textHistory.length > 0) {
            stopBlinking(); // Remove o cursor da posição atual ANTES de apagar o caractere.
            const lastAction = textHistory.pop();

            if (lastAction.isNewLine) {
                // Se a última ação foi um Enter, volta para o final da linha anterior
                textCursorX = lastAction.prevX;
                textCursorY = lastAction.prevY;
                lineStartX = lastAction.lineStartX;
            } else {
                // Se foi um caractere, apaga ele
                textCursorX = lastAction.x;
                textCursorY = lastAction.y;

                ctx.fillStyle = 'white';
                const fontHeight = 20; // Aproximação do tamanho da fonte
                const yErase = lastAction.y - fontHeight;
                // Adiciona um preenchimento para limpar completamente o caractere com anti-aliasing
                ctx.fillRect(lastAction.x, yErase, lastAction.width, fontHeight + 5);
            }
            startBlinking();
        }
    } else if (e.key.length === 1) { // Only printable characters
        if (isTyping) {
            stopBlinking();
        }
        if (!isTyping) {
            isTyping = true;
            lineStartX = mouseX;
            textCursorX = mouseX;
            textCursorY = mouseY;
            textHistory = []; // Começa um novo histórico para a nova sequência de digitação
        }
        ctx.fillStyle = '#000';
        ctx.font = '20px Roboto, sans-serif';
        const char = e.key;
        const charWidth = ctx.measureText(char).width;
        // Adiciona o caractere ao histórico antes de desenhar
        textHistory.push({ char, width: charWidth, x: textCursorX, y: textCursorY });
        ctx.fillText(char, textCursorX, textCursorY);
        textCursorX += charWidth;
        startBlinking();
    }
});

window.addEventListener('resize', () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.putImageData(imageData, 0, 0);
});
