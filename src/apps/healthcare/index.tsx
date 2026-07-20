import { Routes, Route } from 'react-router-dom';
import { QALayout } from '../../qa/QALayout';
import { HealthProvider } from './context/HealthContext';
import { Records } from './pages/Records';
import { Copay } from './pages/Copay';
import { Appointments } from './pages/Appointments';
import { Vitals } from './pages/Vitals';

export const HealthcareApp = () => (
  <HealthProvider>
    <QALayout>
      <Routes>
        <Route path="/" element={<Records />} />
        <Route path="copay" element={<Copay />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="vitals" element={<Vitals />} />
      </Routes>
    </QALayout>
  </HealthProvider>
);
