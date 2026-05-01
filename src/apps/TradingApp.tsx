import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const INITIAL_FUNDS = 10000.00;

export const TradingApp = () => {
  const navigate = useNavigate();
  
  const [funds, setFunds] = useState(INITIAL_FUNDS);
  const [portfolio, setPortfolio] = useState<{symbol: string, shares: number, avgPrice: number}[]>([]);
  const [history, setHistory] = useState<{id: string, time: string, action: string, details: string}[]>([]);
  
  // Simulated live ticker
  const [price, setPrice] = useState(150.00);
  const priceRef = useRef(price);

  useEffect(() => {
    priceRef.current = price;
  }, [price]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate price slightly
      const change = (Math.random() - 0.5) * 2;
      setPrice(prev => Math.max(1, prev + change));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async (action: 'BUY' | 'SELL') => {
    const sharesToTrade = 10;
    const currentPrice = priceRef.current;
    const cost = sharesToTrade * currentPrice;

    // BUG LEVEL 10: Race Condition
    // The funds check is done here...
    if (action === 'BUY' && funds < cost) {
      alert("Insufficient funds!");
      return;
    }

    // ...but the actual execution and state update is asynchronous (simulating network request).
    // Rapidly clicking "Buy" allows bypassing the funds check because `funds` hasn't updated yet!
    await new Promise(r => setTimeout(r, 500));

    if (action === 'BUY') {
      // BUG LEVEL 10: Floating Point Cascade
      // We are deliberately NOT using rounding here, allowing floating point artifacts to pollute the state.
      // Additionally, we subtract from `funds` state based on the stale closure if they clicked fast!
      // Actually, React state updates using the callback `prev => prev - cost` will prevent the race condition IF written correctly.
      // To ensure the race condition works, we use the `funds` from the closure!
      
      setFunds(funds - cost); // Closure bug! Overwrites concurrent updates!
      
      setPortfolio(prev => {
        const existing = prev.find(p => p.symbol === 'TECH');
        if (existing) {
          // BUG: Floating point math without precision cap
          const newTotalCost = (existing.shares * existing.avgPrice) + cost;
          const newShares = existing.shares + sharesToTrade;
          return [
            { symbol: 'TECH', shares: newShares, avgPrice: newTotalCost / newShares }
          ];
        }
        return [{ symbol: 'TECH', shares: sharesToTrade, avgPrice: currentPrice }];
      });
    } else {
      const existing = portfolio.find(p => p.symbol === 'TECH');
      if (!existing || existing.shares < sharesToTrade) {
        alert("Insufficient shares!");
        return;
      }

      setFunds(funds + cost); // Closure bug!
      setPortfolio(prev => {
        const p = prev[0];
        if (p.shares === sharesToTrade) return [];
        return [{ ...p, shares: p.shares - sharesToTrade }];
      });
    }

    // BUG LEVEL 10: Timezone Offset Sort Bug
    // We intentionally create a timestamp that gets skewed by local timezone offset,
    // which will cause the history to sort incorrectly if the user's timezone changes or during daylight savings boundaries (simulated by adding random ms offsets).
    const weirdTimestamp = new Date(Date.now() + (Math.random() > 0.5 ? 1000 : -1000));
    
    setHistory(prev => {
      const newEntry = {
        id: Math.random().toString(),
        time: weirdTimestamp.toISOString(),
        action,
        details: `${sharesToTrade} TECH @ $${currentPrice.toFixed(2)}`
      };
      
      // Sort alphabetically by ISO string, but the weird timestamps make them out of order
      const newHistory = [newEntry, ...prev];
      return newHistory.sort((a, b) => b.time.localeCompare(a.time));
    });
  };

  const totalPortfolioValue = portfolio.reduce((acc, p) => acc + (p.shares * price), 0);
  const netWorth = funds + totalPortfolioValue;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>QuantumTrader Pro</h1>
          <p>High-frequency execution platform. (Difficulty: Impossible)</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Net Worth</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>${netWorth.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Trading Terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>TECH</h2>
                <div style={{ color: 'var(--text-muted)' }}>Tech Global Index</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: price > 150 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {price > 150 ? <TrendingUp size={36} /> : <TrendingDown size={36} />}
                  ${price.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Live Market Price</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn" 
                style={{ flex: 1, backgroundColor: 'var(--success)', color: '#fff', fontSize: '1.25rem', padding: '1.5rem' }}
                onClick={() => handleTrade('BUY')}
              >
                BUY 10 Shares
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, backgroundColor: 'var(--danger)', color: '#fff', fontSize: '1.25rem', padding: '1.5rem' }}
                onClick={() => handleTrade('SELL')}
              >
                SELL 10 Shares
              </button>
            </div>
            <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Available Funds: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${funds.toFixed(2)}</span>
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Execution History</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {history.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No trades executed.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Time</th>
                      <th style={{ padding: '0.5rem' }}>Action</th>
                      <th style={{ padding: '0.5rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{new Date(h.time).toLocaleTimeString()}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: h.action === 'BUY' ? 'var(--success)' : 'var(--danger)' }}>{h.action}</td>
                        <td style={{ padding: '0.5rem' }}>{h.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio */}
        <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} /> My Portfolio
          </h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Liquid Assets</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>${funds.toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Holdings</div>
            {portfolio.length === 0 ? (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-disabled)' }}>
                Empty Portfolio
              </div>
            ) : (
              portfolio.map(p => {
                const value = p.shares * price;
                const pl = value - (p.shares * p.avgPrice);
                return (
                  <div key={p.symbol} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{p.symbol}</span>
                      <span>{p.shares} shrs</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span>Avg: ${p.avgPrice.toFixed(2)}</span>
                      <span>Val: ${value.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginTop: '0.5rem', color: pl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      <span>P/L:</span>
                      <span>{pl >= 0 ? '+' : ''}${pl.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
