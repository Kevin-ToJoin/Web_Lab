import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

const INITIAL_CASH = 10000.0;

interface Holding {
  symbol: string;
  shares: number;
  avgPrice: number;
}

interface TradeRecord {
  id: string;
  time: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  shares: number;
  price: number;
}

const TRADABLE = [
  { symbol: 'TECH', name: 'Tech Global Index', price: 150.0 },
  { symbol: 'AERO', name: 'Aerospace Holdings', price: 88.25 },
];

// Market hours in US Eastern (9:30 - 16:00). Used by the market-closed check.
const MARKET_OPEN_HOUR = 9;
const MARKET_CLOSE_HOUR = 16;

const TradingInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [cash, setCash] = useState(INITIAL_CASH);
  const [holdings, setHoldings] = useState<Holding[]>([
    { symbol: 'TECH', shares: 20, avgPrice: 140.0 },
  ]);
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [status, setStatus] = useState('');

  // Order form state
  const [symbol, setSymbol] = useState('TECH');
  const [quantity, setQuantity] = useState('10');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');

  // Simulated live ticker keyed by symbol.
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(TRADABLE.map(t => [t.symbol, t.price]))
  );
  // BUG TRD-05: priceRef snapshot lags the live price; the buy reads this stale ref.
  const priceRef = useRef(prices);
  useEffect(() => {
    // Deliberately delayed sync so a trade can read a stale price.
    const t = setTimeout(() => { priceRef.current = prices; }, 400);
    return () => clearTimeout(t);
  }, [prices]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next: Record<string, number> = {};
        for (const k of Object.keys(prev)) {
          const change = (Math.random() - 0.5) * 2;
          next[k] = Math.max(1, prev[k] + change);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const livePrice = prices[symbol] ?? 0;

  const isMarketOpen = () => {
    // BUG TRD-09: uses the browser's LOCAL hours instead of US Eastern (market) time,
    // so the open/closed check is wrong for any user outside Eastern time.
    const h = new Date().getHours();
    return h >= MARKET_OPEN_HOUR && h < MARKET_CLOSE_HOUR;
  };

  const recordTrade = (rec: Omit<TradeRecord, 'id' | 'time'>) => {
    // BUG TRD-03 / TRD-13: timestamp is built from local wall-clock parts and stored
    // without timezone info, then sorted as a plain string. Across DST boundaries or
    // differing offsets the ordering is wrong.
    const d = new Date();
    const localStamp = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    setHistory(prev => {
      const entry: TradeRecord = { ...rec, id: Math.random().toString(36).slice(2), time: localStamp };
      // BUG TRD-03: lexicographic sort on a non-zero-padded local string mis-orders rows.
      return [entry, ...prev].sort((a, b) => b.time.localeCompare(a.time));
    });
  };

  const executeBuy = async () => {
    setStatus('');
    // BUG TRD-07: parseFloat accepts fractional shares (e.g. 2.5).
    // BUG TRD-11: a negative quantity is not rejected.
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty === 0) {
      setStatus('Error: Enter a quantity.');
      return;
    }

    // BUG TRD-05: reads the stale snapshot price rather than the live price.
    const execPrice = orderType === 'limit' ? parseFloat(limitPrice) : (priceRef.current[symbol] ?? livePrice);

    // BUG TRD-14: limit comparison uses a raw float compare with no epsilon tolerance,
    // so an order that should trigger at the limit can mis-fire by a floating-point epsilon.
    if (orderType === 'limit') {
      const lp = parseFloat(limitPrice);
      if (livePrice > lp) {
        setStatus(`Limit not reached: market ${livePrice.toFixed(4)} > limit ${lp.toFixed(4)}`);
        return;
      }
    }

    const cost = qty * execPrice;

    // BUG TRD-08 (TOCTOU): the affordability check reads the `cash` closure value...
    if (cost > cash) {
      setStatus('Error: Insufficient buying power.');
      return;
    }

    // BUG TRD-01 / TRD-12: async gap before applying the trade. Rapid clicks each pass
    // the stale check above, so concurrent orders double-purchase and overspend.
    await new Promise(r => setTimeout(r, 450));

    // BUG TRD-08 / TRD-12: overwrites cash from the stale closure instead of an updater,
    // dropping concurrent debits so buying power is exceeded.
    setCash(cash - cost);

    setHoldings(prev => {
      const existing = prev.find(h => h.symbol === symbol);
      if (existing) {
        const newShares = existing.shares + qty;
        // BUG TRD-02 / TRD-10: weighted average and totals are accumulated as raw floats
        // with no rounding, so cumulative precision drift pollutes avgPrice and value.
        const newAvg = (existing.shares * existing.avgPrice + cost) / newShares;
        return prev.map(h => h.symbol === symbol ? { symbol, shares: newShares, avgPrice: newAvg } : h);
      }
      return [...prev, { symbol, shares: qty, avgPrice: execPrice }];
    });

    recordTrade({ action: 'BUY', symbol, shares: qty, price: execPrice });
    setStatus(`Bought ${qty} ${symbol} @ $${execPrice.toFixed(2)}`);
  };

  const executeSell = async () => {
    setStatus('');
    const qty = parseFloat(quantity);
    if (isNaN(qty)) {
      setStatus('Error: Enter a quantity.');
      return;
    }

    // BUG TRD-11: negative quantity is not blocked here, so a sell of -10 adds shares
    // and credits cash — effectively a buy.
    const existing = holdings.find(h => h.symbol === symbol);
    const execPrice = priceRef.current[symbol] ?? livePrice;

    // BUG TRD-04: the "enough shares" check reads the `holdings` closure, then awaits;
    // rapid clicks each pass and oversell beyond the owned amount.
    if (!existing || existing.shares < qty) {
      setStatus('Error: Not enough shares.');
      return;
    }

    await new Promise(r => setTimeout(r, 450));

    const proceeds = qty * execPrice;
    setCash(cash + proceeds); // stale closure compounds the race
    setHoldings(prev => {
      const cur = prev.find(h => h.symbol === symbol);
      if (!cur) return prev;
      const remaining = cur.shares - qty;
      if (remaining <= 0) return prev.filter(h => h.symbol !== symbol);
      return prev.map(h => h.symbol === symbol ? { ...h, shares: remaining } : h);
    });

    recordTrade({ action: 'SELL', symbol, shares: qty, price: execPrice });
    setStatus(`Sold ${qty} ${symbol} @ $${execPrice.toFixed(2)}`);
  };

  // BUG TRD-02 / TRD-10: portfolio value summed as raw floats, never rounded to cents.
  const holdingsValue = holdings.reduce((acc, h) => acc + h.shares * (prices[h.symbol] ?? 0), 0);
  const portfolioTotal = cash + holdingsValue;
  // BUG TRD-06: percentage gain computed with float division and shown with full drift.
  const totalGainPct = ((portfolioTotal - INITIAL_CASH) / INITIAL_CASH) * 100;

  useEffect(() => {
    setRequirements(`## Trading Dashboard — "QuantumTrader Pro"

A brokerage dashboard for buying/selling equities, tracking holdings, cash and trade history.

### Functional Requirements
- **Orders are atomic.** Submitting a buy or sell must not be double-applied by rapid clicks, and concurrent orders must never exceed available **buying power** or **owned shares**.
- **Execution price** must be the **live** market price at the moment of execution, not a stale snapshot.
- **Money math** (cash, value, average price, totals) must be **rounded to cents** and free of floating-point drift.
- **Percentage gain** must be computed and displayed cleanly (e.g. rounded to 2 decimals).
- **Order quantity** must be a **positive whole number** of shares — no fractions, no negatives.
- **Buying-power checks** must use the current balance (no time-of-check/time-of-use gap).
- **Market hours** (09:30–16:00 US Eastern) must be evaluated in **market timezone**, not the browser's local time.
- **Transaction history** must sort by true chronological order, correct across timezone/**DST** boundaries.
- **Limit orders** must trigger at the limit price with proper epsilon tolerance.

### Levels
14 bugs, all difficulty **level 10** (race conditions, float precision, timezone, boundary, TOCTOU).`);

    setDbTables({
      Portfolio: holdings.map(h => ({ symbol: h.symbol, shares: h.shares, avgPrice: h.avgPrice })),
      Orders: [
        { id: 1, symbol: 'TECH', side: 'BUY', type: 'market', qty: 10, status: 'filled' },
        { id: 2, symbol: 'AERO', side: 'LIMIT', type: 'limit', qty: 5, limit: 85.0, status: 'open' },
      ],
      Transactions: [
        { id: 'seed-1', symbol: 'TECH', action: 'BUY', shares: 20, price: 140.0, time: '2026-6-14 9:31:02' },
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
                accepted,
                symbol: sym,
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
        path: '/api/portfolio/value',
        description: 'Returns the portfolio total. (Reflects TRD-02/TRD-10: float drift in the total.)',
        payloadTemplate: '{\n  "cash": 0.1,\n  "positions": [0.2]\n}',
        handler: (requestBody: string) => {
          try {
            const { cash: c = 0.1, positions = [0.2] } = JSON.parse(requestBody || '{}');
            // BUG TRD-02 / TRD-10: classic 0.1 + 0.2 = 0.30000000000000004 with no rounding.
            const total = (Array.isArray(positions) ? positions : []).reduce(
              (a: number, v: number) => a + Number(v), Number(c)
            );
            return {
              status: 200,
              body: { total, display: `$${total}`, note: 'Unrounded float total (0.1 + 0.2).' },
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
        bugId: 'TRD-01', title: 'Double purchase on rapid Buy clicks', location: 'TradingApp.tsx — executeBuy()',
        technique: 'Race Condition',
        buggyCode: 'if (cost > cash) return;\nawait new Promise(r => setTimeout(r, 450));\nsetCash(cash - cost);',
        fixedCode: 'if (submitting) return;\nsetSubmitting(true);\n// ...await, then:\nsetCash(prev => prev - cost);\nsetSubmitting(false);',
        explanation: 'The check-then-await window lets rapid clicks each pass. Guard with an in-flight flag and use a functional state updater.',
      },
      {
        bugId: 'TRD-02', title: 'Portfolio total shows float precision error', location: 'TradingApp.tsx — holdingsValue / portfolioTotal',
        technique: 'Precision Error',
        buggyCode: 'const portfolioTotal = cash + holdingsValue;',
        fixedCode: 'const portfolioTotal = Math.round((cash + holdingsValue) * 100) / 100;',
        explanation: 'Summing money as raw floats yields values like 10000.30000000001. Round to cents.',
      },
      {
        bugId: 'TRD-03', title: 'Transaction history sorts wrong (timezone)', location: 'TradingApp.tsx — recordTrade()',
        technique: 'Timezone',
        buggyCode: "const localStamp = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:...`;\nsort((a,b) => b.time.localeCompare(a.time));",
        fixedCode: 'const ts = Date.now(); // store epoch ms\nsort((a, b) => b.ts - a.ts);',
        explanation: 'A non-padded local string sorted lexically misorders rows. Store UTC epoch and sort numerically.',
      },
      {
        bugId: 'TRD-04', title: 'Can oversell shares via rapid clicks', location: 'TradingApp.tsx — executeSell()',
        technique: 'Race Condition',
        buggyCode: 'if (!existing || existing.shares < qty) return;\nawait ...;\nsetHoldings(prev => ...);',
        fixedCode: 'Guard with an in-flight flag and re-check shares inside the functional updater before applying.',
        explanation: 'The shares check reads a stale closure before the await, so concurrent sells exceed the owned amount.',
      },
      {
        bugId: 'TRD-05', title: 'Stale price used at moment of buy', location: 'TradingApp.tsx — priceRef / executeBuy()',
        technique: 'Stale State',
        buggyCode: 'setTimeout(() => { priceRef.current = prices; }, 400);\nconst execPrice = priceRef.current[symbol];',
        fixedCode: 'const execPrice = prices[symbol]; // read the live price directly',
        explanation: 'The delayed ref snapshot lags the live ticker, so trades fill at an out-of-date price.',
      },
      {
        bugId: 'TRD-06', title: 'Percentage gain shows float drift', location: 'TradingApp.tsx — totalGainPct',
        technique: 'Precision Error',
        buggyCode: 'const totalGainPct = ((portfolioTotal - INITIAL_CASH) / INITIAL_CASH) * 100;',
        fixedCode: 'const totalGainPct = Math.round(((portfolioTotal - INITIAL_CASH) / INITIAL_CASH) * 10000) / 100;',
        explanation: 'Float division produces noisy digits. Round the percentage to 2 decimals.',
      },
      {
        bugId: 'TRD-07', title: 'Order quantity accepts fractional shares', location: 'TradingApp.tsx — executeBuy()/executeSell()',
        technique: 'Boundary Value',
        buggyCode: 'const qty = parseFloat(quantity);',
        fixedCode: 'const qty = parseInt(quantity, 10);\nif (!Number.isInteger(qty) || qty <= 0) { setStatus("Whole shares only"); return; }',
        explanation: 'parseFloat allows 2.5 shares. Parse as an integer and require a positive whole number.',
      },
      {
        bugId: 'TRD-08', title: 'Balance check uses a stale value (TOCTOU)', location: 'TradingApp.tsx — executeBuy()',
        technique: 'TOCTOU',
        buggyCode: 'if (cost > cash) return;\n// ...await...\nsetCash(cash - cost);',
        fixedCode: 'setCash(prev => {\n  if (cost > prev) { /* reject */ return prev; }\n  return prev - cost;\n});',
        explanation: 'The cash read at time-of-check differs from time-of-use. Validate and debit inside one functional update.',
      },
      {
        bugId: 'TRD-09', title: 'Market-closed check off due to timezone', location: 'TradingApp.tsx — isMarketOpen()',
        technique: 'Timezone',
        buggyCode: 'const h = new Date().getHours(); // local time',
        fixedCode: "const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date()));",
        explanation: 'getHours() uses the browser timezone; market hours must be evaluated in US Eastern.',
      },
      {
        bugId: 'TRD-10', title: 'Cumulative rounding error in portfolio total', location: 'TradingApp.tsx — holdingsValue / avgPrice',
        technique: 'Precision Error',
        buggyCode: 'holdings.reduce((acc, h) => acc + h.shares * prices[h.symbol], 0)',
        fixedCode: 'Math.round(holdings.reduce((acc, h) => acc + h.shares * prices[h.symbol], 0) * 100) / 100',
        explanation: 'Each unrounded addition compounds error across positions. Round the accumulated total to cents.',
      },
      {
        bugId: 'TRD-11', title: 'Negative sell quantity acts like a buy', location: 'TradingApp.tsx — executeSell()',
        technique: 'Boundary Value',
        buggyCode: 'const qty = parseFloat(quantity);\n// no qty > 0 guard before selling',
        fixedCode: 'if (!(qty > 0)) { setStatus("Quantity must be positive"); return; }',
        explanation: 'A negative quantity flips the math, adding shares and crediting cash. Reject non-positive quantities.',
      },
      {
        bugId: 'TRD-12', title: 'Concurrent orders exceed buying power', location: 'TradingApp.tsx — executeBuy() / POST /api/orders/buy',
        technique: 'Race Condition',
        buggyCode: 'const accepted = cost <= buyingPower; // no reservation\nsetCash(cash - cost);',
        fixedCode: 'Reserve funds atomically (lock/transaction) and debit with setCash(prev => prev - cost) after re-validating.',
        explanation: 'Two orders validated against the same starting balance both pass and together overspend.',
      },
      {
        bugId: 'TRD-13', title: 'History sorts wrong across a DST boundary', location: 'TradingApp.tsx — recordTrade()',
        technique: 'Timezone',
        buggyCode: 'time: local wall-clock string; sort by localeCompare',
        fixedCode: 'Store UTC epoch ms (Date.now()) and sort numerically; render with a fixed timeZone.',
        explanation: 'Local-time strings repeat/shift an hour at DST changes, breaking chronological order.',
      },
      {
        bugId: 'TRD-14', title: 'Limit order triggers at wrong price (off-by-epsilon)', location: 'TradingApp.tsx — executeBuy() limit check',
        technique: 'Precision Error',
        buggyCode: 'if (livePrice > lp) { /* not reached */ }',
        fixedCode: 'const EPS = 1e-6;\nif (livePrice - lp > EPS) { /* not reached */ }',
        explanation: 'A raw float compare mis-fires when price and limit differ by a floating-point epsilon. Compare with a tolerance.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>QuantumTrader Pro</h1>
          <p>High-frequency execution platform. (Difficulty: Impossible)</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Portfolio Total</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>${portfolioTotal}</div>
          <div style={{ fontSize: '0.875rem', color: totalGainPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalGainPct >= 0 ? '+' : ''}{totalGainPct}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Left: ticker, holdings, history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{symbol}</h2>
                <div style={{ color: 'var(--text-muted)' }}>
                  {TRADABLE.find(t => t.symbol === symbol)?.name}
                  {' · '}
                  <span style={{ color: isMarketOpen() ? 'var(--success)' : 'var(--danger)' }}>
                    Market {isMarketOpen() ? 'Open' : 'Closed'}
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

          {/* Holdings table */}
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
                    <th style={{ padding: '0.5rem' }}>Price</th>
                    <th style={{ padding: '0.5rem' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{h.symbol}</td>
                      <td style={{ padding: '0.5rem' }}>{h.shares}</td>
                      <td style={{ padding: '0.5rem' }}>${(prices[h.symbol] ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '0.5rem' }}>${h.shares * (prices[h.symbol] ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Transaction history */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Transaction History</h3>
            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No trades executed.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
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
                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{h.time}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: h.action === 'BUY' ? 'var(--success)' : 'var(--danger)' }}>{h.action}</td>
                        <td style={{ padding: '0.5rem' }}>{h.shares} {h.symbol} @ ${h.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right: order form + cash */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={20} /> Place Order
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Available Cash / Buying Power</div>
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
            <input
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Number of shares"
            />
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
              <input
                className="input-field"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="e.g. 150.00"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={executeBuy}>
              Buy
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={executeSell}>
              Sell
            </button>
          </div>

          {status && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: status.includes('Error') || status.includes('not reached') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: status.includes('Error') || status.includes('not reached') ? 'var(--danger)' : 'var(--success)',
              fontWeight: 500,
            }}>
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TradingApp = () => (
  <QALayout>
    <TradingInner />
  </QALayout>
);
