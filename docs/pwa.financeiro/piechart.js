const showPieChartBtn = document.getElementById('showPieChartBtn');
// Dados de exemplo das transações financeiras
// Dicionário para categorizar as transações com base em palavras-chave no campo 'memo'

const categoriasDict = {
    supermercado: ['supermercado', 'mercado', 'atacado', 'hipermercado'],
    padaria: ['padaria', 'pão', 'confeitaria'],
    farmacia: ['drogaria', 'farmacia', 'medicamentos'],
    salario: ['salário', 'salario', 'pagamento'],
    aluguel: ['aluguel', 'aluguel recebido', 'aluguel pago'],
    contas: ['luz', 'água', 'gas', 'internet', 'telefone', 'conta'],
    lazer: ['cinema', 'restaurante', 'bar', 'show', 'viagem'],
    educacao: ['escola', 'faculdade', 'curso', 'livro'],
    transporte: ['transporte', 'ônibus', 'metro', 'combustivel', 'uber', 'taxi'],
    amazon: ['amazon'],
    pix: ['pix'],
    saude: ['medico', 'dentista', 'hospital', 'plano de saude'],
    outros_debito: [], // Categoria padrão para débitos não classificados
    outros_credito: [] // Categoria padrão para créditos não classificados
};

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
            categoriaEncontrada = transacao.TRNTYPE === 'DEBIT' ? 'outros_debito' : 'outros_credito';
        }

        // Retorna um novo objeto de transação com a categoria adicionada
        return { ...transacao, categoria: categoriaEncontrada };
    });
}

/**
 * Processa as transações categorizadas para agrupar e somar os valores por categoria e tipo (débito/crédito).
 * @param {Array<Object>} transacoesCategorizadas - O array de transações com o atributo `categoria`.
 * @returns {Object} Um objeto contendo dados formatados para o Chart.js, separados por despesas e recebimentos.
 */
function processarDadosParaGrafico(transacoesCategorizadas) {
    const despesasPorCategoria = {};
    const recebimentosPorCategoria = {};

    transacoesCategorizadas.forEach(transacao => {
        const categoria = transacao.categoria;
        const amount = transacao.TRNAMT;

        if (transacao.TRNTYPE === 'DEBIT') {
            // Soma as despesas (valores negativos)
            despesasPorCategoria[categoria] = (despesasPorCategoria[categoria] || 0) + Math.abs(amount);
        } else {
            // Soma os recebimentos (valores positivos)
            recebimentosPorCategoria[categoria] = (recebimentosPorCategoria[categoria] || 0) + amount;
        }
    });

    // Converte os objetos em arrays de labels e valores para o Chart.js
    return {
        despesas: {
            labels: Object.keys(despesasPorCategoria),
            values: Object.values(despesasPorCategoria)
        },
        recebimentos: {
            labels: Object.keys(recebimentosPorCategoria),
            values: Object.values(recebimentosPorCategoria)
        }
    };
}

/**
 * Renderiza um gráfico de pizza usando Chart.js.
 * @param {string} elementId - O ID do elemento canvas onde o gráfico será renderizado.
 * @param {string} title - O título do dataset do gráfico.
 * @param {Array<string>} labels - Os rótulos para as fatias do gráfico (categorias).
 * @param {Array<number>} data - Os valores para as fatias do gráfico.
 */
function renderizarGraficoPizza(elementId, title, labels, data) {
    const ctx = document.getElementById(elementId).getContext('2d');

    // Gera um array de cores aleatórias para as fatias do gráfico
    const backgroundColors = labels.map(() => getRandomRgbaColor(0.8));
    const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));

    new Chart(ctx, {
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
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(2) + '%';
                            return `${label} R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
}


verifyPasswordBtn.addEventListener('click', async () => {
    await openDb();
    let dadosCript = await new Promise((resolve) => {
        const tx = findb.transaction(['fileHandles'], 'readonly');
        const store = tx.objectStore('fileHandles');
        const req = store.get('ofxData');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });

    if (!dadosCript) {
        showStatus('Nenhum dado OFX importado ainda.', true);
        fileContentTextArea.value = '';
        return;
    }
    dados = {};
    try {
        dados = JSON.parse(sjcl.decrypt(password.value, dadosCript));
        showStatus('Dados carregados.');
    } catch (e) {
        showStatus('Senha inválida ou dados corrompidos.', true);
        fileContentTextArea.value = '';
    }
    // 1. Categoriza as transações

    const transacoesCategorizadas = categorizarTransacoes(dados, categoriasDict);

    // 2. Processa os dados para o formato do gráfico
    const dadosGrafico = processarDadosParaGrafico(transacoesCategorizadas);

    // 3. Renderiza o gráfico de despesas (agora como pizza)
    renderizarGraficoPizza(
        'despesasChart',
        'Distribuição de Despesas (R$)',
        dadosGrafico.despesas.labels,
        dadosGrafico.despesas.values
    );

    // 4. Renderiza o gráfico de recebimentos (agora como pizza)
    renderizarGraficoPizza(
        'recebimentosChart',
        'Distribuição de Recebimentos (R$)',
        dadosGrafico.recebimentos.labels,
        dadosGrafico.recebimentos.values
    );
});
