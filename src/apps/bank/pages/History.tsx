import { useEffect } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useBank } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const History = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'BNK-09', title: 'Transaction history shows another account\'s transactions',
        location: 'History.tsx — visibleTransactions', technique: 'Data Integrity',
        buggyCode: 'const visibleTransactions = transactions;',
        fixedCode: 'const mine = accounts.filter(a => a.isCurrentUser).map(a => a.number);\nconst visibleTransactions = transactions.filter(t => mine.includes(t.account));',
        explanation: "History is unfiltered and includes other accounts (e.g. Bob's car payment). Filter to the user's accounts.",
      },
      {
        bugId: 'BNK-21', title: 'Transactions display no date or time',
        location: 'History.tsx — transaction rows', technique: 'Missing Functionality',
        buggyCode: '<div>{t.desc}</div>\n<div>{t.account}</div>\n// t.date exists in the data but is never rendered',
        fixedCode: '<div>{new Date(t.date).toLocaleString()}</div>',
        explanation: 'The data model carries a date for every transaction (see the DB viewer), but the UI never shows it — a bank history without timestamps is unusable.',
      },
      {
        bugId: 'BNK-22', title: 'History is sorted oldest-first (newest at the bottom)',
        location: 'BankContext.tsx — applyTransfer() / History.tsx', technique: 'Missing Functionality',
        buggyCode: 'setTransactions(prev => [...prev, debitTx, creditTx]); // appended at the end',
        fixedCode: '[...visibleTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())',
        explanation: 'New transfers are appended to the end of the array and rendered as-is, so the most recent activity is buried at the bottom.',
      },
      {
        bugId: 'BNK-23', title: 'No way to filter history by account',
        location: 'History.tsx — page header', technique: 'Missing Functionality',
        buggyCode: '// no account selector — both of Alice\'s accounts (and others\') render mixed together',
        fixedCode: '<select value={filterAcct} onChange={...}>{myAccounts.map(a => <option .../>)}</select>',
        explanation: 'Transactions from every account render interleaved with no filter control, making per-account review impossible.',
      },
    ];
    setSolutions(solutions);
  }, [transactions, accounts, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
