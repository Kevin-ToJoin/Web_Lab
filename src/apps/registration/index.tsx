import { Routes, Route } from 'react-router-dom';
import { QALayout } from '../../qa/QALayout';
import { RegistrationProvider } from './context/RegistrationContext';
import { StepPersonal } from './pages/StepPersonal';
import { StepAccount } from './pages/StepAccount';
import { StepReview } from './pages/StepReview';
import { Success } from './pages/Success';
import { VerifyEmail } from './pages/VerifyEmail';

// BUG REG-23 / REG-25: none of the step routes are guarded — /registration/account
// and /registration/review are freely reachable by URL with an empty wizard.
export const RegistrationApp = () => (
  <RegistrationProvider>
    <QALayout>
      <Routes>
        <Route path="/" element={<StepPersonal />} />
        <Route path="account" element={<StepAccount />} />
        <Route path="review" element={<StepReview />} />
        <Route path="success" element={<Success />} />
        <Route path="verify" element={<VerifyEmail />} />
      </Routes>
    </QALayout>
  </RegistrationProvider>
);
