import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../../../qa/QAContext';
import { useBank, INITIAL_ACCOUNTS } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'BNK-03', title: 'Any user can view other users\' accounts and balances',
        location: 'Dashboard.tsx — account list / /api/accounts/balance', technique: 'Data Exposure',
        buggyCode: 'accounts.map(a => <AccountCard ... />) // renders all four accounts',
        fixedCode: 'accounts.filter(a => a.isCurrentUser).map(a => <AccountCard ... />)',
        explanation: 'The dashboard renders every account in the book — including Bob\'s and Carol\'s, with balances. Filter to the current user, and enforce ownership server-side too.',
      },
      {
        bugId: 'BNK-07', title: 'Session never expires — stale tokens accepted forever',
        location: 'BankContext.tsx — sessionStart', technique: 'Session',
        buggyCode: 'const [sessionStart] = useState(() => Date.now());\n// nothing ever checks or expires it',
        fixedCode: 'if (Date.now() - sessionStart > SESSION_TTL) { logout(); return; }',
        explanation: 'The session banner honestly reports "expires: never." There is no inactivity timeout, so a stolen or stale token keeps working indefinitely.',
      },
      {
        bugId: 'BNK-15', title: '"Your total balance" sums other customers\' accounts',
        location: 'Dashboard.tsx — totalBalance', technique: 'Data Integrity',
        buggyCode: 'const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);',
        fixedCode: 'const totalBalance = accounts.filter(a => a.isCurrentUser).reduce((s, a) => s + a.balance, 0);',
        explanation: 'Alice\'s balances are $1,500.00 + $320.50 = $1,820.50, but the headline number includes Bob\'s $8,750.25 and Carol\'s $42.00 too.',
      },
      {
        bugId: 'BNK-16', title: 'Full account numbers are displayed unmasked',
        location: 'Dashboard.tsx — account cards', technique: 'Security / PII',
        buggyCode: '<div>{a.number}</div> // "1001-2002-3003" in full',
        fixedCode: '<div>{`****-****-${a.number.slice(-4)}`}</div>',
        explanation: 'Banking UIs mask account numbers to limit shoulder-surfing and screenshot leakage. These render in full everywhere.',
      },
      {
        bugId: 'BNK-17', title: 'Account cards are not keyboard-accessible',
        location: 'Dashboard.tsx — account cards', technique: 'Accessibility',
        buggyCode: '<div className="glass-panel" onClick={() => navigate("/bank/transfer")}>...</div>',
        fixedCode: '<button className="glass-panel" onClick={() => navigate("/bank/transfer")}>...</button>',
        explanation: 'A clickable <div> with no tabIndex/role cannot be reached or activated with the keyboard.',
      },
    ];
    setSolutions(solutions);
     
  }, [accounts, sessionStart, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
