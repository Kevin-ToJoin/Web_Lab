import { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useTrading } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const History = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const { history } = useTrading();

  useEffect(() => {
    setRequirements(`## QuantumTrader Pro — Transaction History
URL: \`/trading/history\`

### Functional Requirements
- Trades must sort by **true chronological order**, correct across timezone and **DST** boundaries.
- Every trade must record and display an **unambiguous, timezone-aware** timestamp.
- The history must be **exportable** (e.g. CSV) for tax/audit purposes.
- History must **survive a page refresh** within the same session.

### Bug Hints (3 bugs on this page):
- 🐛 **Level 10 (Timezone):** Make several trades quickly. Are they always ordered newest-first, or can you get them out of order (check right around any hour/minute boundary, e.g. 9:59 → 10:00)?
- 🐛 **Level 2 (Content):** Is the timestamp format unambiguous (includes timezone), or just local wall-clock digits?
- 🐛 **Level 2:** Is there any way to export or download your trade history?`);

    setDbTables({
      Transactions: history.length === 0
        ? [{ note: 'No trades yet this session.' }]
        : history.map(h => ({ id: h.id, time: h.time, action: h.action, symbol: h.symbol, shares: h.shares, price: h.price })),
      Seed_Transaction: [{ id: 'seed-1', symbol: 'TECH', action: 'BUY', shares: 20, price: 140.0, time: '2026-6-14 9:31:02' }],
    });
    setApiEndpoints([]);

    const solutions: BugSolution[] = [
      {
        bugId: 'TRD-03', title: 'Transaction history sorts wrong (non-padded local string)', location: 'TradingContext.tsx — recordTrade()',
        technique: 'Timezone',
        buggyCode: "const localStamp = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:...`;\nsort((a,b) => b.time.localeCompare(a.time));",
        fixedCode: 'const ts = Date.now(); // store epoch ms\nsort((a, b) => b.ts - a.ts);',
        explanation: 'A non-padded local string ("9:5:2" vs "10:12:0") sorted lexically misorders rows — "10" sorts before "9". Store UTC epoch and sort numerically.',
      },
      {
        bugId: 'TRD-13', title: 'History sorts wrong across a DST boundary', location: 'TradingContext.tsx — recordTrade()',
        technique: 'Timezone',
        buggyCode: 'time: local wall-clock string; sort by localeCompare',
        fixedCode: 'Store UTC epoch ms (Date.now()) and sort numerically; render with a fixed timeZone.',
        explanation: 'Local-time strings repeat/shift an hour at DST changes, breaking chronological order across that boundary.',
      },
      {
        bugId: 'TRD-27', title: 'No way to export transaction history',
        location: 'History.tsx — page body', technique: 'Missing Functionality',
        buggyCode: '<table>{history.map(...)}</table> // no export/download control anywhere',
        fixedCode: '<button onClick={() => downloadCsv(history)}>Export CSV</button>',
        explanation: 'A trading platform\'s history is needed for tax/audit purposes, but there is no way to get it out of the browser.',
      },
    ];
    setSolutions(solutions);
  }, [history, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <TradingChrome>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '640px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Transaction History
        </h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No trades executed yet.</p>
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
              {/* BUG TRD-03/TRD-13: local, non-padded, un-zoned timestamp */}
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
    </TradingChrome>
  );
};
