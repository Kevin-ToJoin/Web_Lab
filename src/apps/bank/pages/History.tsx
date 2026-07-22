import { useEffect } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useBank } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const History = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { transactions, accounts } = useBank();

  // BUG BNK-09: history is not filtered to the current user's accounts.
  // BUG BNK-22: rendered in insertion order — oldest first, newest at the bottom.
  const visibleTransactions = transactions;

  useEffect(() => {
    setRequirements(`## Vault Online — Transaction History
URL: \`/bank/history\`

### Functional Requirements
- Must show **only the current user's** transactions (Alice's two accounts).
- Every transaction must display its **date and time**, human-readable.
- Transactions must be sorted **newest first**.
- The user must be able to **filter by account**.

### Bug Hints (4 bugs on this page):
- 🐛 **Level 8 (Data Exposure):** Read every row carefully. Do all of these transactions belong to Alice's accounts? Cross-check owners in the DB viewer.
- 🐛 **Level 2 (Content):** When did each transaction happen? Is a date shown anywhere?
- 🐛 **Level 3:** Make a new transfer, then come back. Is the newest transaction at the top or the bottom?
- 🐛 **Level 2:** Alice has two accounts. Can you filter the list to just one of them?`);

    setDbTables({
      Transactions: transactions.map(t => ({
        id: t.id, account_number: t.account, type: t.type, amount: t.amount, description: t.desc, date: t.date,
      })),
      Account_Owners: accounts.map(a => ({ account_number: a.number, owner: a.owner, is_current_user: a.isCurrentUser })),
    });
    setApiEndpoints([]);

    setRemoteSolutions({ app: 'bank', bugIds: ['BNK-09', 'BNK-21', 'BNK-22', 'BNK-23'] });
  }, [transactions, accounts, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <BankChrome>
      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '640px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HistoryIcon size={20} /> Transaction History
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* BUG BNK-09 (unfiltered) / BNK-21 (no date shown) / BNK-22 (oldest first) */}
          {visibleTransactions.map(t => (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)',
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.desc}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t.account}</div>
              </div>
              <span style={{ fontWeight: 'bold', color: t.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BankChrome>
  );
};
