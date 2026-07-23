import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Smartphone, CreditCard, Home, Wifi, WifiOff, QrCode, Repeat, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint } from '../qa/QAContext';

interface Txn {
  id: number;
  name: string;
  amount: number; // negative = money out, positive = money in
}

const INITIAL_TXNS: Txn[] = [
  { id: 1, name: 'Coffee House', amount: -4.5 },
  { id: 2, name: 'Salary', amount: 2000 },
  { id: 3, name: 'Grocery Mart', amount: -62.3 },
  { id: 4, name: 'Ride Share', amount: -18 },
];

const MobileInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();

  const [balance, setBalance] = useState(1234.5);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [txns, setTxns] = useState<Txn[]>(INITIAL_TXNS);

  // BUG MOB-12 (L5 Offline/PWA): this flag drives the "Offline" indicator but is
  // never updated from navigator.onLine, so it stays false forever regardless of
  // real connectivity. (Intended: subscribe to online/offline events.)
  const [offline] = useState(false);

  const sendMoney = () => {
    const amt = parseFloat(amount);

    // BUG MOB-11 (L3 Validation): an empty recipient still allows sending —
    // there is no check that recipient is non-empty. (Intended: require recipient.)
    void recipient;

    if (isNaN(amt)) {
      setStatus('Enter an amount.');
      return;
    }

    // BUG MOB-06 (L4 Boundary): the amount is not capped at the balance, so a
    // transfer larger than the balance overdraws to a negative balance.
    // (Intended: if (amt > balance) reject.)
    // BUG MOB-13 (L4 Boundary): a negative amount is accepted and, because we
    // subtract it, it INCREASES the balance instead of being rejected.
    // (Intended: if (amt <= 0) reject.)
    setBalance(prev => prev - amt);

    // BUG MOB-07 (L5 Logic / double-tap): there is no in-flight guard, so tapping
    // "Send" twice quickly runs the transfer twice. (Intended: disable while sending.)
    setTxns(prev => [
      ...prev,
      // BUG MOB-14 (L5 Logic): new transactions are appended to the END of the list
      // and the list is rendered top-to-bottom, so the newest shows at the BOTTOM
      // instead of the top. (Intended: prepend, or sort newest-first.)
      { id: Date.now(), name: recipient || 'Unknown', amount: -amt },
    ]);
    setStatus(`Sent ${amount} to ${recipient || 'Unknown'}.`);
  };

  // BUG MOB-09 (L5 Gesture): "swipe to delete" removes the WRONG (adjacent) item
  // because it deletes index + 1 instead of the swiped index (off-by-one).
  const swipeDelete = (index: number) => {
    setTxns(prev => prev.filter((_, i) => i !== index + 1));
  };

  useEffect(() => {
    setRequirements(`## MobiTap — Mobile Banking & Payments

A phone-first wallet: check your balance, send money, and review recent activity.

### Functional Requirements
- **Touch targets** must be at least **44×44px** — no control smaller than the accessible minimum.
- **No horizontal overflow** at a **390px** viewport — content must fit the phone screen.
- **Correct input types / keyboards**: the amount field uses a **decimal** keyboard (\`inputMode="decimal"\`) and the recipient field uses a **telephone** keyboard (\`type="tel"\`).
- **Every icon-only button** has an accessible name (\`aria-label\`).
- **Safe-area padding**: page content must not hide behind the fixed bottom tab bar.
- **Currency formatting**: balances and amounts render as formatted strings (e.g. **$1,234.50**), not raw floats.
- **Double-submit protection**: tapping Send twice quickly must not send twice.
- **Validation**: an empty recipient, a negative amount, or an amount greater than the balance must all be rejected.
- **Recent activity** shows the **newest transaction at the top**.
- The **Offline indicator** must reflect real connectivity (\`navigator.onLine\`).

### Levels
14 bugs, difficulty levels 3-5 (mobile UX, touch targets, viewport, input types, accessibility, gestures)`);

    setDbTables({
      Accounts: [
        { id: 1, owner: 'you@mobitap.app', balance: 1234.5, currency: 'USD' },
        { id: 2, owner: 'merchant@mobitap.app', balance: 88012.0, currency: 'USD' },
      ],
      Transactions: INITIAL_TXNS.map(t => ({ id: t.id, name: t.name, amount: t.amount })),
      Contacts: [
        { id: 1, name: 'Alex Rivera', phone: '+1-555-0100' },
        { id: 2, name: 'Sam Chen', phone: '+1-555-0142' },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/transfer',
        description: 'Sends money from your account. (Reflects MOB-06: no overdraft cap, and MOB-13: negative amount increases balance.)',
        payloadTemplate: '{\n  "recipient": "+1-555-0100",\n  "amount": 5000\n}',
        handler: (requestBody: string) => {
          try {
            const { recipient: r, amount: a } = JSON.parse(requestBody || '{}');
            const amt = Number(a);
            const start = 1234.5;
            // BUG MOB-06: no cap at balance. BUG MOB-13: negative amount increases balance.
            const newBalance = start - amt;
            return { status: 200, body: { ok: true, recipient: r, amount: amt, newBalance } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'GET',
        path: '/api/transactions',
        description: 'Returns recent activity. (Reflects MOB-14: newest is returned last instead of first, and MOB-10: raw float amounts.)',
        payloadTemplate: '',
        handler: () => {
          // BUG MOB-14: newest last. BUG MOB-10: raw float amounts, no formatting.
          return { status: 200, body: { transactions: INITIAL_TXNS } };
        },
      },
    ];
    setApiEndpoints(endpoints);

    setRemoteSolutions({ app: 'mobile', bugIds: ['MOB-01', 'MOB-02', 'MOB-03', 'MOB-04', 'MOB-05', 'MOB-06', 'MOB-07', 'MOB-08', 'MOB-09', 'MOB-10', 'MOB-11', 'MOB-12', 'MOB-13', 'MOB-14'] });
  }, [setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  const fmt = (n: number) => `$${n}`; // BUG MOB-10: raw float, not a formatted currency string.

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>MobiTap</h1>
        <p>Mobile banking & payments wallet. (Difficulty: Medium)</p>
      </div>

      {/* Simulated phone frame */}
      <div
        data-testid="phone-frame"
        style={{
          maxWidth: 390,
          margin: '0 auto',
          border: '10px solid #111',
          borderRadius: 36,
          overflow: 'hidden',
          background: 'var(--bg, #0b0b0f)',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* BUG MOB-08: content container has NO bottom padding for the fixed tab bar. */}
        <div style={{ padding: '1.25rem' }}>

          {/* Balance header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                <Smartphone size={14} style={{ verticalAlign: 'middle' }} /> Available balance
              </div>
              {/* BUG MOB-10: raw float via fmt(), e.g. $1234.5 instead of $1,234.50 */}
              <div data-testid="balance" style={{ fontSize: '2rem', fontWeight: 700 }}>{fmt(balance)}</div>
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
              {/* BUG MOB-12: offline flag never updates from navigator.onLine */}
              {offline ? <WifiOff size={14} /> : <Wifi size={14} />}
              {offline ? 'Offline' : 'Online'}
            </div>
          </div>

          {/* BUG MOB-02: promo banner is a fixed 520px wide, overflowing the 390px frame. */}
          <div style={{ width: 520, background: 'linear-gradient(90deg,#6d28d9,#2563eb)', color: '#fff', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.85rem' }}>
            Earn 2% cashback on payments this week!
          </div>

          {/* Send Money form */}
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Send Money</h2>

            <div className="input-group" style={{ marginBottom: '0.75rem' }}>
              <label className="input-label" htmlFor="recipient">Recipient phone</label>
              {/* BUG MOB-04: should be type="tel" for the dial-pad keyboard. */}
              <input id="recipient" type="text" className="input-field" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="+1-555-0100" />
            </div>

            <div className="input-group" style={{ marginBottom: '0.75rem' }}>
              <label className="input-label" htmlFor="amount">Amount</label>
              {/* BUG MOB-03: no inputMode="decimal", so mobile shows the wrong keyboard. */}
              <input id="amount" type="text" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>

            {/* BUG MOB-01: 28px tall — below the 44px accessible touch target.
                BUG MOB-07: no in-flight guard, so a double-tap sends twice. */}
            <button
              data-testid="send-btn"
              className="btn btn-primary"
              style={{ width: '100%', height: 28, minHeight: 0, padding: 0 }}
              onClick={sendMoney}
            >
              <Send size={14} /> Send
            </button>

            {status && <p style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{status}</p>}
          </div>

          {/* Quick actions row of icon buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem' }}>
            {/* BUG MOB-05: icon-only button with NO aria-label. */}
            <button className="btn btn-secondary" style={{ minHeight: 44, width: 44 }}>
              <QrCode size={18} />
            </button>
            <button className="btn btn-secondary" style={{ minHeight: 44, width: 44 }} aria-label="Repeat last payment">
              <Repeat size={18} />
            </button>
            <button className="btn btn-secondary" style={{ minHeight: 44, width: 44 }} aria-label="Add card">
              <Plus size={18} />
            </button>
          </div>

          {/* Transactions list */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '0.5rem' }}>Recent</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {/* BUG MOB-14: rendered in array order (oldest→newest), newest at the bottom. */}
              {txns.map((t, i) => (
                <div key={t.id} data-testid="txn-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.2rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.9rem' }}>{t.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* BUG MOB-10: raw float amounts. */}
                    <span style={{ color: t.amount < 0 ? 'var(--text-muted)' : 'var(--success)', fontSize: '0.9rem' }}>{fmt(t.amount)}</span>
                    {/* BUG MOB-09: swipeDelete removes index+1 (adjacent, wrong item). */}
                    <button aria-label="Swipe to delete" onClick={() => swipeDelete(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed bottom tab bar */}
        <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0', background: '#111', color: '#fff' }}>
          <button aria-label="Home" style={{ background: 'none', border: 'none', color: '#fff' }}><Home size={20} /></button>
          <button aria-label="Cards" style={{ background: 'none', border: 'none', color: '#fff' }}><CreditCard size={20} /></button>
          <button aria-label="Pay" style={{ background: 'none', border: 'none', color: '#fff' }}><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export const MobileApp = () => (
  <QALayout
    showDataTabs={false}
    dockerLab={{
      name: 'MobiTap Wallet API',
      port: 4011,
      bugCount: 12,
      composeUrl: `${import.meta.env.BASE_URL}labs/mobile-docker-compose.yml`,
    }}
  >
    <MobileInner />
  </QALayout>
);
