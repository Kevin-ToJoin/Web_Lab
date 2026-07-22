import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useQAPanel, type APIEndpoint } from '../../../qa/QAContext';
import { useTrading, TRADABLE, INITIAL_CASH, MARKET_OPEN_HOUR, MARKET_CLOSE_HOUR } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const Trade = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { cash, holdings, prices, status, isMarketOpen, executeBuy, executeSell } = useTrading();

  const [symbol, setSymbol] = useState('TECH');
  const [quantity, setQuantity] = useState('10');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');

  const livePrice = prices[symbol] ?? 0;

  useEffect(() => {
    setRequirements(`## QuantumTrader Pro — Trade
URL: \`/trading\`

### Functional Requirements
- **Orders are atomic.** Rapid clicks must not double-apply a buy/sell, and concurrent orders must never exceed available **buying power** or **owned shares**.
- **Execution price** must be the **live** market price at the moment of execution, not a stale snapshot.
- **Money math** (cash, holdings value) must be **rounded to cents** and free of floating-point drift.
- **Order quantity** must be a **positive whole number** of shares — no fractions, no negatives.
- **Buying-power checks** must use the current balance (no time-of-check/time-of-use gap).
- **Market hours** (09:30–16:00 US Eastern) must be evaluated in **market timezone**, not the browser's local time.
- **Limit orders** must trigger at the limit price with proper epsilon tolerance.

### Levels
Level 10 (race conditions, float precision, timezone, boundary, TOCTOU).

### Bug Hints (12 bugs on this page):
- 🐛 Click **Buy** twice very fast. Check the buying power — did it debit once or twice?
- 🐛 Watch the "Buying Power" figure closely. Does it ever show trailing float noise like $9849.999999996?
- 🐛 Sell shares you own, clicking **Sell** twice rapidly. Do you end up short shares?
- 🐛 Buy right as the live price ticks — does the fill price match what you saw, or a slightly older number?
- 🐛 Type \`2.5\` as the quantity. Accepted?
- 🐛 Buy right up to your exact cash balance, twice in a row very fast (two browser tabs). Total spend vs available cash?
- 🐛 Check "Market Open/Closed" against your actual local time vs. US Eastern (9:30–16:00). Change your system clock/timezone if you can — does the badge track Eastern or local time?
- 🐛 Sell \`-10\` shares. What happens to your holdings and cash?
- 🐛 Place a limit **Buy** at a price extremely close to the live price (e.g. same to 4 decimals). Does it fire consistently?
- 🐛 Enter a fractional quantity, then check whether shares/avgPrice ever pick up tiny decimal drift over several trades.`);

    setDbTables({
      Portfolio: holdings.map(h => ({ symbol: h.symbol, shares: h.shares, avgPrice: h.avgPrice })),
      Orders: [
        { id: 1, symbol: 'TECH', side: 'BUY', type: 'market', qty: 10, status: 'filled' },
        { id: 2, symbol: 'AERO', side: 'LIMIT', type: 'limit', qty: 5, limit: 85.0, status: 'open' },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/orders/buy',
        description: 'Places a buy order. (Reflects TRD-12: concurrent orders bypass the buying-power check.)',
        payloadTemplate: '{\n  "symbol": "TECH",\n  "shares": 10,\n  "price": 150\n}',
        handler: (requestBody: string) => {
          try {
            const { symbol: sym, shares, price } = JSON.parse(requestBody || '{}');
            const qty = Number(shares);
            const px = Number(price);
            const cost = qty * px;
            // BUG TRD-12 / TRD-08: each request validates against the SAME starting cash,
            // so two concurrent orders both "pass" and together exceed buying power.
            const buyingPower = INITIAL_CASH;
            const accepted = cost <= buyingPower; // no reservation/locking
            return {
              status: accepted ? 200 : 402,
              body: {
                accepted, symbol: sym,
                shares: qty, // BUG TRD-07: fractional qty accepted as-is
                cost,                 // BUG TRD-02: raw float, e.g. 10 * 150.000001
                remaining: buyingPower - cost,
                note: 'No funds reservation — concurrent orders can overspend.',
              },
            };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/orders/limit/check',
        description: 'Checks whether a limit order should trigger. (Reflects TRD-14: off-by-epsilon.)',
        payloadTemplate: '{\n  "market": 0.3,\n  "limit": 0.3\n}',
        handler: (requestBody: string) => {
          try {
            const { market, limit } = JSON.parse(requestBody || '{}');
            const m = Number(market);
            const l = Number(limit);
            // BUG TRD-14: raw float compare with no epsilon — 0.1+0.2 vs 0.3 mis-fires.
            const triggered = m <= l;
            return { status: 200, body: { triggered, market: m, limit: l, note: 'No epsilon tolerance.' } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    setRemoteSolutions({ app: 'trading', bugIds: ['TRD-01', 'TRD-02', 'TRD-04', 'TRD-05', 'TRD-07', 'TRD-08', 'TRD-09', 'TRD-11', 'TRD-10', 'TRD-12', 'TRD-14'] });
  }, [holdings, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <TradingChrome>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{symbol}</h2>
                <div style={{ color: 'var(--text-muted)' }}>
                  {TRADABLE.find(t => t.symbol === symbol)?.name}
                  {' · '}
                  <span style={{ color: isMarketOpen() ? 'var(--success)' : 'var(--danger)' }}>
                    Market {isMarketOpen() ? 'Open' : 'Closed'} ({MARKET_OPEN_HOUR}:30–{MARKET_CLOSE_HOUR}:00 ET)
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {livePrice >= (TRADABLE.find(t => t.symbol === symbol)?.price ?? 0) ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                  ${livePrice.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Live Market Price</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} /> Portfolio Holdings
            </h3>
            {holdings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No holdings.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Symbol</th>
                    <th style={{ padding: '0.5rem' }}>Shares</th>
                    <th style={{ padding: '0.5rem' }}>Avg Price</th>
                    <th style={{ padding: '0.5rem' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{h.symbol}</td>
                      <td style={{ padding: '0.5rem' }}>{h.shares}</td>
                      {/* BUG TRD-10: unrounded weighted-average price */}
                      <td style={{ padding: '0.5rem' }}>${h.avgPrice}</td>
                      <td style={{ padding: '0.5rem' }}>${(prices[h.symbol] ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={20} /> Place Order
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Available Cash / Buying Power</div>
            {/* BUG TRD-02: unrounded */}
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>${cash}</div>
          </div>

          <div className="input-group">
            <label className="input-label">Symbol</label>
            <select className="input-field" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {TRADABLE.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Quantity</label>
            <input className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Number of shares" />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Order Type</label>
            <select className="input-field" value={orderType} onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>

          {orderType === 'limit' && (
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="input-label">Limit Price</label>
              <input className="input-field" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="e.g. 150.00" />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={() => executeBuy(symbol, quantity, orderType, limitPrice)}>
              Buy
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => executeSell(symbol, quantity)}>
              Sell
            </button>
          </div>

          {status && (
            <div style={{
              marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)',
              background: status.includes('Error') || status.includes('not reached') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: status.includes('Error') || status.includes('not reached') ? 'var(--danger)' : 'var(--success)',
              fontWeight: 500,
            }}>
              {status}
            </div>
          )}
        </div>
      </div>
    </TradingChrome>
  );
};
