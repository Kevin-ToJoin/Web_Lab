import { useState } from 'react';
import { ArrowLeft, Landmark, Send, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simulated DB of accounts
const initialAccounts = {
  'ACC-1001': { owner: 'Alice Smith', balance: 5000.00 },
  'ACC-1002': { owner: 'Bob Jones', balance: 150.00 },
  'ACC-1003': { owner: 'Charlie Brown', balance: 12000.50 }
};

export const BankApp = () => {
  const navigate = useNavigate();
  
  // BUG LEVEL 7: Session Simulation
  // We allow changing the "logged in" user simply by changing this dropdown, exposing other users' balances.
  const [currentAccount, setCurrentAccount] = useState('ACC-1001');
  
  const [accounts, setAccounts] = useState(initialAccounts);
  const [targetAccount, setTargetAccount] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [transactions, setTransactions] = useState<{id: number, type: string, amount: number, date: string}[]>([]);
  const [message, setMessage] = useState('');

  const handleTransfer = async () => {
    setMessage('');
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      setMessage('Invalid amount.');
      return;
    }

    if (!accounts[targetAccount as keyof typeof accounts]) {
      setMessage('Target account not found.');
      return;
    }

    // BUG LEVEL 8: Form resubmission (No loading state, no button disable, async delay allows double clicking)
    // We add an artificial delay to simulate network latency, during which the user can click again.
    
    // BUG LEVEL 6: State Transition - No check if amount > current balance!
    // It will gladly let balance go negative.
    
    // BUG LEVEL 7: Rounding Errors.
    // If user enters 10.005, we deduct 10.01 but deposit 10.00 to target.
    let deduction = amount;
    let deposit = amount;
    
    if (amountStr.includes('.') && amountStr.split('.')[1].length > 2) {
      deduction = parseFloat(amount.toFixed(2)); // Rounds up (10.01)
      deposit = Math.floor(amount * 100) / 100; // Truncates down (10.00)
    }

    // Simulate network delay to expose Race Condition (Level 8)
    await new Promise(r => setTimeout(r, 800));

    setAccounts(prev => ({
      ...prev,
      [currentAccount]: {
        ...prev[currentAccount as keyof typeof prev],
        balance: prev[currentAccount as keyof typeof prev].balance - deduction
      },
      [targetAccount]: {
        ...prev[targetAccount as keyof typeof prev],
        balance: prev[targetAccount as keyof typeof prev].balance + deposit
      }
    }));

    setTransactions(prev => [{
      id: Date.now(),
      type: `Transfer to ${targetAccount}`,
      amount: deduction,
      date: new Date().toLocaleTimeString()
    }, ...prev]);

    setMessage('Transfer successful.');
    setAmountStr('');
    setTargetAccount('');
  };

  const accountData = accounts[currentAccount as keyof typeof accounts];

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#eab308' }}>Global Trust Bank</h1>
          <p>Secure core banking portal. (Difficulty: Hard)</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Simulate Session:</span>
          <select 
            className="input-field" 
            style={{ padding: '0.25rem 0.5rem' }}
            value={currentAccount}
            onChange={(e) => setCurrentAccount(e.target.value)}
          >
            {Object.keys(accounts).map(acc => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)', borderTop: '4px solid #eab308' }}>
            <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Available Balance</h2>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: accountData.balance < 0 ? 'var(--danger)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Landmark size={32} color="#eab308" />
              ${accountData.balance.toFixed(2)}
            </div>
            <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Account Holder: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{accountData.owner}</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Account Number: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{currentAccount}</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <History size={20} /> Recent Transactions
            </h2>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent activity.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {transactions.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{t.type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.date}</div>
                    </div>
                    <div style={{ color: 'var(--danger)', fontWeight: 600 }}>-${t.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transfer Portal */}
        <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Quick Transfer</h2>
          
          <div className="input-group">
            <label className="input-label">Destination Account Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. ACC-1002"
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Amount (USD)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Transfers are processed immediately.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', backgroundColor: '#eab308', color: '#000', boxShadow: '0 4px 14px 0 rgba(234, 179, 8, 0.4)' }}
            onClick={handleTransfer}
            // Notice: We DO NOT disable this button while loading! (Level 8 Bug)
          >
            <Send size={18} /> Authorize Transfer
          </button>

          {message && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)', 
              background: message.includes('Error') || message.includes('Invalid') || message.includes('not found') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: message.includes('Error') || message.includes('Invalid') || message.includes('not found') ? 'var(--danger)' : 'var(--success)',
              textAlign: 'center',
              fontWeight: 500
            }}>
              {message}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
