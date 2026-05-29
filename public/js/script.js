let cryptoChart = null;
let currentPortfolioId = null;

async function showChartForCoin(coinId) {
    const response = await fetch(`http://localhost:3000/holdings/history/${coinId}`);
    const historyData = await response.json();
    const ctx = document.getElementById('cryptoChart').getContext('2d');

    if (!historyData || historyData.length === 0) {
        if (cryptoChart) {
            cryptoChart.destroy();
        }
        cryptoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ожидание данных'],
                datasets: [{
                    label: `Цена ${coinId.toUpperCase()} (Ожидаем первый снимок...)`,
                    data: [0],
                    borderColor: '#94a3b8',
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }

    const reversedData = historyData.reverse();
    const labels = reversedData.map(snapshot => new Date(snapshot.capturedAt).toLocaleTimeString());
    const prices = reversedData.map(snapshot => Number(snapshot.priceUsd));

    if (cryptoChart) {
        cryptoChart.destroy();
    }

    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Цена ${coinId.toUpperCase()} (USD)`,
                data: prices,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

async function createPortfolio() {
    const input = document.getElementById('portfolioName');
    const name = input.value;
    if (!name) return alert('Введите название портфеля!');

    const response = await fetch('http://localhost:3000/portfolios/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
    });
    const newPortfolio = await response.json();
    
    currentPortfolioId = newPortfolio.id;
    input.value = '';
    refreshAll();
}

async function deletePortfolio(id) {
    await fetch(`http://localhost:3000/portfolios/${id}`, {
        method: 'DELETE'
    });
    if (currentPortfolioId === id) {
        currentPortfolioId = null;
    }
    refreshAll();
}

async function addHolding() {
    const portfolioSelect = document.getElementById('holdPortfolioId');
    const coinIdInput = document.getElementById('coinId');
    const amountInput = document.getElementById('amount');

    const portfolioId = parseInt(portfolioSelect.value);
    const coinId = coinIdInput.value;
    const amount = parseFloat(amountInput.value);

    if (!portfolioId || !coinId || isNaN(amount) || amount < 0.1) {
        return alert('Количество монет должно быть не меньше 0.1!');
    }

    await fetch('http://localhost:3000/holdings/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId, coinId, amount })
    });

    currentPortfolioId = portfolioId;
    amountInput.value = '';
    refreshAll();
}

async function sellHolding(coinId, availableAmount, transactionIds) {
    const cleanAvailable = Number(availableAmount.toFixed(8));
    const input = prompt(`Какое количество ${coinId.toUpperCase()} вы хотите продать? (Доступно: ${cleanAvailable})`);
    if (input === null) return; 

    const amountToSell = parseFloat(input);
    if (isNaN(amountToSell) || amountToSell <= 0) {
        return alert('Введите корректное количество монет!');
    }

    if (amountToSell > cleanAvailable) {
        return alert(`Недостаточно монет на балансе! У вас есть только ${cleanAvailable}`);
    }

    const idToDelete = transactionIds[0];

    await fetch(`http://localhost:3000/holdings/${idToDelete}/reduce`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountToSell })
    });

    refreshAll();
}

async function refreshAll() {
    let portfolios = [];
    try {
        const resPortfolios = await fetch('http://localhost:3000/portfolios/all');
        portfolios = await resPortfolios.json();
    } catch (err) {
        console.error('Ошибка загрузки портфелей:', err);
    }
    
    if (portfolios.length > 0 && !currentPortfolioId) {
        currentPortfolioId = portfolios[0].id;
    }

    const pList = document.getElementById('portfoliosList');
    if (pList) pList.innerHTML = '';
    
    const portfolioSelect = document.getElementById('holdPortfolioId');
    if (portfolioSelect) {
        portfolioSelect.innerHTML = '<option value="" disabled>Выберите портфель</option>';
    }

    portfolios.forEach(p => {
        if (pList) {
            const li = document.createElement('li');
            if (p.id === currentPortfolioId) {
                li.classList.add('active-portfolio');
            }
            
            const text = document.createElement('span');
            text.textContent = p.name;
            
            li.onclick = () => {
                currentPortfolioId = p.id;
                refreshAll();
            };
            
            const delBtn = document.createElement('button');
            delBtn.classList.add('delete-btn');
            delBtn.textContent = 'X';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deletePortfolio(p.id);
            };

            li.appendChild(text);
            li.appendChild(delBtn);
            pList.appendChild(li);
        }

        if (portfolioSelect) {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            if (p.id === currentPortfolioId) {
                option.selected = true;
            }
            portfolioSelect.appendChild(option);
        }
    });

    let holdings = [];
    try {
        const resHoldings = await fetch('http://localhost:3000/holdings/all');
        const allHoldings = await resHoldings.json();
        holdings = allHoldings.filter(h => h.portfolio && h.portfolio.id === currentPortfolioId);
    } catch (err) {
        console.error('Ошибка загрузки активов:', err);
    }

    const hList = document.getElementById('holdingsList');
    if (hList) hList.innerHTML = '';
    
    const groupedHoldings = {};

    holdings.forEach(h => {
        const amountNum = Number(h.amount);
        const currentPriceNum = Number(h.currentPrice || 0);
        // Если бэкенд не присылает историческую цену покупки, используем текущую рыночную цену
        const buyPriceNum = Number(h.buyPrice || h.currentPrice || 0); 

        if (groupedHoldings[h.coinId]) {
            const newAmount = groupedHoldings[h.coinId].amount + amountNum;
            // Рассчитываем общую сумму затрат, чтобы найти средневзвешенную цену входа
            const totalSpent = (groupedHoldings[h.coinId].amount * groupedHoldings[h.coinId].averageBuyPrice) + (amountNum * buyPriceNum);
            
            groupedHoldings[h.coinId].amount = Number(newAmount.toFixed(8));
            groupedHoldings[h.coinId].averageBuyPrice = Number((totalSpent / newAmount).toFixed(2));
            
            if (!groupedHoldings[h.coinId].ids.includes(h.id)) {
                groupedHoldings[h.coinId].ids.push(h.id);
            }
        } else {
            groupedHoldings[h.coinId] = {
                coinId: h.coinId,
                amount: amountNum,
                averageBuyPrice: buyPriceNum,
                currentPrice: currentPriceNum,
                ids: [h.id]
            };
        }
    });

    Object.values(groupedHoldings).forEach(h => {
        if (hList) {
            const li = document.createElement('li');
            li.onclick = () => {
                document.getElementById('coinId').value = h.coinId;
                showChartForCoin(h.coinId);
            };
            
            const text = document.createElement('span');
            
            const totalValueCalc = Number((h.amount * h.currentPrice).toFixed(2));
            const totalSpentCalc = Number((h.amount * h.averageBuyPrice).toFixed(2));
            const profitLoss = Number((totalValueCalc - totalSpentCalc).toFixed(2));
            
            let badge = '';
            if (profitLoss > 0) {
                badge = ` <span class="stat-positive">(+$${profitLoss.toLocaleString()})</span>`;
            } else if (profitLoss < 0) {
                badge = ` <span class="stat-negative">(-$${Math.abs(profitLoss).toLocaleString()})</span>`;
            }

            const cleanAmount = Number(h.amount.toFixed(8));
            
            // Если монеты покупались по разным ценам, выведется средняя цена входа
            text.innerHTML = `${cleanAmount} ${h.coinId.toUpperCase()} — Вход: $${h.averageBuyPrice.toLocaleString()} (Всего: $${totalValueCalc.toLocaleString()})${badge}`;
            
            const sellBtn = document.createElement('button');
            sellBtn.classList.add('delete-btn');
            sellBtn.textContent = 'Продать';
            sellBtn.onclick = async (e) => {
                e.stopPropagation();
                await sellHolding(h.coinId, h.amount, h.ids);
            };

            li.appendChild(text);
            li.appendChild(sellBtn);
            hList.appendChild(li);
        }
    });

    const statTotalEl = document.getElementById('statTotalValue');
    const statChangeEl = document.getElementById('statChange24h');
    const topCoinsEl = document.getElementById('statTopCoins');
    const avgPricesEl = document.getElementById('statAveragePrices');

    if (topCoinsEl) topCoinsEl.innerHTML = '';
    if (avgPricesEl) avgPricesEl.innerHTML = '';

    if (currentPortfolioId) {
        try {
            const resStats = await fetch(`http://localhost:3000/holdings/stats/${currentPortfolioId}`);
            if (!resStats.ok) throw new Error('Бэкенд вернул ошибку при расчете статистики');
            
            const stats = await resStats.json();
            const totalValue = stats.totalValue || 0;
            const changeAbsolute = stats.change24hAbsolute || 0;
            const changePercent = stats.change24hPercent || 0;
            const topCoins = stats.topCoins || [];
            const averagePrices = stats.averagePrices7Days || {};

            if (statTotalEl) statTotalEl.textContent = `$${totalValue.toLocaleString()}`;

            if (statChangeEl) {
                const sign = changeAbsolute >= 0 ? '+' : '';
                statChangeEl.textContent = `${sign}$${changeAbsolute.toLocaleString()} (${sign}${changePercent}%)`;
                statChangeEl.className = changeAbsolute >= 0 ? 'stat-positive' : 'stat-negative';
            }

            if (topCoinsEl) {
                if (topCoins.length === 0) {
                    topCoinsEl.innerHTML = '<li>Нет активов</li>';
                }
                topCoins.forEach(coin => {
                    const li = document.createElement('li');
                    li.textContent = `${coin.coinId.toUpperCase()}: $${coin.value.toLocaleString()} (${coin.share}%)`;
                    topCoinsEl.appendChild(li);
                });
            }

            if (avgPricesEl) {
                const entries = Object.entries(averagePrices);
                if (entries.length === 0) {
                    avgPricesEl.innerHTML = '<li>Нет данных</li>';
                }
                entries.forEach(([coinId, price]) => {
                    const li = document.createElement('li');
                    li.textContent = `${coinId.toUpperCase()}: $${price.toLocaleString()}`;
                    avgPricesEl.appendChild(li);
                });
            }
        } catch (err) {
            console.error('Ошибка при обновлении статистики:', err);
            if (statTotalEl) statTotalEl.textContent = '$0';
            if (statChangeEl) {
                statChangeEl.textContent = '$0 (0%)';
                statChangeEl.className = '';
            }
        }
    } else {
        if (statTotalEl) statTotalEl.textContent = '$0';
        if (statChangeEl) {
            statChangeEl.textContent = '$0 (0%)';
            statChangeEl.className = '';
        }
    }
}

refreshAll();
showChartForCoin('bitcoin');

document.getElementById('coinId').addEventListener('change', (event) => {
    const selectedCoin = event.target.value;
    showChartForCoin(selectedCoin);
});