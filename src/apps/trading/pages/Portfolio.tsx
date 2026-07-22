import { useEffect } from 'react';
import { PieChart } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useTrading, INITIAL_CASH } from '../context/TradingContext';
import { TradingChrome } from './TradingChrome';

export const Portfolio = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { cash, holdings, prices } = useTrading();

  // BUG TRD-02/TRD-10 (recap): summed as raw floats, never rounded.
  const holdingsValue = holdings.reduce((acc, h) => acc + h.shares * (prices[h.symbol] ?? 0), 0);
  const portfolioTotal = cash + holdingsValue;
  // BUG TRD-06: percentage gain computed with float division and shown with full drift.
  const totalGainPct = ((portfolioTotal - INITIAL_CASH) / INITIAL_CASH) * 100;

  // BUG TRD-24: allocation % for each holding is computed against holdingsValue
  // only (excluding cash), then displayed as if it were % of the WHOLE portfolio
  // — the percentages shown never sum to 100.
  const allocations = holdings.map(h => ({
    symbol: h.symbol,
    value: h.shares * (prices[h.symbol] ?? 0),
    pct: holdingsValue > 0 ? ((h.shares * (prices[h.symbol] ?? 0)) / holdingsValue) * 100 : 0,
  }));

  useEffect(() => {
    setRequirements(`## QuantumTrader Pro — Portfolio Analytics
URL: \`/trading/portfolio\`

### Functional Requirements
- **Total gain %** must be computed cleanly, rounded to 2 decimals.
- Each holding's **allocation %** must be relative to the **whole portfolio** (cash + positions), and all allocation percentages **plus a cash %** must sum to 100%.
- **Day change** must reflect movement since market open, not since the page was loaded.
- The largest position must be clearly flagged as a **concentration risk** if it exceeds 50% of the portfolio.

### Bug Hints (4 bugs on this page):
- 🐛 **Level 10 (Precision):** Look at "Total Gain %". Does it show a clean 2-decimal number or float noise?
- 🐛 **Level 8 (Logic):** Add up every allocation percentage shown, including cash. Do they sum to 100%?
- 🐛 **Level 6:** Watch "Day Change %" right after you load the page, then again a minute later after prices have ticked. Does it track from market open, or does it reset to your load time?
- 🐛 **Level 5:** Buy enough of one symbol that it dominates your portfolio. Does anything warn you about concentration risk?`);

    setDbTables({
      Portfolio_Summary: [{ cash: cash.toFixed(2), holdingsValue: holdingsValue.toFixed(2), portfolioTotal: portfolioTotal.toFixed(2), totalGainPct: totalGainPct.toFixed(4) }],
      Allocations: [
        ...allocations.map(a => ({ symbol: a.symbol, value: a.value.toFixed(2), shown_pct: a.pct.toFixed(1) })),
        { symbol: 'CASH', value: cash.toFixed(2), shown_pct: 'not shown at all' },
      ],
    });
    setApiEndpoints([]);

    setRemoteSolutions({ app: 'trading', bugIds: ['TRD-06', 'TRD-24', 'TRD-25', 'TRD-26'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cash, holdings, prices, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <TradingChrome>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '640px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieChart size={20} /> Portfolio Analytics
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Portfolio Total</div>
            {/* BUG TRD-02/10: unrounded */}
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${portfolioTotal}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Gain</div>
            {/* BUG TRD-06: unrounded */}
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalGainPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {totalGainPct >= 0 ? '+' : ''}{totalGainPct}%
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Allocation</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* BUG TRD-24: cash slice never shown, percentages don't sum to 100 */}
          {/* BUG TRD-26: no concentration warning regardless of pct */}
          {allocations.map(a => (
            <div key={a.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span>{a.symbol}</span>
              <span>{a.pct.toFixed(1)}%</span>
            </div>
          ))}
          {allocations.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No positions held.</p>}
        </div>
      </div>
    </TradingChrome>
  );
};
