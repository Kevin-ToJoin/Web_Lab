import { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useBank, STATEMENT_OPENING_BALANCE } from '../context/BankContext';
import { BankChrome } from './BankChrome';

const STATEMENT_ACCOUNT = '1001-2002-3003';

export const Statement = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { transactions, accounts } = useBank();

  // BUG BNK-30: the month selector is pure decoration — changing it never
  // filters the listed transactions.
  const [month, setMonth] = useState('2026-07');

  const acctTx = transactions.filter(t => t.account === STATEMENT_ACCOUNT);
  const credits = acctTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const debits = acctTx.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  // BUG BNK-28: closing = hardcoded stale opening + net movement — this no
  // longer matches the account's live balance.
  const closing = STATEMENT_OPENING_BALANCE + credits - debits;
  const liveBalance = accounts.find(a => a.number === STATEMENT_ACCOUNT)?.balance ?? 0;

  useEffect(() => {
    setRequirements(`## Vault Online — Monthly Statement
URL: \`/bank/statement\` — account \`${STATEMENT_ACCOUNT}\`

### Functional Requirements
- **Closing balance** must equal *opening balance + credits − debits* **and** reconcile with the account's live balance.
- Statement dates must be **human-readable** (not raw ISO timestamps).
- The **month selector** must actually filter the listed transactions.
- **Download PDF** must produce a statement (or clearly say it's unavailable).

### Bug Hints (4 bugs on this page):
- 🐛 **Level 8 (Data Integrity):** Do the math: opening + credits − debits. Now compare the closing balance against the account's **live balance** on the Dashboard. Do they reconcile?
- 🐛 **Level 2 (Content):** Look at the transaction dates. Are they formatted for humans?
- 🐛 **Level 4:** Change the month selector to a different month. Does the transaction list change at all?
- 🐛 **Level 2:** Click "Download PDF". Anything?`);

    setDbTables({
      Statement_Summary: [{
        account: STATEMENT_ACCOUNT,
        opening_balance: STATEMENT_OPENING_BALANCE,
        total_credits: credits,
        total_debits: debits,
        computed_closing: closing,
        live_account_balance: liveBalance,
        note: 'computed_closing vs live_account_balance — do they reconcile?',
      }],
      Statement_Transactions: acctTx.map(t => ({ id: t.id, type: t.type, amount: t.amount, description: t.desc, date: t.date })),
    });
    setApiEndpoints([]);

    setRemoteSolutions({ app: 'bank', bugIds: ['BNK-28', 'BNK-29', 'BNK-30', 'BNK-31'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, accounts, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <BankChrome>
      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> Monthly Statement
          </h2>
          {/* BUG BNK-30: selector is decorative */}
          <select className="input-field" style={{ width: '150px' }} value={month} onChange={e => setMonth(e.target.value)}>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
            <option value="2026-05">May 2026</option>
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Account {STATEMENT_ACCOUNT} — Alice Morgan
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Opening', value: STATEMENT_OPENING_BALANCE },
            { label: 'Credits', value: credits },
            { label: 'Debits', value: debits },
            { label: 'Closing', value: closing },
          ].map(cell => (
            <div key={cell.label} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.08)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{cell.label}</div>
              {/* BUG BNK-28: closing is computed off the stale hardcoded opening */}
              <div style={{ fontWeight: 'bold' }}>${cell.value.toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {acctTx.map(t => (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)',
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.desc}</div>
                {/* BUG BNK-29: raw ISO timestamp */}
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t.date}</div>
              </div>
              <span style={{ fontWeight: 'bold', color: t.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* BUG BNK-31: no onClick */}
        <button className="btn btn-secondary">
          <Download size={16} /> Download PDF
        </button>
      </div>
    </BankChrome>
  );
};
