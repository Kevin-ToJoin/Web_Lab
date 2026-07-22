import { useEffect, useState } from 'react';
import { Users, Trash2 } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useBank } from '../context/BankContext';
import { BankChrome } from './BankChrome';

export const Payees = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { payees, addPayee, removePayee } = useBank();

  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    setRequirements(`## Vault Online — Saved Payees
URL: \`/bank/payees\`

### Functional Requirements
- A payee's **name** must be non-empty (whitespace-only rejected).
- The same **account number** cannot be saved twice (no duplicates).
- **Deleting** a payee is destructive — it must ask for **confirmation**.
- Saved payees must **survive a page refresh**.

### Bug Hints (4 bugs on this page):
- 🐛 **Level 4:** Add the account \`4004-5005-6006\` again (it's already saved as "Bob Carter"). Duplicate allowed?
- 🐛 **Level 4 (Boundary):** Add a payee whose name is just spaces ("   "). Accepted?
- 🐛 **Level 3 (UX):** Click the trash icon on a payee. Any "are you sure?" step, or is it gone instantly?
- 🐛 **Level 5 (State):** Add a payee, then **refresh the page**. Still there?`);

    setDbTables({
      Payees: payees.map(p => ({ id: p.id, name: p.name, account_number: p.accountNumber })),
    });
    setApiEndpoints([]);

    setRemoteSolutions({ app: 'bank', bugIds: ['BNK-24', 'BNK-25', 'BNK-26', 'BNK-27'] });
  }, [payees, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  const handleAdd = () => {
    // BUG BNK-24 / BNK-25: no duplicate or whitespace validation before saving.
    if (accountNumber === '') return;
    addPayee(name, accountNumber);
    setName('');
    setAccountNumber('');
  };

  return (
    <BankChrome>
      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '560px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} /> Saved Payees
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {payees.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)',
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{p.accountNumber}</div>
              </div>
              {/* BUG BNK-26: instant delete, no confirmation */}
              <button className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '0.5rem' }}
                aria-label={`Remove ${p.name}`} onClick={() => removePayee(p.id)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {payees.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No payees saved.</p>}
        </div>

        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add a payee</h3>
        <div className="input-group">
          <label className="input-label">Name</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Carol Diaz" />
        </div>
        <div className="input-group" style={{ marginTop: '0.75rem' }}>
          <label className="input-label">Account Number</label>
          <input className="input-field" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="NNNN-NNNN-NNNN" />
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAdd}>Add Payee</button>
      </div>
    </BankChrome>
  );
};
