'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Home() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [portfolioDetails, setPortfolioDetails] = useState<any>(null);
  const [chartDataPoints, setChartDataPoints] = useState<any[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [coinId, setCoinId] = useState('bitcoin');
  const [amount, setAmount] = useState('');
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [coinChartPoints, setCoinChartPoints] = useState<any[]>([]);
  const [targetPortfolioId, setTargetPortfolioId] = useState<number | null>(null);

  const BACKEND_URL = 'http://localhost:3000';

  const loadPortfolios = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/portfolios/all`);
      const data = await res.json();
      const portfoliosArray = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      setPortfolios(portfoliosArray);
      
      if (portfoliosArray.length > 0) {
        if (!selectedPortfolioId) {
          setSelectedPortfolioId(portfoliosArray[0].id);
        }
        if (targetPortfolioId === null) {
          setTargetPortfolioId(portfoliosArray[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setPortfolios([]);
    }
  };

  const loadPortfolioDetails = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/portfolios/${id}`);
      const data = await res.json();
      setPortfolioDetails(data);
      if (data?.holdings && data.holdings.length > 0) {
        setSelectedCoinId(data.holdings[0].coinId);
      } else {
        setSelectedCoinId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadChartData = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/portfolios/${id}/chart`);
      if (!res.ok) throw new Error('Chart route error');
      const data = await res.json();
      setChartDataPoints(Array.isArray(data) ? data : []);
    } catch (err) {
      setChartDataPoints([]);
    }
  };

  const loadCoinChartData = async (cId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/holdings/history/${cId.toLowerCase()}`);
      if (!res.ok) throw new Error('Coin history error');
      const data = await res.json();
      setCoinChartPoints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCoinChartPoints([]);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolioId) {
      loadPortfolioDetails(selectedPortfolioId);
      loadChartData(selectedPortfolioId);
      setTargetPortfolioId(selectedPortfolioId);
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    if (selectedCoinId) {
      loadCoinChartData(selectedCoinId);
    } else {
      setCoinChartPoints([]);
    }
  }, [selectedCoinId]);

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;
    await fetch(`${BACKEND_URL}/portfolios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPortfolioName }),
    });
    setNewPortfolioName('');
    loadPortfolios();
  };

  const handleDeletePortfolio = async (id: number) => {
    await fetch(`${BACKEND_URL}/portfolios/${id}`, { method: 'DELETE' });
    if (selectedPortfolioId === id) setSelectedPortfolioId(null);
    loadPortfolios();
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    const pId = Number(targetPortfolioId);
    if (!pId || !amount) return;
    try {
      await fetch(`${BACKEND_URL}/portfolios/${pId}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinId, amount: Number(amount) }),
      });
      setAmount('');
      if (pId === selectedPortfolioId) {
        await loadPortfolioDetails(pId);
        await loadChartData(pId);
      } else {
        setSelectedPortfolioId(pId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveHolding = async (holdingId: number, currentAmount: number) => {
    const sellAmountInput = prompt(`Сколько монет продать? (Доступно: ${currentAmount})`, String(currentAmount));
    if (sellAmountInput === null) return;
    
    const sellAmount = Number(sellAmountInput);
    if (isNaN(sellAmount) || sellAmount <= 0) {
      alert('Введите корректное число больше 0');
      return;
    }

    try {
      if (sellAmount >= currentAmount) {
        await fetch(`${BACKEND_URL}/holdings/${holdingId}`, { method: 'DELETE' });
      } else {
        await fetch(`${BACKEND_URL}/holdings/${holdingId}/reduce`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Number(sellAmount) })
        });
      }
      
      if (selectedPortfolioId) {
        await loadPortfolioDetails(selectedPortfolioId);
        await loadChartData(selectedPortfolioId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalValue = portfolioDetails?.holdings?.reduce((sum: number, h: any) => sum + h.totalValue, 0) || 0;
  
  const changeInDollars = portfolioDetails?.stats24h?.changeInDollars || 0;
  const changeInPercentage = portfolioDetails?.stats24h?.changeInPercentage || 0;
  const isNegative = changeInDollars < 0;

  const finalPoints = selectedCoinId ? coinChartPoints : chartDataPoints;
  const safePoints = Array.isArray(finalPoints) ? finalPoints : [];

  const chartData = {
    labels: safePoints.map((p: any) => {
      const dateObj = p?.capturedAt || p?.createdAt;
      return dateObj ? new Date(dateObj).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    }).reverse(),
    datasets: [
      {
        label: selectedCoinId ? `Цена ${selectedCoinId.toUpperCase()} ($)` : 'Стоимость портфеля ($)',
        data: safePoints.map((p: any) => Number(p?.priceUsd || p?.totalValue || 0)).reverse(),
        fill: false,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)' } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="crypto-container">
      
      <div className="crypto-title-wrapper">
        <div className="header-icon-left">
          <img src="/img/money_2.png" alt="Money" />
        </div>

        <h1 className="crypto-title">
          MY CRYPTO TRACKER
        </h1>

        <div className="header-icon-right">
          <img src="/img/zolotaja-moneta-bitcoin.png" alt="Bitcoin" />
        </div>
      </div>

      <div className="crypto-grid">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          <div className="crypto-card">
            <h3 className="crypto-card-title">
              1. Создать портфель
            </h3>
            <form onSubmit={handleCreatePortfolio}>
              <input
                type="text"
                placeholder="Название"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="crypto-input"
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px 15px', cursor: 'pointer', width: '100%', borderRadius: '6px', fontWeight: '600' }}>
                Создать
              </button>
            </form>
          </div>

          <div className="crypto-card">
            <h3 className="crypto-card-title">
              Список портфелей:
            </h3>
            <ul className="crypto-list">
              {portfolios.length === 0 ? (
                <p className="crypto-empty-text">Нет портфелей</p>
              ) : (
                portfolios.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => setSelectedPortfolioId(p.id)}
                    className={`crypto-list-item ${selectedPortfolioId === p.id ? 'crypto-list-item-active' : ''}`}
                  >
                    <span style={{ fontWeight: '500', color: '#333' }}>{p.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(p.id);
                      }}
                      className="btn-danger"
                      style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', width: 'auto', fontWeight: 'normal' }}
                    >
                      X
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {portfolios.length > 0 && (
            <div className="crypto-card">
              <h3 className="crypto-card-title">
                2. Добавить монету
              </h3>
              <form onSubmit={handleAddHolding}>
                <label className="crypto-label">Выберите портфель:</label>
                <select
                  value={targetPortfolioId || ''}
                  onChange={(e) => setTargetPortfolioId(Number(e.target.value))}
                  className="crypto-select"
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <label className="crypto-label">Выберите монету:</label>
                <select
                  value={coinId}
                  onChange={(e) => setCoinId(e.target.value)}
                  className="crypto-select"
                >
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="ethereum">Ethereum (ETH)</option>
                  <option value="solana">Solana (SOL)</option>
                  <option value="binancecoin">BNB (BNB)</option>
                  <option value="ripple">Ripple (XRP)</option>
                </select>

                <label className="crypto-label">Количество:</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Количество (мин. 0.1)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="crypto-input"
                />
                <button type="submit" className="btn-primary" style={{ padding: '10px 15px', cursor: 'pointer', width: '100%', borderRadius: '6px', fontWeight: '600', marginTop: '5px' }}>
                  Добавить актив
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          <div className="crypto-card">
            <h3 className="crypto-card-title">
              Купленные активы:
            </h3>
            {!portfolioDetails || !portfolioDetails.holdings || portfolioDetails.holdings.length === 0 ? (
              <p className="crypto-empty-center">В этом портфеле пока нет монет.</p>
            ) : (
              <ul className="crypto-list">
                {portfolioDetails.holdings.map((h: any) => (
                  <li 
                    key={h.id} 
                    onClick={() => setSelectedCoinId(h.coinId)}
                    className={`crypto-list-item ${selectedCoinId === h.coinId ? 'crypto-list-item-selected-coin' : ''}`}
                  >
                    <div className="crypto-item-text">
                      <span className="crypto-item-name">{h.amount} {h.coinId}</span>
                      <span className="crypto-item-info">— Средняя цена входа: ${h.buyPrice?.toLocaleString()} (Всего: ${h.totalValue?.toLocaleString()})</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveHolding(h.id, h.amount);
                      }}
                      className="btn-danger"
                      style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', width: 'auto' }}
                    >
                      Продать
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="crypto-widgets-row">
            
            <div className="crypto-widget-dark">
              <span className="crypto-widget-label" style={{ color: '#9ca3af' }}>
                Общая стоимость
              </span>
              <span className="crypto-widget-value">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="crypto-widget-profit" style={{ background: isNegative ? '#ef4444' : '#22c55e' }}>
              <span className="crypto-widget-label" style={{ color: '#ffffff', opacity: 0.8 }}>
                Изменение (профит)
              </span>
              <span className="crypto-widget-value">
                {isNegative ? '' : '+'}${changeInDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({changeInPercentage}%)
              </span>
            </div>

          </div>

          <div className="crypto-card">
            <h3 className="crypto-card-title">
              3. График изменений {selectedCoinId ? `цены монеты (${selectedCoinId.toUpperCase()})` : 'портфеля'}
            </h3>
            <div className="crypto-chart-container">
              {safePoints.length === 0 ? (
                <p className="crypto-empty-center">Нет данных для построения графика.</p>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}