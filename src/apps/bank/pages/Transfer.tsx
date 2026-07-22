import { useEffect } from 'react';
import { Send } from 'lucide-react';
import { useQAPanel, type APIEndpoint } from '../../../qa/QAContext';
import { useBank, INITIAL_ACCOUNTS } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const Transfer = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const {
    accounts, fromAcct, setFromAcct, toAcct, setToAcct,
    amount, setAmount, status, handleTransfer,
  } = useBank();

  const selected = accounts.find(a => a.number === fromAcct) ?? accounts[0];

  useEffect(() => {
    setRequirements(`## Vault Online — Transfer
URL: \`/bank/transfer\`

### Functional Requirements
- A transfer must validate **sufficient funds** — the source balance can never go **negative**.
- **Debit and credit** amounts must be **identical**, rounded consistently to **2 decimals**.
- The **amount** must be **positive**, with at most **2 decimals**; an **empty** amount is invalid (not 0).
- **Self-transfers** must be rejected. A **daily transfer limit** must be enforced.
- The destination must match the format \`NNNN-NNNN-NNNN\` **and actually exist** — money must never vanish.
- The transfer button must be **disabled while in flight** (no double submission).
- The balance updates only **after confirmation**, never optimistically.
- The browser **Back button must not replay** a completed transfer.
- The confirmation message must show a **properly formatted currency amount**.

### Bug Hints (14 bugs on this page):
- 🐛 **Level 6:** Transfer more than the source balance. Overdraft allowed?
- 🐛 **Level 7 (Precision):** Transfer exactly \`10.005\`. Compare the debit and credit rows in History — same amount?
- 🐛 **Level 6 (Boundary):** Transfer a **negative** amount (e.g. \`-50\`). Which way does the money move?
- 🐛 **Level 5 (Boundary):** Leave the amount **empty** and submit. What gets processed?
- 🐛 **Level 5 (Boundary):** Enter \`10.12345\` — more than 2 decimals. Accepted?
- 🐛 **Level 5 (Logic):** Transfer from an account **to the same account**. Rejected?
- 🐛 **Level 6:** Make five large transfers in a row. Any daily limit?
- 🐛 **Level 8 (Race):** Double-click **Send Transfer** fast. Check History — one transfer or two?
- 🐛 **Level 7 (Logic):** Watch the balance the instant you click Send — does it wait for any confirmation?
- 🐛 **Level 8 (State):** Complete a transfer, navigate away, then press the browser **Back** button. Check the balance.
- 🐛 **Level 5 (Equivalence):** Enter \`banana\` or \`12345\` as the destination. Format validated?
- 🐛 **Level 8 (Data Integrity):** Transfer to account \`9999-9999-9999\` (doesn't exist). Where did the money go? Sum all balances before and after.
- 🐛 **Level 3 (Accessibility):** Click on the "Amount" label text. Does the input focus?
- 🐛 **Level 2 (Content):** Transfer \`10.005\` and read the green confirmation. Is the amount formatted like currency?`);

    setDbTables({
      Accounts: accounts.map(a => ({ account_number: a.number, owner: a.owner, balance: a.balance })),
      Transfer_Rules: [
        { rule: 'sufficient_funds', enforced: 'required' },
        { rule: 'positive_amount_max_2_decimals', enforced: 'required' },
        { rule: 'destination_format_NNNN-NNNN-NNNN', enforced: 'required' },
        { rule: 'destination_must_exist', enforced: 'required' },
        { rule: 'daily_limit', value: 5000, enforced: 'required' },
        { rule: 'no_self_transfer', enforced: 'required' },
      ],
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
            return { status: 200, body: { transferred: n, from, to, newBalance } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    setRemoteSolutions({ app: 'bank', bugIds: ['BNK-01', 'BNK-02', 'BNK-04', 'BNK-05', 'BNK-06', 'BNK-08', 'BNK-10', 'BNK-11', 'BNK-12', 'BNK-13', 'BNK-14', 'BNK-18', 'BNK-19', 'BNK-20'] });
     
  }, [accounts, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <BankChrome>
      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '520px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={20} /> Make a Transfer
        </h2>

        <div className="input-group">
          {/* BUG BNK-19: no htmlFor/id association (all fields on this form) */}
          <label className="input-label">From Account</label>
          <select className="input-field" value={fromAcct} onChange={(e) => setFromAcct(e.target.value)}>
            {accounts.map(a => (
              <option key={a.number} value={a.number}>
                {a.number} — {a.owner} (${a.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div style={{ margin: '1rem 0', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.08)' }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Current Balance</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            ${selected.balance.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{selected.owner}</div>
        </div>

        <div className="input-group">
          <label className="input-label">To Account</label>
          {/* BUG BNK-14/BNK-18: no format or existence validation on the destination */}
          <input className="input-field" placeholder="e.g. 1001-2002-9999" value={toAcct} onChange={(e) => setToAcct(e.target.value)} />
        </div>

        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Amount</label>
          {/* BUG BNK-06/08/12: accepts negatives, blanks, and >2 decimals */}
          <input className="input-field" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        {/* BUG BNK-04: button is never disabled while a transfer is in flight */}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }} onClick={handleTransfer}>
          <Send size={18} /> Send Transfer
        </button>

        {status && (
          <div style={{
            marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)',
            background: status.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: status.includes('Error') ? 'var(--danger)' : 'var(--success)', fontWeight: 500,
          }}>
            {status}
          </div>
        )}
      </div>
    </BankChrome>
  );
};
