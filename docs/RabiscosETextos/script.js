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

// Variáveis de ciclo de cores e feedback
const colors = ['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080']; // Preto, Vermelho, Azul, Verde, Laranja, Roxo
let currentColorIndex = 0;
let currentColor = colors[currentColorIndex];
let feedbackTimeout = null;
let savedFeedbackData = null;
let savedFeedbackX = 0;
let savedFeedbackY = 0;

// Input oculto para lidar com composição de texto (acentos, etc.)
const hiddenInput = document.createElement('input');
hiddenInput.type = 'text';
hiddenInput.style.position = 'absolute';
hiddenInput.style.opacity = '0';
hiddenInput.style.pointerEvents = 'none';
hiddenInput.style.zIndex = '-1';
document.body.appendChild(hiddenInput);

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
    ctx.strokeStyle = currentColor;
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

function showColorFeedback(x, y) {
    clearTimeout(feedbackTimeout);
    if (savedFeedbackData) {
        ctx.putImageData(savedFeedbackData, savedFeedbackX, savedFeedbackY);
    }

    const text = `COR `;
    ctx.font = '16px Roboto, sans-serif';
    const textMetrics = ctx.measureText(text);
    const feedbackWidth = textMetrics.width + 40;
    const feedbackHeight = 30;

    // Posiciona a caixa de feedback acima do cursor, evitando as bordas da tela
    let feedbackX = x;
    let feedbackY = y - feedbackHeight - 10;
    if (feedbackY < 0) feedbackY = y + 10;
    if (feedbackX + feedbackWidth > canvas.width) feedbackX = canvas.width - feedbackWidth;

    // Salva uma área um pouco maior para garantir que a borda (stroke) seja completamente apagada.
    const savePadding = 2;
    savedFeedbackX = feedbackX - savePadding;
    savedFeedbackY = feedbackY - savePadding;
    const saveWidth = feedbackWidth + savePadding * 2;
    const saveHeight = feedbackHeight + savePadding * 2;
    savedFeedbackData = ctx.getImageData(savedFeedbackX, savedFeedbackY, saveWidth, saveHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(feedbackX, feedbackY, feedbackWidth, feedbackHeight);
    ctx.strokeStyle = '#AAA';
    ctx.strokeRect(feedbackX, feedbackY, feedbackWidth, feedbackHeight);

    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, feedbackX + 10, feedbackY + feedbackHeight / 2);

    const swatchX = feedbackX + 10 + ctx.measureText('COR ').width;
    ctx.fillStyle = currentColor;
    ctx.fillRect(swatchX, feedbackY + (feedbackHeight / 2) - 7, 14, 14);

    feedbackTimeout = setTimeout(() => {
        if (savedFeedbackData) {
            ctx.putImageData(savedFeedbackData, savedFeedbackX, savedFeedbackY);
            savedFeedbackData = null;
        }
    }, 2000);
}

function handleInput() {
    if (!isTyping) return;
    const text = hiddenInput.value;
    if (text.length > 0) {
        stopBlinking();

        ctx.fillStyle = currentColor;
        ctx.font = '20px Roboto, sans-serif';
        ctx.textBaseline = 'alphabetic';

        for (const char of text) {
            const charWidth = ctx.measureText(char).width;
            textHistory.push({ char, width: charWidth, x: textCursorX, y: textCursorY, color: currentColor });
            ctx.fillText(char, textCursorX, textCursorY);
            textCursorX += charWidth;
        }
        
        startBlinking();
        hiddenInput.value = '';
    }
}

let isComposing = false;

hiddenInput.addEventListener('compositionstart', () => {
    isComposing = true;
});

hiddenInput.addEventListener('compositionend', () => {
    isComposing = false;
    handleInput();
});

hiddenInput.addEventListener('input', (e) => {
    if (isComposing) return;
    handleInput();
});

function draw(e) {
    if (!isDrawing) return;
    if (isTyping) {
        stopBlinking();
        isTyping = false; // Stop typing when drawing
        hiddenInput.blur();
    }
    ctx.strokeStyle = currentColor;
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

canvas.addEventListener('dblclick', (e) => {
    isDrawing = false;

    currentColorIndex = (currentColorIndex + 1) % colors.length;
    currentColor = colors[currentColorIndex];

    showColorFeedback(e.offsetX, e.offsetY);
});

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (isTyping) {
        stopBlinking();
        isTyping = false; // Reset typing sequence on mouse move
        hiddenInput.blur();
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
            hiddenInput.value = '';
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
                // A área de limpeza precisa ser grande o suficiente para cobrir
                // ascendentes e descendentes da fonte (e.g., 'j', 'f', 'Á').
                const fontAscent = 20;
                const fontDescent = 8;
                const yErase = lastAction.y - fontAscent;
                const eraseHeight = fontAscent + fontDescent;
                // Adiciona um preenchimento para limpar completamente o caractere com anti-aliasing
                ctx.fillRect(lastAction.x - 1, yErase, lastAction.width + 2, eraseHeight);
            }
            startBlinking();
        }
    } else if (!isTyping && (e.key.length === 1 || e.key === 'Dead')) {
            isTyping = true;
            lineStartX = mouseX;
            textCursorX = mouseX;
            textCursorY = mouseY;
            textHistory = []; // Começa um novo histórico para a nova sequência de digitação
            
            hiddenInput.style.left = `${textCursorX}px`;
            hiddenInput.style.top = `${textCursorY}px`;
            hiddenInput.value = '';
            hiddenInput.focus();
    } else if (isTyping) {
        hiddenInput.focus();
    }
});

window.addEventListener('resize', () => {
    // Limpa qualquer feedback temporário antes de redimensionar
    clearTimeout(feedbackTimeout);
    if (savedFeedbackData) {
        ctx.putImageData(savedFeedbackData, savedFeedbackX, savedFeedbackY);
        savedFeedbackData = null;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.putImageData(imageData, 0, 0);
});
