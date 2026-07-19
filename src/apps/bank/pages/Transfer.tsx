import { useEffect } from 'react';
import { Send } from 'lucide-react';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../../../qa/QAContext';
import { useBank, INITIAL_ACCOUNTS } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const Transfer = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'BNK-01', title: 'Transfer allows the source account to go negative (overdraft)',
        location: 'BankContext.tsx — applyTransfer()/handleTransfer()', technique: 'Missing Validation',
        buggyCode: 'return { ...a, balance: a.balance - amt };',
        fixedCode: 'if (amt > src.balance) { setStatus("Error: Insufficient funds."); return; }',
        explanation: 'No insufficient-funds check lets a transfer overdraw the source. Validate amt <= balance before applying.',
      },
      {
        bugId: 'BNK-02', title: 'Rounding error makes the debit and credit amounts differ',
        location: 'BankContext.tsx — applyTransfer()', technique: 'Precision',
        buggyCode: 'balance: a.balance - amt   // debit raw\nbalance: a.balance + Math.round(amt*100)/100  // credit rounded',
        fixedCode: 'const cents = Math.round(amt * 100) / 100;\n// debit and credit both use cents',
        explanation: 'Debit uses the raw amount while credit is rounded, so the two sides diverge. Round both consistently.',
      },
      {
        bugId: 'BNK-04', title: 'Rapid clicks submit the same transfer twice (button not disabled)',
        location: 'Transfer.tsx — transfer button', technique: 'Race Condition',
        buggyCode: '<button onClick={handleTransfer}>Transfer</button>',
        fixedCode: 'const [submitting, setSubmitting] = useState(false);\n<button disabled={submitting} onClick={...}>',
        explanation: 'The button stays enabled during submission, so a double click sends two transfers. Disable while in flight.',
      },
      {
        bugId: 'BNK-05', title: 'Transfer to the same account is allowed',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Logic Bug',
        buggyCode: '// no fromAcct !== toAcct check',
        fixedCode: 'if (fromAcct === toAcct) { setStatus("Error: Cannot transfer to the same account."); return; }',
        explanation: 'Source and destination can be identical, which is a no-op (or worse with rounding). Reject self-transfers.',
      },
      {
        bugId: 'BNK-06', title: 'Negative transfer amount reverses the direction of funds',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Boundary Value',
        buggyCode: 'const amt = parseFloat(amount) || 0;  // accepts negatives',
        fixedCode: 'if (amt <= 0) { setStatus("Error: Amount must be positive."); return; }',
        explanation: 'A negative amount subtracts a negative (crediting the source and debiting the target). Require amt > 0.',
      },
      {
        bugId: 'BNK-08', title: 'Empty amount field is processed as a zero transfer',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Boundary Value',
        buggyCode: 'const amt = parseFloat(amount) || 0;',
        fixedCode: 'if (amount.trim() === "" || isNaN(parseFloat(amount))) { setStatus("Error: Enter an amount."); return; }',
        explanation: 'An empty field falls back to 0 and is submitted. Reject blank/NaN amounts before processing.',
      },
      {
        bugId: 'BNK-10', title: 'Balance updates optimistically before the transfer is confirmed',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Logic Bug',
        buggyCode: 'applyTransfer(fromAcct, toAcct, amt);  // before confirmation',
        fixedCode: 'const ok = await confirmTransfer(...);\nif (ok) applyTransfer(...);',
        explanation: 'Balances mutate immediately, before the backend confirms. Only apply changes once the transfer is confirmed.',
      },
      {
        bugId: 'BNK-11', title: 'No daily transfer limit is enforced',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Missing Validation',
        buggyCode: '// no daily total check',
        fixedCode: 'if (todayTotal + amt > DAILY_LIMIT) { setStatus("Error: Daily limit exceeded."); return; }',
        explanation: 'Transfers of any size and frequency are accepted. Track the daily total and enforce a cap (see Transfer_Rules: $5,000/day).',
      },
      {
        bugId: 'BNK-12', title: 'Amount field accepts more than two decimal places',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Precision',
        buggyCode: 'const amt = parseFloat(amount) || 0;  // 10.12345 allowed',
        fixedCode: 'if (!/^\\d+(\\.\\d{1,2})?$/.test(amount)) { setStatus("Error: Max 2 decimals."); return; }',
        explanation: 'Amounts like 10.12345 are accepted. Validate to at most two decimal places (whole cents).',
      },
      {
        bugId: 'BNK-13', title: 'Browser back button replays the last transfer',
        location: 'BankContext.tsx — popstate effect / lastTransfer', technique: 'Stale State',
        buggyCode: 'window.addEventListener("popstate", () => applyTransfer(lastTransfer...))',
        fixedCode: 'Do not cache/replay transfers on navigation; rely on idempotent server-side request tokens.',
        explanation: 'Navigating back re-applies the cached transfer, duplicating it. Never replay completed transactions client-side.',
      },
      {
        bugId: 'BNK-14', title: 'Account number format is not validated',
        location: 'BankContext.tsx — handleTransfer()', technique: 'Equivalence Partitioning',
        buggyCode: 'if (!toAcct) { ... }  // no format check',
        fixedCode: 'if (!/^\\d{4}-\\d{4}-\\d{4}$/.test(toAcct)) { setStatus("Error: Invalid account number."); return; }',
        explanation: 'Any string is accepted as a destination. Enforce the NNNN-NNNN-NNNN account-number pattern.',
      },
      {
        bugId: 'BNK-18', title: 'Transfer to a nonexistent account silently destroys funds',
        location: 'BankContext.tsx — applyTransfer()', technique: 'Data Integrity',
        buggyCode: 'if (a.number === to) { /* credit */ }\n// if no account matches `to`, the debit still ran but the credit lands nowhere',
        fixedCode: 'const dest = accounts.find(a => a.number === toAcct);\nif (!dest) { setStatus("Error: Destination account not found."); return; }',
        explanation: 'The debit is applied unconditionally; the credit only lands if a matching account exists. Transfer to 9999-9999-9999 and the money simply vanishes from the system — total balances no longer sum.',
      },
      {
        bugId: 'BNK-19', title: 'Form labels are not associated with their inputs',
        location: 'Transfer.tsx — form fields', technique: 'Accessibility',
        buggyCode: '<label className="input-label">Amount</label>\n<input className="input-field" ... />',
        fixedCode: '<label className="input-label" htmlFor="amount">Amount</label>\n<input id="amount" className="input-field" ... />',
        explanation: 'No htmlFor/id pairs — clicking a label doesn\'t focus its field and screen readers can\'t announce the field name.',
      },
      {
        bugId: 'BNK-20', title: 'Confirmation message shows an unformatted amount',
        location: 'BankContext.tsx — handleTransfer() status', technique: 'Content Bug',
        buggyCode: 'setStatus(`Transfer of $${amt} submitted.`); // "$10.005", "$1e3"…',
        fixedCode: 'setStatus(`Transfer of $${amt.toFixed(2)} submitted.`);',
        explanation: 'The raw parsed number is interpolated directly, so "10.005" or exponent notation appears verbatim instead of a currency-formatted value.',
      },
    ];
    setSolutions(solutions);
     
  }, [accounts, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
