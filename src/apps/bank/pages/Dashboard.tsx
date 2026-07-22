import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type APIEndpoint } from '../../../qa/QAContext';
import { useBank, INITIAL_ACCOUNTS } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { accounts, sessionStart } = useBank();

  // BUG BNK-15: "your total balance" sums EVERY account in the book, including
  // Bob's and Carol's — not just the logged-in user's.
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const [sessionMinutes, setSessionMinutes] = useState(0);
  useEffect(() => {
    const tick = () => setSessionMinutes(Math.floor((Date.now() - sessionStart) / 60000));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [sessionStart]);

  useEffect(() => {
    setRequirements(`## Vault Online — Dashboard
URL: \`/bank\`

### Functional Requirements
- Must list **only the logged-in user's accounts** (Alice Morgan). Other customers' accounts and balances must never be exposed.
- "Your total balance" must sum **only Alice's accounts**.
- Account numbers must be **masked** (show only the last group, e.g. \`****-****-3003\`).
- The **session must expire** after inactivity; the UI must show when it expires.
- Account cards must be **keyboard-accessible**.

### Bug Hints (5 bugs on this page):
- 🐛 **Level 8 (Data Exposure):** Whose accounts appear on this dashboard? Compare against \`Accounts\` in the DB viewer — who owns each one?
- 🐛 **Level 6 (Data Integrity):** Add up Alice's two balances by hand. Does "Your total balance" match, or is it much bigger?
- 🐛 **Level 6 (Security/PII):** Are the full account numbers displayed? Should they be?
- 🐛 **Level 7 (Session):** Look at the session banner. When does this session expire? Wait a while — does it ever?
- 🐛 **Level 3 (Accessibility):** Try reaching an account card with the Tab key.`);

    setDbTables({
      Accounts: accounts.map(a => ({ account_number: a.number, owner: a.owner, is_current_user: a.isCurrentUser, balance: a.balance })),
      Session: [{ user: 'Alice Morgan', started: new Date(sessionStart).toISOString(), expires: 'never (bug)' }],
    });

    const endpoints: APIEndpoint[] = [
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
            return { status: 200, body: { accountNumber: acct.number, owner: acct.owner, balance: acct.balance } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    setRemoteSolutions({ app: 'bank', bugIds: ['BNK-03', 'BNK-07', 'BNK-15', 'BNK-16', 'BNK-17'] });
     
  }, [accounts, sessionStart, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <BankChrome>
      {/* BUG BNK-07: session banner — never expires */}
      <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.08)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Session active for {sessionMinutes} min — expires: <strong>never</strong>
      </div>

      {/* BUG BNK-15: includes every account in the book */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Your total balance</div>
        <div style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
          ${totalBalance.toFixed(2)}
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Accounts</h2>
      <div className="grid-cards">
        {/* BUG BNK-03: renders all accounts, not just Alice's */}
        {accounts.map(a => (
          // BUG BNK-17: clickable div, not keyboard-accessible
          <div
            key={a.number}
            className="glass-panel"
            style={{ padding: '1.5rem', cursor: 'pointer' }}
            onClick={() => navigate('/bank/transfer')}
          >
            {/* BUG BNK-16: full unmasked account number */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.number}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>${a.balance.toFixed(2)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.owner}</div>
          </div>
        ))}
      </div>
    </BankChrome>
  );
};
