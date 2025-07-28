const showPieChartBtn = document.getElementById('showPieChartBtn');
// Dados de exemplo das transações financeiras
// Dicionário para categorizar as transações com base em palavras-chave no campo 'memo'

const categoriasDict = {
    pix: ['pix'],
    supermercado: ['ponto','hortifruti', 'super', 'sacolao', 'dma', 'supermercado', 'atacado', 'hipermercado','legum'],
    padaria: ['padaria', 'pão', 'confeitaria'],
    farmacia: ['raia', 'drogaria', 'farmacia', 'medicamentos'],
    salario: ['salário', 'salario'],
    aluguel: ['aluguel', 'aluguel recebido', 'aluguel pago'],
    contas: ['luz', 'água', 'gas', 'internet', 'telefone', 'conta'],
    lazer: ['cinema', 'restaurante', 'bar', 'show', 'viagem'],
    educacao: ['escola', 'faculdade', 'curso', 'livro'],
    transporte: ['transporte', 'ônibus', 'metro', 'combustivel', 'uber', 'taxi'],
    amazon: ['amazon'],
    brinquedos: ['traquitana'],
    restaurantes: ['rocambole', 'avellan', 'premiattamajor', 'uluru', 'cafe', 'ifood', 'soul de queijo'],
    aplicativos: ['googleplay'],
    vestuario: ['insider'],
    internet: ['claro', 'blink'],
    streaming: ['netflix', 'spotify', 'disney', 'globo', 'hbo'],
    pagamento_cartao: ['pagamento recebido', 'pagamento efetuado'],
    saude: ['medico', 'dentista', 'hospital', 'plano de saude', 'qualicorp', 'unimed'],
    outros_debitos: [], // Categoria padrão para débitos não classificados
    outros_creditos: [] // Categoria padrão para créditos não classificados
};

// Cores predefinidas para despesas (tons de vermelho, laranja, roxo)
const despesaColors = [
    'rgba(255, 99, 132, 0.8)', // Vermelho
    'rgba(255, 159, 64, 0.8)', // Laranja
    'rgba(255, 205, 86, 0.8)', // Amarelo
    'rgba(201, 203, 207, 0.8)', // Cinza
    'rgba(153, 102, 255, 0.8)',// Roxo
    'rgba(54, 162, 235, 0.8)', // Azul
    'rgba(75, 192, 192, 0.8)', // Verde Água
    'rgba(255, 102, 102, 0.8)' // Vermelho claro
];

// Cores predefinidas para recebimentos (tons de verde, azul, roxo)
const recebimentoColors = [
    'rgba(75, 192, 192, 0.8)', // Verde Água
    'rgba(54, 162, 235, 0.8)', // Azul
    'rgba(153, 102, 255, 0.8)',// Roxo
    'rgba(255, 205, 86, 0.8)', // Amarelo
    'rgba(102, 255, 102, 0.8)', // Verde claro
    'rgba(201, 203, 207, 0.8)' // Cinza
];
/**
 * Gera uma cor RGBA aleatória.
 * @param {number} opacity - A opacidade da cor (entre 0 e 1).
 * @returns {string} A string RGBA da cor gerada.
 */
function getRandomRgbaColor(opacity) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Não parece ser necessário
// function showGraph(transacoesCategorizadas) {
//     if (!transacoesCategorizadas || transacoesCategorizadas.length === 0) {
//         const dadosParaGrafico = processarDadosParaGrafico(transacoesCategorizadas);

//         renderizarGraficoPizza(
//             'despesasChart',
//             'Distribuição de Despesas (R$)',
//             dadosParaGrafico.despesas.labels,
//             dadosParaGrafico.despesas.values,
//             despesaColors
//         );

//         renderizarGraficoPizza(
//             'recebimentosChart',
//             'Distribuição de Recebimentos (R$)',
//             dadosParaGrafico.recebimentos.labels,
//             dadosParaGrafico.recebimentos.values,
//             recebimentoColors
//         );
//     }
// }
/**
 * Categoriza cada transação no array `transacoes` adicionando um atributo `categoria`.
 * A categorização é baseada em palavras-chave encontradas no campo `memo`.
 * @param {Array<Object>} transacoes - O array de objetos de transação.
 * @param {Object} categoriasDict - O dicionário de categorias com palavras-chave.
 * @returns {Array<Object>} Um novo array de transações com o atributo `categoria` adicionado.
 */
function categorizarTransacoes(transacoes, categoriasDict) {
    return transacoes.map(transacao => {
        const memoLowerCase = transacao.MEMO.toLowerCase();
        let categoriaEncontrada = '';

        // Itera sobre as categorias definidas no dicionário
        for (const categoria in categoriasDict) {
            // Verifica se alguma palavra-chave da categoria está presente no memo da transação
            if (categoriasDict[categoria].some(keyword => memoLowerCase.includes(keyword))) {
                categoriaEncontrada = categoria;
                break; // Encontrou uma categoria, pode parar de procurar
            }
        }

        // Se nenhuma categoria específica foi encontrada, atribui 'outros' com base no tipo
        if (!categoriaEncontrada) {
            categoriaEncontrada = transacao.TRNTYPE === 'DEBIT' ? 'outros_debitos' : 'outros_creditos';
        }

        // Retorna um novo objeto de transação com a categoria adicionada
        return { ...transacao, categoria: categoriaEncontrada };
    });
}

/**
 * Processa as transações categorizadas para agrupar, somar e ordenar os valores por categoria e tipo (débito/crédito).
 * @param {Array<Object>} transacoesCategorizadas - O array de transações com o atributo `categoria`.
 * @returns {Object} Um objeto contendo dados formatados para o Chart.js, separados por despesas e recebimentos, ambos ordenados do maior para o menor valor.
 */
function processarDadosParaGrafico(transacoesCategorizadas) {
    const despesasPorCategoria = {};
    const recebimentosPorCategoria = {};

    transacoesCategorizadas.forEach(transacao => {
        const categoria = transacao.categoria;
        const amount = transacao.TRNAMT;

        if (transacao.TRNTYPE === 'DEBIT') {
            despesasPorCategoria[categoria] = (despesasPorCategoria[categoria] || 0) + Math.abs(amount);
        } else {
            if (categoria !== 'pagamento_cartao') {
                recebimentosPorCategoria[categoria] = (recebimentosPorCategoria[categoria] || 0) + Math.abs(amount);
            }
        }
    });

    // Função auxiliar para ordenar labels e valores
    const ordenarDados = (labels, values) => {
        // Combina labels e valores em um array de objetos
        const dadosCombinados = labels.map((label, index) => ({
            label: label,
            value: values[index]
        }));

        // Ordena o array de objetos pelo valor, do maior para o menor
        dadosCombinados.sort((a, b) => b.value - a.value);

        // Separa novamente os labels e os valores
        const labelsOrdenados = dadosCombinados.map(item => item.label);
        const valoresOrdenados = dadosCombinados.map(item => item.value);

        return { labels: labelsOrdenados, values: valoresOrdenados };
    };

    // Aplica a ordenação para despesas e recebimentos
    const despesasOrdenadas = ordenarDados(
        Object.keys(despesasPorCategoria),
        Object.values(despesasPorCategoria)
    );

    const recebimentosOrdenados = ordenarDados(
        Object.keys(recebimentosPorCategoria),
        Object.values(recebimentosPorCategoria)
    );

    return {
        despesas: despesasOrdenadas,
        recebimentos: recebimentosOrdenados
    };
}
/**
 * Renderiza um gráfico de pizza usando Chart.js.
 * @param {string} elementId - O ID do elemento canvas onde o gráfico será renderizado.
 * @param {string} title - O título do dataset do gráfico.
 * @param {Array<string>} labels - Os rótulos para as fatias do gráfico (categorias).
 * @param {Array<number>} data - Os valores para as fatias do gráfico.
 * @param {Array<string>} colorsArray - O array de cores a ser usado para as fatias.
 */
function renderizarGraficoPizza(elementId, title, labels, data, colorsArray) {
    const ctx = document.getElementById(elementId).getContext('2d');

     if (elementId === 'despesasChart' && despesasChartInstance) {
        despesasChartInstance.destroy();
        despesasChartInstance = null; // Limpa a referência
    } else if (elementId === 'recebimentosChart' && recebimentosChartInstance) {
        recebimentosChartInstance.destroy();
        recebimentosChartInstance = null; // Limpa a referência
    }



    // Gera um array de cores a partir da paleta fornecida, ciclando se necessário
    const backgroundColors = labels.map((_, index) => colorsArray[index % colorsArray.length]);
    const borderColors = backgroundColors.map(color => color.replace('0.8', '1')); // Assume opacity 0.8 for background

    chartInstance = new Chart(ctx, {
        type: 'pie', // Tipo de gráfico alterado para 'pie' (pizza)
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, /* Permite que o gráfico se ajuste ao tamanho do contêiner */
            plugins: {
                legend: {
                    display: true, // Exibe a legenda para gráficos de pizza
                    position: 'right', // Posição da legenda
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            // Calcula a porcentagem para exibir no tooltip
                            // Filtra valores não numéricos para evitar NaN no total
                            const validData = context.dataset.data.filter(val => typeof val === 'number' && !isNaN(val));
                            const total = validData.reduce((sum, val) => sum + val, 0);

                            const value = context.parsed;

                            // Evita divisão por zero ou NaN para a porcentagem
                            let percentage = '0.00%';
                            if (total > 0) { // Calcula a porcentagem apenas se o total for positivo
                                percentage = ((value / total) * 100).toFixed(2) + '%';
                            } else if (value === 0 && total === 0) {
                                percentage = '0.00%'; // Se ambos são zero, a porcentagem é zero
                            }
                            return `${label} R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage})`;
                        }
                    }
                }
            }
        }
    });

    if (elementId === 'despesasChart') {
        despesasChartInstance = chartInstance;
    } else if (elementId === 'recebimentosChart') {
        recebimentosChartInstance = chartInstance;
    }
}

let despesasChartInstance = null;
let recebimentosChartInstance = null;

showPieChartBtn.addEventListener('click', async () => {
    await openDb();
    let dadosCript = await new Promise((resolve) => {
        const tx = findb.transaction(['financeiro'], 'readonly');
        const store = tx.objectStore('financeiro');
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    dados = [];
    if (dadosCript) {
        try {
            dados = decrypt(password.value, dadosCript);
        } catch (e) {
            showStatus(e.message, true);
            return;
        }
    } else {
        showStatus('Nenhum dado OFX importado ainda.', true);
        fileContentTextArea.value = '';
    }
    // 1. Categoriza as transações

    const transacoesCategorizadas = categorizarTransacoes(dados, categoriasDict);

    // 2. Processa os dados para o formato do gráfico
    const dadosGrafico = processarDadosParaGrafico(transacoesCategorizadas);

    showPage('pieChartDiv');

    
    // 3. Renderiza o gráfico de despesas (agora como pizza)
    renderizarGraficoPizza(
        'despesasChart',
        'Distribuição de Despesas (R$)',
        dadosGrafico.despesas.labels,
        dadosGrafico.despesas.values,
        despesaColors
    );

    // 4. Renderiza o gráfico de recebimentos (agora como pizza)
    renderizarGraficoPizza(
        'recebimentosChart',
        'Distribuição de Recebimentos (R$)',
        dadosGrafico.recebimentos.labels,
        dadosGrafico.recebimentos.values,
        recebimentoColors
    );
});
