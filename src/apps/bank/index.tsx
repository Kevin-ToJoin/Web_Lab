import { Routes, Route } from 'react-router-dom';
import { QALayout } from '../../qa/QALayout';
import { BankProvider } from './context/BankContext';
import { Dashboard } from './pages/Dashboard';
import { Transfer } from './pages/Transfer';
import { History } from './pages/History';
import { Payees } from './pages/Payees';
import { Statement } from './pages/Statement';

export const BankApp = () => (
  <BankProvider>
    <QALayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="history" element={<History />} />
        <Route path="payees" element={<Payees />} />
        <Route path="statement" element={<Statement />} />
      </Routes>
    </QALayout>
  </BankProvider>
);
