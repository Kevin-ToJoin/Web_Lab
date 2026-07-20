import { useEffect } from 'react';
import { ListOrdered, X } from 'lucide-react';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useTrading } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const Orders = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const { pendingOrders, cancelPendingOrder, prices } = useTrading();

  useEffect(() => {
    setRequirements(`## QuantumTrader Pro — Open Orders
URL: \`/trading/orders\`

### Functional Requirements
- A queued limit order must **actually fill** once the live price crosses the limit — it must not sit forever.
- Cancelling an order must be **immediate** and must never leave a "ghost" reservation on buying power.
- Each order must show its **age** (how long it's been open), not just its creation instant.
- Orders must be reachable from the Trade page after a limit order doesn't immediately fill.

### Bug Hints (4 bugs on this page):
- 🐛 **Level 9:** Place a limit buy below the live price (it queues here). Wait and watch the live price on the Trade page cross your limit. Does this order ever fill?
- 🐛 **Level 6:** Cancel a queued order. Then check your Buying Power on the Trade page — did it change at all (was anything ever actually reserved)?
- 🐛 **Level 2 (Content):** Does each row tell you how long the order has been open?
- 🐛 **Level 2:** From the Trade page, place a limit order that doesn't fill immediately. Does the status message tell you where to find it?`);

    setDbTables({
      Open_Orders: pendingOrders.map(o => ({ id: o.id, symbol: o.symbol, shares: o.shares, limit: o.limitPrice, current: (prices[o.symbol] ?? 0).toFixed(2), createdAt: o.createdAt })),
    });
    setApiEndpoints([]);

    const solutions: BugSolution[] = [
      {
        bugId: 'TRD-15', title: 'Queued limit orders never actually fill',
        location: 'TradingContext.tsx — pendingOrders / price tick effect', technique: 'Missing Functionality',
        buggyCode: '// pendingOrders is populated on limit miss, but the price-tick interval\n// never re-checks pendingOrders against the new live price',
        fixedCode: 'useEffect(() => {\n  pendingOrders.forEach(o => {\n    if (prices[o.symbol] <= o.limitPrice) fillOrder(o);\n  });\n}, [prices]);',
        explanation: 'The status message implies the order is "working," but nothing ever revisits pendingOrders as prices move — it just sits here forever, unfillable.',
      },
      {
        bugId: 'TRD-16', title: 'Cancelling an order never reserved buying power to release',
        location: 'TradingContext.tsx — cancelPendingOrder()', technique: 'Logic Error',
        buggyCode: 'const cancelPendingOrder = (id) => setPendingOrders(prev => prev.filter(o => o.id !== id));\n// cash was never debited/reserved when the order was placed',
        fixedCode: '// Reserve (debit) funds when a limit order is queued, then release\n// (credit back) the reservation on cancel — buying power should reflect open orders.',
        explanation: 'Since queued orders never reserved funds in the first place, a customer could place far more in open orders than their actual buying power — the "Orders" total is disconnected from "Buying Power."',
      },
      {
        bugId: 'TRD-22', title: 'Order age is never shown',
        location: 'Orders.tsx — order row', technique: 'Missing Functionality',
        buggyCode: '<td>{o.symbol}</td><td>{o.shares}</td><td>${o.limitPrice}</td>\n{/* createdAt exists but is never rendered or diffed against now */}',
        fixedCode: '<td>{formatRelativeTime(o.createdAt)}</td> // "queued 4m ago"',
        explanation: 'createdAt is stored on every order (see the DB viewer) but never surfaced — a trader has no idea how stale a queued order is.',
      },
      {
        bugId: 'TRD-23', title: 'No link from Trade to Orders when a limit order queues',
        location: 'Trade.tsx / TradingContext.tsx — limit-miss status message', technique: 'Missing Functionality',
        buggyCode: 'setStatus(`Limit not reached: ... Order queued (won\'t actually fill — see Orders page).`);\n// plain text, not a link/navigation',
        fixedCode: '<Link to="/trading/orders">View queued orders</Link> instead of plain status text.',
        explanation: 'The status message tells the trader to "see Orders page" but gives no clickable way to get there.',
      },
    ];
    setSolutions(solutions);
  }, [pendingOrders, prices, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <TradingChrome>
      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '640px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ListOrdered size={20} /> Open Limit Orders
        </h2>

        {pendingOrders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No open orders. Place a limit order below the live price on the Trade page to see it queue here.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Symbol</th>
                <th style={{ padding: '0.5rem' }}>Shares</th>
                <th style={{ padding: '0.5rem' }}>Limit</th>
                <th style={{ padding: '0.5rem' }}>Current</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {/* BUG TRD-22: order age (createdAt) never shown */}
              {pendingOrders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{o.symbol}</td>
                  <td style={{ padding: '0.5rem' }}>{o.shares}</td>
                  <td style={{ padding: '0.5rem' }}>${o.limitPrice.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>${(prices[o.symbol] ?? 0).toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => cancelPendingOrder(o.id)}>
                      <X size={14} /> Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </TradingChrome>
  );
};
