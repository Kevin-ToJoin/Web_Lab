import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../../../qa/QAContext';
import { useTrading, TRADABLE, INITIAL_CASH, MARKET_OPEN_HOUR, MARKET_CLOSE_HOUR } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const Trade = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'TRD-01', title: 'Double purchase on rapid Buy clicks', location: 'TradingContext.tsx — executeBuy()',
        technique: 'Race Condition',
        buggyCode: 'if (cost > cash) return;\nawait new Promise(r => setTimeout(r, 450));\nsetCash(cash - cost);',
        fixedCode: 'if (submitting) return;\nsetSubmitting(true);\n// ...await, then:\nsetCash(prev => prev - cost);\nsetSubmitting(false);',
        explanation: 'The check-then-await window lets rapid clicks each pass. Guard with an in-flight flag and use a functional state updater.',
      },
      {
        bugId: 'TRD-02', title: 'Buying power shows float precision error', location: 'TradingChrome.tsx / TradingContext.tsx — cash',
        technique: 'Precision Error',
        buggyCode: '<div>${cash}</div> // raw float, e.g. 9849.999999999996',
        fixedCode: '<div>${cash.toFixed(2)}</div>',
        explanation: 'Repeated float subtraction accumulates drift and is displayed unrounded.',
      },
      {
        bugId: 'TRD-04', title: 'Can oversell shares via rapid clicks', location: 'TradingContext.tsx — executeSell()',
        technique: 'Race Condition',
        buggyCode: 'if (!existing || existing.shares < qty) return;\nawait ...;\nsetHoldings(prev => ...);',
        fixedCode: 'Guard with an in-flight flag and re-check shares inside the functional updater before applying.',
        explanation: 'The shares check reads a stale closure before the await, so concurrent sells exceed the owned amount.',
      },
      {
        bugId: 'TRD-05', title: 'Stale price used at moment of buy', location: 'TradingContext.tsx — priceRef / executeBuy()',
        technique: 'Stale State',
        buggyCode: 'setTimeout(() => { priceRef.current = prices; }, 400);\nconst execPrice = priceRef.current[symbol];',
        fixedCode: 'const execPrice = prices[symbol]; // read the live price directly',
        explanation: 'The delayed ref snapshot lags the live ticker, so trades fill at an out-of-date price.',
      },
      {
        bugId: 'TRD-07', title: 'Order quantity accepts fractional shares', location: 'TradingContext.tsx — executeBuy()/executeSell()',
        technique: 'Boundary Value',
        buggyCode: 'const qty = parseFloat(quantity);',
        fixedCode: 'const qty = parseInt(quantity, 10);\nif (!Number.isInteger(qty) || qty <= 0) { setStatus("Whole shares only"); return; }',
        explanation: 'parseFloat allows 2.5 shares. Parse as an integer and require a positive whole number.',
      },
      {
        bugId: 'TRD-08', title: 'Balance check uses a stale value (TOCTOU)', location: 'TradingContext.tsx — executeBuy()',
        technique: 'TOCTOU',
        buggyCode: 'if (cost > cash) return;\n// ...await...\nsetCash(cash - cost);',
        fixedCode: 'setCash(prev => {\n  if (cost > prev) { /* reject */ return prev; }\n  return prev - cost;\n});',
        explanation: 'The cash read at time-of-check differs from time-of-use. Validate and debit inside one functional update.',
      },
      {
        bugId: 'TRD-09', title: 'Market-closed check off due to timezone', location: 'TradingContext.tsx — isMarketOpen()',
        technique: 'Timezone',
        buggyCode: 'const h = new Date().getHours(); // local time',
        fixedCode: "const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date()));",
        explanation: 'getHours() uses the browser timezone; market hours must be evaluated in US Eastern.',
      },
      {
        bugId: 'TRD-11', title: 'Negative sell quantity acts like a buy', location: 'TradingContext.tsx — executeSell()',
        technique: 'Boundary Value',
        buggyCode: 'const qty = parseFloat(quantity);\n// no qty > 0 guard before selling',
        fixedCode: 'if (!(qty > 0)) { setStatus("Quantity must be positive"); return; }',
        explanation: 'A negative quantity flips the math, adding shares and crediting cash. Reject non-positive quantities.',
      },
      {
        bugId: 'TRD-10', title: 'Cumulative rounding error in weighted average price', location: 'TradingContext.tsx — executeBuy() avgPrice',
        technique: 'Precision Error',
        buggyCode: 'const newAvg = (existing.shares * existing.avgPrice + cost) / newShares;',
        fixedCode: 'const newAvg = Math.round(((existing.shares * existing.avgPrice + cost) / newShares) * 100) / 100;',
        explanation: 'Each unrounded addition compounds error across trades. Round the weighted average to cents.',
      },
      {
        bugId: 'TRD-12', title: 'Concurrent orders exceed buying power', location: 'TradingContext.tsx — executeBuy() / POST /api/orders/buy',
        technique: 'Race Condition',
        buggyCode: 'const accepted = cost <= buyingPower; // no reservation\nsetCash(cash - cost);',
        fixedCode: 'Reserve funds atomically (lock/transaction) and debit with setCash(prev => prev - cost) after re-validating.',
        explanation: 'Two orders validated against the same starting balance both pass and together overspend.',
      },
      {
        bugId: 'TRD-14', title: 'Limit order triggers at wrong price (off-by-epsilon)', location: 'TradingContext.tsx — executeBuy() limit check',
        technique: 'Precision Error',
        buggyCode: 'if (livePrice > lp) { /* not reached */ }',
        fixedCode: 'const EPS = 1e-6;\nif (livePrice - lp > EPS) { /* not reached */ }',
        explanation: 'A raw float compare mis-fires when price and limit differ by a floating-point epsilon. Compare with a tolerance.',
      },
    ];
    setSolutions(solutions);
  }, [holdings, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
