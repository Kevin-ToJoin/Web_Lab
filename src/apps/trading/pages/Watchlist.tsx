import { useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useTrading, TRADABLE } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const Watchlist = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { watchlist, addToWatchlist, removeFromWatchlist, prices } = useTrading();

  const [symbol, setSymbol] = useState('TECH');
  const [alertAbove, setAlertAbove] = useState('');

  useEffect(() => {
    setRequirements(`## QuantumTrader Pro — Watchlist
URL: \`/trading/watchlist\`

### Functional Requirements
- A symbol can only appear on the watchlist **once**.
- A price alert ("notify when above $X") must actually **fire** when the live price crosses it.
- Removing a watchlist item must be immediate and reflected in the list.
- The watchlist must **persist** across a page reload.

### Bug Hints (5 bugs on this page):
- 🐛 **Level 6:** Add \`AERO\` to the watchlist again (it's already there with an alert at $95). Does it appear twice?
- 🐛 **Level 8:** AERO has an alert set for "above $95". Watch the live price cross $95 — does anything notify you?
- 🐛 **Level 3 (Accessibility):** Is the alert threshold shown anywhere as text, or only implied?
- 🐛 **Level 5 (State):** Add a symbol to the watchlist, then **refresh the page**. Still there?
- 🐛 **Level 2 (UX):** Click the remove (trash) icon on a row. Any confirmation, or instant delete?`);

    setDbTables({
      Watchlist: watchlist.map(w => ({ symbol: w.symbol, alert_above: w.alertAbove ?? '(none)', current_price: (prices[w.symbol] ?? 0).toFixed(2) })),
    });
    setApiEndpoints([]);

    setRemoteSolutions({ app: 'trading', bugIds: ['TRD-17', 'TRD-18', 'TRD-19', 'TRD-20', 'TRD-21'] });
  }, [watchlist, prices, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  const handleAdd = () => {
    addToWatchlist(symbol, alertAbove ? parseFloat(alertAbove) : null);
    setAlertAbove('');
  };

  return (
    <TradingChrome>
      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '560px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Star size={20} /> Watchlist
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {watchlist.map((w, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)',
            }}>
              {/* BUG TRD-19: alertAbove never surfaced as text */}
              <span style={{ fontWeight: 600 }}>{w.symbol}</span>
              <span>${(prices[w.symbol] ?? 0).toFixed(2)}</span>
              {/* BUG TRD-21: instant delete, no confirmation */}
              <button className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '0.4rem' }}
                aria-label={`Remove ${w.symbol}`} onClick={() => removeFromWatchlist(w.symbol)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {watchlist.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nothing on your watchlist.</p>}
        </div>

        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add symbol</h3>
        <div className="input-group">
          <label className="input-label">Symbol</label>
          <select className="input-field" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {TRADABLE.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ marginTop: '0.75rem' }}>
          <label className="input-label">Alert when price above ($, optional)</label>
          <input className="input-field" value={alertAbove} onChange={(e) => setAlertAbove(e.target.value)} placeholder="e.g. 95" />
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAdd}>Add to Watchlist</button>
      </div>
    </TradingChrome>
  );
};
