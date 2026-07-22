import { useEffect } from 'react';
import { ListOrdered, X } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useTrading } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const Orders = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
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

    setRemoteSolutions({ app: 'trading', bugIds: ['TRD-15', 'TRD-16', 'TRD-22', 'TRD-23'] });
  }, [pendingOrders, prices, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

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
