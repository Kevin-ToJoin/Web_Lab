import { useState, useEffect } from 'react';
import { ArrowLeft, Landmark, Send, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

interface Account {
  number: string;
  owner: string;
  isCurrentUser: boolean;
  balance: number;
}

interface Transaction {
  id: number;
  account: string;
  type: 'debit' | 'credit';
  amount: number;
  desc: string;
}

const CURRENT_USER = 'Alice Morgan';

const INITIAL_ACCOUNTS: Account[] = [
  { number: '1001-2002-3003', owner: 'Alice Morgan', isCurrentUser: true, balance: 1500.0 },
  { number: '1001-2002-9999', owner: 'Alice Morgan', isCurrentUser: true, balance: 320.5 },
  { number: '4004-5005-6006', owner: 'Bob Carter', isCurrentUser: false, balance: 8750.25 },
  { number: '7007-8008-9009', owner: 'Carol Diaz', isCurrentUser: false, balance: 42.0 },
];

const INITIAL_TX: Transaction[] = [
  { id: 1, account: '1001-2002-3003', type: 'credit', amount: 2000.0, desc: 'Payroll deposit' },
  { id: 2, account: '1001-2002-3003', type: 'debit', amount: 500.0, desc: 'Rent payment' },
  { id: 3, account: '1001-2002-9999', type: 'credit', amount: 320.5, desc: 'Transfer in' },
  // BUG BNK-09: a transaction belonging to another user's account is in the shared log.
  { id: 4, account: '4004-5005-6006', type: 'debit', amount: 1200.0, desc: "Bob's car payment" },
];

const BankInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TX);
  const [fromAcct, setFromAcct] = useState(INITIAL_ACCOUNTS[0].number);
  const [toAcct, setToAcct] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  // BUG BNK-13: the last transfer is remembered and replayed on browser back.
  const [lastTransfer, setLastTransfer] = useState<{ from: string; to: string; amount: number } | null>(null);

  const selected = accounts.find(a => a.number === fromAcct) ?? accounts[0];

  const applyTransfer = (from: string, to: string, amt: number) => {
    setAccounts(prev => prev.map(a => {
      if (a.number === from) {
        // BUG BNK-01: no insufficient-funds check, balance can go negative.
        // BUG BNK-06: a negative amt adds to the source (reverses direction).
        return { ...a, balance: a.balance - amt };
      }
      if (a.number === to) {
        // BUG BNK-02: credit side is rounded to 2 decimals while debit is not,
        // so debit and credit no longer match (e.g. 10.005 debited, 10.01 credited).
        const credited = Math.round(amt * 100) / 100;
        return { ...a, balance: a.balance + credited };
      }
      return a;
    }));
    setTransactions(prev => [
      ...prev,
      { id: Date.now(), account: from, type: 'debit', amount: amt, desc: `Transfer to ${to}` },
      { id: Date.now() + 1, account: to, type: 'credit', amount: Math.round(amt * 100) / 100, desc: `Transfer from ${from}` },
    ]);
  };

  const handleTransfer = () => {
    // BUG BNK-08: empty amount is parsed as 0 and processed instead of rejected.
    // BUG BNK-12: parseFloat keeps >2 decimal places (no cents validation).
    const amt = parseFloat(amount) || 0;

    // BUG BNK-14: destination account number format is never validated.
    if (!toAcct) {
      setStatus('Error: Please choose a destination account.');
      return;
    }

    // BUG BNK-05: no check that fromAcct !== toAcct (self-transfer allowed).
    // BUG BNK-11: no daily transfer limit enforced.
    // BUG BNK-01: no balance >= amt validation.

    // BUG BNK-10: balance is updated optimistically before any confirmation step.
    applyTransfer(fromAcct, toAcct, amt);

    // BUG BNK-13: remember the transfer so it can be replayed by the back handler.
    setLastTransfer({ from: fromAcct, to: toAcct, amount: amt });

    // BUG BNK-04: button is never disabled, so a rapid second click runs this
    // handler again before the UI settles — submitting the same transfer twice.
    setStatus(`Transfer of $${amt} submitted. (Simulated)`);
  };

  // BUG BNK-13: on browser back/forward, the cached transfer is silently replayed.
  useEffect(() => {
    const onPop = () => {
      if (lastTransfer) {
        applyTransfer(lastTransfer.from, lastTransfer.to, lastTransfer.amount);
        setStatus('Last transfer replayed on navigation. (Simulated)');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTransfer]);

  // BUG BNK-09: history is not filtered to the current user's accounts.
  const visibleTransactions = transactions;

  useEffect(() => {
    setRequirements(`## Bank Core System — "Vault Online"

A simple online banking portal: pick one of your accounts, view its balance,
transfer funds to another account, and review transaction history.

### Functional Requirements
- The **account dropdown** must only list accounts owned by the **logged-in user**; other users' accounts and balances must never be exposed.
- A **transfer** must validate **sufficient funds** — the source balance can never go **negative** (overdraft).
- **Debit and credit** amounts must be **identical** and rounded consistently to **2 decimal places**.
- The **amount** field must be a **positive** number with **at most 2 decimals**; an **empty** amount is invalid (not treated as 0).
- **Self-transfers** (same source and destination) must be **rejected**.
- A **daily transfer limit** must be enforced.
- The **transfer button** must be **disabled while a transfer is in flight** to prevent double submission.
- The balance must only update **after the transfer is confirmed**, never optimistically.
- **Transaction history** must show **only the current user's** transactions.
- The **session** must **expire** after inactivity; stale tokens must be rejected.
- The browser **back button must not replay** a completed transfer.
- The **destination account number** must match the required **format** (e.g. \`NNNN-NNNN-NNNN\`).

### Levels
14 bugs, difficulty levels 6-8 (validation, precision, data exposure, race condition, session, logic, stale state).`);

    setDbTables({
      Accounts: accounts.map(a => ({
        account_number: a.number,
        owner: a.owner,
        balance: a.balance,
      })),
      Transactions: INITIAL_TX.map(t => ({
        id: t.id,
        account_number: t.account,
        type: t.type,
        amount: t.amount,
        description: t.desc,
      })),
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/transfer',
        description: 'Transfers funds between accounts. Reflects BNK-01 (allows negative result) and BNK-06 (negative amount reverses direction).',
        payloadTemplate: '{\n  "from": "1001-2002-3003",\n  "to": "4004-5005-6006",\n  "amount": 5000\n}',
        handler: (requestBody: string) => {
          try {
            const { from, to, amount: amt } = JSON.parse(requestBody || '{}');
            const src = INITIAL_ACCOUNTS.find(a => a.number === from);
            if (!src) return { status: 404, body: { error: 'Source account not found' } };
            const n = Number(amt);
            // BUG BNK-01/BNK-06: no funds check, no sign check — result can go negative.
            const newBalance = Math.round((src.balance - n) * 100) / 100;
            return {
              status: 200,
              body: { transferred: n, from, to, newBalance },
            };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/accounts/balance',
        description: 'Looks up a balance by account number. Reflects BNK-03: leaks any requested account regardless of owner/session.',
        payloadTemplate: '{\n  "accountNumber": "4004-5005-6006"\n}',
        handler: (requestBody: string) => {
          try {
            const { accountNumber } = JSON.parse(requestBody || '{}');
            const acct = INITIAL_ACCOUNTS.find(a => a.number === accountNumber);
            if (!acct) return { status: 404, body: { error: 'Account not found' } };
            // BUG BNK-03: no ownership/session check — returns any account's balance.
            return {
              status: 200,
              body: { accountNumber: acct.number, owner: acct.owner, balance: acct.balance },
            };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      {
        bugId: 'BNK-01', title: 'Transfer allows the source account to go negative (overdraft)',
        location: 'BankApp.tsx — applyTransfer()/handleTransfer()', technique: 'Missing Validation',
        buggyCode: 'return { ...a, balance: a.balance - amt };',
        fixedCode: 'if (amt > src.balance) { setStatus("Error: Insufficient funds."); return; }',
        explanation: 'No insufficient-funds check lets a transfer overdraw the source. Validate amt <= balance before applying.',
      },
      {
        bugId: 'BNK-02', title: 'Rounding error makes the debit and credit amounts differ',
        location: 'BankApp.tsx — applyTransfer()', technique: 'Precision',
        buggyCode: 'balance: a.balance - amt   // debit raw\nbalance: a.balance + Math.round(amt*100)/100  // credit rounded',
        fixedCode: 'const cents = Math.round(amt * 100) / 100;\n// debit and credit both use cents',
        explanation: 'Debit uses the raw amount while credit is rounded, so the two sides diverge. Round both consistently.',
      },
      {
        bugId: 'BNK-03', title: 'Any user can view other users balances via the session dropdown',
        location: 'BankApp.tsx — account dropdown / /api/accounts/balance', technique: 'Data Exposure',
        buggyCode: 'accounts.map(a => <option>...{a.balance}</option>)',
        fixedCode: 'accounts.filter(a => a.isCurrentUser).map(a => <option>...)',
        explanation: 'The dropdown lists every account including other owners and their balances. Filter to the current user.',
      },
      {
        bugId: 'BNK-04', title: 'Rapid clicks submit the same transfer twice (button not disabled)',
        location: 'BankApp.tsx — transfer button', technique: 'Race Condition',
        buggyCode: '<button onClick={handleTransfer}>Transfer</button>',
        fixedCode: 'const [submitting, setSubmitting] = useState(false);\n<button disabled={submitting} onClick={...}>',
        explanation: 'The button stays enabled during submission, so a double click sends two transfers. Disable while in flight.',
      },
      {
        bugId: 'BNK-05', title: 'Transfer to the same account is allowed',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Logic Bug',
        buggyCode: '// no fromAcct !== toAcct check',
        fixedCode: 'if (fromAcct === toAcct) { setStatus("Error: Cannot transfer to the same account."); return; }',
        explanation: 'Source and destination can be identical, which is a no-op (or worse with rounding). Reject self-transfers.',
      },
      {
        bugId: 'BNK-06', title: 'Negative transfer amount reverses the direction of funds',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Boundary Value',
        buggyCode: 'const amt = parseFloat(amount) || 0;  // accepts negatives',
        fixedCode: 'if (amt <= 0) { setStatus("Error: Amount must be positive."); return; }',
        explanation: 'A negative amount subtracts a negative (crediting the source and debiting the target). Require amt > 0.',
      },
      {
        bugId: 'BNK-07', title: 'Session never expires so a stale auth token is still accepted',
        location: 'BankApp.tsx — session handling', technique: 'Session',
        buggyCode: '// no session timeout — token treated as valid forever',
        fixedCode: 'if (Date.now() - sessionStart > SESSION_TTL) { logout(); return; }',
        explanation: 'There is no inactivity timeout, so a long-lived token keeps working. Expire sessions and re-auth.',
      },
      {
        bugId: 'BNK-08', title: 'Empty amount field is processed as a zero transfer',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Boundary Value',
        buggyCode: 'const amt = parseFloat(amount) || 0;',
        fixedCode: 'if (amount.trim() === "" || isNaN(parseFloat(amount))) { setStatus("Error: Enter an amount."); return; }',
        explanation: 'An empty field falls back to 0 and is submitted. Reject blank/NaN amounts before processing.',
      },
      {
        bugId: 'BNK-09', title: 'Transaction history shows another accounts transactions',
        location: 'BankApp.tsx — visibleTransactions', technique: 'Data Integrity',
        buggyCode: 'const visibleTransactions = transactions;',
        fixedCode: 'const mine = accounts.filter(a => a.isCurrentUser).map(a => a.number);\nconst visibleTransactions = transactions.filter(t => mine.includes(t.account));',
        explanation: "History is unfiltered and includes other accounts (e.g. Bob's car payment). Filter to the user's accounts.",
      },
      {
        bugId: 'BNK-10', title: 'Balance updates optimistically before the transfer is confirmed',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Logic Bug',
        buggyCode: 'applyTransfer(fromAcct, toAcct, amt);  // before confirmation',
        fixedCode: 'const ok = await confirmTransfer(...);\nif (ok) applyTransfer(...);',
        explanation: 'Balances mutate immediately, before the backend confirms. Only apply changes once the transfer is confirmed.',
      },
      {
        bugId: 'BNK-11', title: 'No daily transfer limit is enforced',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Missing Validation',
        buggyCode: '// no daily total check',
        fixedCode: 'if (todayTotal + amt > DAILY_LIMIT) { setStatus("Error: Daily limit exceeded."); return; }',
        explanation: 'Transfers of any size and frequency are accepted. Track the daily total and enforce a cap.',
      },
      {
        bugId: 'BNK-12', title: 'Amount field accepts more than two decimal places',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Precision',
        buggyCode: 'const amt = parseFloat(amount) || 0;  // 10.12345 allowed',
        fixedCode: 'if (!/^\\d+(\\.\\d{1,2})?$/.test(amount)) { setStatus("Error: Max 2 decimals."); return; }',
        explanation: 'Amounts like 10.12345 are accepted. Validate to at most two decimal places (whole cents).',
      },
      {
        bugId: 'BNK-13', title: 'Browser back button replays the last transfer',
        location: 'BankApp.tsx — popstate effect / lastTransfer', technique: 'Stale State',
        buggyCode: 'window.addEventListener("popstate", () => applyTransfer(lastTransfer...))',
        fixedCode: 'Do not cache/replay transfers on navigation; rely on idempotent server-side request tokens.',
        explanation: 'Navigating back re-applies the cached transfer, duplicating it. Never replay completed transactions client-side.',
      },
      {
        bugId: 'BNK-14', title: 'Account number format is not validated',
        location: 'BankApp.tsx — handleTransfer()', technique: 'Equivalence Partitioning',
        buggyCode: 'if (!toAcct) { ... }  // no format check',
        fixedCode: 'if (!/^\\d{4}-\\d{4}-\\d{4}$/.test(toAcct)) { setStatus("Error: Invalid account number."); return; }',
        explanation: 'Any string is accepted as a destination. Enforce the NNNN-NNNN-NNNN account-number pattern.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Vault Online Banking</h1>
          <p>Logged in as {CURRENT_USER}. (Difficulty: Hard)</p>
        </div>
        <Landmark size={32} style={{ color: 'var(--primary)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Transfer + balance */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} /> Make a Transfer
          </h2>

          <div className="input-group">
            <label className="input-label">From Account</label>
            {/* BUG BNK-03: dropdown lists every account incl. other users and balances */}
            <select
              className="input-field"
              value={fromAcct}
              onChange={(e) => setFromAcct(e.target.value)}
            >
              {accounts.map(a => (
                <option key={a.number} value={a.number}>
                  {a.number} — {a.owner} (${a.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div style={{
            margin: '1rem 0', padding: '1rem', borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
          }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Current Balance</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              ${selected.balance.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{selected.owner}</div>
          </div>

          <div className="input-group">
            <label className="input-label">To Account</label>
            {/* BUG BNK-14: no format validation on the destination account number */}
            <input
              className="input-field"
              placeholder="e.g. 1001-2002-9999"
              value={toAcct}
              onChange={(e) => setToAcct(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Amount</label>
            {/* BUG BNK-06/08/12: accepts negatives, blanks, and >2 decimals */}
            <input
              className="input-field"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* BUG BNK-04: button is never disabled while a transfer is in flight */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }}
            onClick={handleTransfer}
          >
            <Send size={18} /> Send Transfer
          </button>

          {status && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: status.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: status.includes('Error') ? 'var(--danger)' : 'var(--success)',
              fontWeight: 500,
            }}>
              {status}
            </div>
          )}
        </div>

        {/* Transaction history */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} /> Transaction History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* BUG BNK-09: shows transactions for other users' accounts too */}
            {visibleTransactions.map(t => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)',
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.desc}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t.account}</div>
                </div>
                <span style={{
                  fontWeight: 'bold',
                  color: t.type === 'credit' ? 'var(--success)' : 'var(--danger)',
                }}>
                  {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BankApp = () => (
  <QALayout>
    <BankInner />
  </QALayout>
);
