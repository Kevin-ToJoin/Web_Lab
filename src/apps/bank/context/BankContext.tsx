/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface Account {
  number: string;
  owner: string;
  isCurrentUser: boolean;
  balance: number;
}

export interface Transaction {
  id: number;
  account: string;
  type: 'debit' | 'credit';
  amount: number;
  desc: string;
  date: string;
}

export interface Payee {
  id: number;
  name: string;
  accountNumber: string;
}

export const CURRENT_USER = 'Alice Morgan';

export const INITIAL_ACCOUNTS: Account[] = [
  { number: '1001-2002-3003', owner: 'Alice Morgan', isCurrentUser: true, balance: 1500.0 },
  { number: '1001-2002-9999', owner: 'Alice Morgan', isCurrentUser: true, balance: 320.5 },
  { number: '4004-5005-6006', owner: 'Bob Carter', isCurrentUser: false, balance: 8750.25 },
  { number: '7007-8008-9009', owner: 'Carol Diaz', isCurrentUser: false, balance: 42.0 },
];

export const INITIAL_TX: Transaction[] = [
  { id: 1, account: '1001-2002-3003', type: 'credit', amount: 2000.0, desc: 'Payroll deposit', date: '2026-07-01T09:00:00Z' },
  { id: 2, account: '1001-2002-3003', type: 'debit', amount: 500.0, desc: 'Rent payment', date: '2026-07-03T15:30:00Z' },
  { id: 3, account: '1001-2002-9999', type: 'credit', amount: 320.5, desc: 'Transfer in', date: '2026-07-05T11:12:00Z' },
  // BUG BNK-09: a transaction belonging to another user's account is in the shared log.
  { id: 4, account: '4004-5005-6006', type: 'debit', amount: 1200.0, desc: "Bob's car payment", date: '2026-07-06T18:45:00Z' },
];

// BUG BNK-28: the statement's opening balance is hardcoded and never updated,
// so the computed closing balance no longer reconciles with the live account.
export const STATEMENT_OPENING_BALANCE = 1000.0;

interface BankState {
  accounts: Account[];
  transactions: Transaction[];
  fromAcct: string; setFromAcct: (v: string) => void;
  toAcct: string; setToAcct: (v: string) => void;
  amount: string; setAmount: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  handleTransfer: () => void;
  payees: Payee[];
  addPayee: (name: string, accountNumber: string) => void;
  removePayee: (id: number) => void;
  sessionStart: number;
}

const BankContext = createContext<BankState | undefined>(undefined);

export const BankProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TX);
  const [fromAcct, setFromAcct] = useState(INITIAL_ACCOUNTS[0].number);
  const [toAcct, setToAcct] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  // BUG BNK-13: the last transfer is remembered and replayed on browser back.
  const [lastTransfer, setLastTransfer] = useState<{ from: string; to: string; amount: number } | null>(null);

  // BUG BNK-07: session start is tracked but nothing ever expires it.
  const [sessionStart] = useState(() => Date.now());

  // BUG BNK-27: payees live only in component state — refresh loses them.
  const [payees, setPayees] = useState<Payee[]>([
    { id: 1, name: 'Bob Carter', accountNumber: '4004-5005-6006' },
  ]);

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
      // BUG BNK-18: if `to` matches no account, the debit above still happens
      // but the credit never lands anywhere — the funds simply vanish.
      return a;
    }));
    setTransactions(prev => [
      ...prev, // BUG BNK-22: appended at the end — history renders oldest-first.
      { id: Date.now(), account: from, type: 'debit', amount: amt, desc: `Transfer to ${to}`, date: new Date().toISOString() },
      { id: Date.now() + 1, account: to, type: 'credit', amount: Math.round(amt * 100) / 100, desc: `Transfer from ${from}`, date: new Date().toISOString() },
    ]);
  };

  const handleTransfer = () => {
    // BUG BNK-08: empty amount is parsed as 0 and processed instead of rejected.
    // BUG BNK-12: parseFloat keeps >2 decimal places (no cents validation).
    const amt = parseFloat(amount) || 0;

    // BUG BNK-14: destination account number format is never validated.
    // BUG BNK-18: existence of the destination account is never validated either.
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
    // BUG BNK-20: raw `amt` is interpolated unformatted (e.g. "$10.005").
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
     
  }, [lastTransfer]);

  const addPayee = (name: string, accountNumber: string) => {
    // BUG BNK-24: no duplicate check — the same account number can be saved twice.
    // BUG BNK-25: whitespace-only names are accepted (no trim/empty validation).
    setPayees(prev => [...prev, { id: Date.now(), name, accountNumber }]);
  };

  // BUG BNK-26: destructive action with no confirmation step.
  const removePayee = (id: number) => {
    setPayees(prev => prev.filter(p => p.id !== id));
  };

  return (
    <BankContext.Provider value={{
      accounts, transactions,
      fromAcct, setFromAcct, toAcct, setToAcct, amount, setAmount,
      status, setStatus, handleTransfer,
      payees, addPayee, removePayee,
      sessionStart,
    }}>
      {children}
    </BankContext.Provider>
  );
};

export const useBank = () => {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error('useBank must be used within BankProvider');
  return ctx;
};
