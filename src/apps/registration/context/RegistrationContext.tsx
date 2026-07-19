/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface FormErrors {
  [key: string]: string;
}

// Seed users used to detect duplicate emails (REG-14). The check is intentionally
// never performed against this list, so "existing@devportal.com" can re-register.
export const USERS_TABLE = [
  { id: 1, username: 'jdoe', email: 'existing@devportal.com', created: '2025-01-12' },
  { id: 2, username: 'asmith', email: 'alice@devportal.com', created: '2025-03-04' },
];

// Email regex used by validation and the validate-email endpoint (REG-03).
export const EMAIL_REGEX = /.+@.+/;

// Verification code "sent" to the user's email. Shown in the DB viewer so the
// tester can exercise the Verify Email page. Note the leading zero and the
// already-past expiry date — both feed intentional bugs (REG-31 / REG-32).
export const VERIFICATION_CODES = [
  { email: '(the email you registered)', code: '042519', expiresAt: '2026-07-01T00:00:00Z', status: 'EXPIRED' },
];

interface RegistrationState {
  // Step 1 — Personal
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  age: string; setAge: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  // Step 2 — Account
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  zip: string; setZip: (v: string) => void;
  // Step 3 — Review
  agreedTerms: boolean; setAgreedTerms: (v: boolean) => void;
  reviewEmail: string; setReviewEmail: (v: string) => void;
  // Progress / errors
  progressStep: number; setProgressStep: (v: number) => void;
  errors: FormErrors; setErrors: (v: FormErrors) => void;
  // Validation
  validateStep1: () => boolean;
  validateStep2: () => boolean;
  // Submission
  registrations: number;
  registerAccount: () => void;
}

const RegistrationContext = createContext<RegistrationState | undefined>(undefined);

export const RegistrationProvider = ({ children }: { children: ReactNode }) => {
  // BUG REG-19 (Stale State / Persistence): the entire wizard lives in React
  // state with no persistence — refreshing on any step silently wipes all
  // previously entered data.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [zip, setZip] = useState('');

  const [agreedTerms, setAgreedTerms] = useState(false);

  // BUG REG-07 (Stale State): email is snapshotted when advancing to Review. If
  // the user goes Back and edits the email, Review keeps showing the old value.
  const [reviewEmail, setReviewEmail] = useState('');

  // BUG REG-12 (Stale State): the progress indicator is tracked in its own state
  // and only bumped forward on Next. Going Back does NOT decrement it, so after
  // going back the indicator still highlights the higher step.
  const [progressStep, setProgressStep] = useState(1);

  const [errors, setErrors] = useState<FormErrors>({});

  // BUG REG-26 (Race Condition): each call "creates" an account with no guard,
  // so a double-click on Create Account registers twice.
  const [registrations, setRegistrations] = useState(0);
  const registerAccount = () => setRegistrations(c => c + 1);

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};

    // BUG REG-01 (Boundary Value): first name minimum is 2 chars, but the check
    // uses < 1 instead of < 2, so a single character passes.
    // BUG REG-11 (Missing Validation): no .trim(), so "  " (whitespace) passes.
    if (firstName.length < 1) {
      errs.firstName = 'First name is required.';
    }

    // BUG REG-02 (Boundary Value): last name maximum is 50 chars, but there is
    // NO maximum length check — any length is accepted.
    // BUG REG-11: whitespace-only also passes here.
    if (lastName.length < 1) {
      errs.lastName = 'Last name is required.';
    }

    // BUG REG-08 (Boundary Value): age must be >= 18, but only NaN is rejected,
    // so 0 and negative numbers are accepted.
    const ageNum = Number(age);
    if (age === '' || Number.isNaN(ageNum)) {
      errs.age = 'Age is required.';
    }

    // BUG REG-13 (Boundary Value): username max length is 20, but there is no
    // maximum check — more than 20 characters is accepted.
    if (username.length < 4) {
      errs.username = 'Username must be at least 4 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: FormErrors = {};

    // BUG REG-03 (Equivalence Partitioning): regex /.+@.+/ is too permissive —
    // it accepts "a@b", "@b.com", "x@", etc.
    if (!EMAIL_REGEX.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    // BUG REG-14 (Logic Bug): duplicate email is never checked against
    // USERS_TABLE, so "existing@devportal.com" registers again. The check is
    // intentionally absent.

    // BUG REG-04 (Regex Flaw): password requires min 8, 1 uppercase, 1 number,
    // but the uppercase check is missing — only length and a digit are checked.
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/[0-9]/.test(password)) {
      errs.password = 'Password must contain at least one number.';
      // Missing: !/[A-Z]/.test(password) check never runs.
    }

    // BUG REG-05 (Logic Bug): .trim() is applied only to confirmPassword, so
    // "secret1 " and "secret1" are treated as equal.
    if (password !== confirmPassword.trim()) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    // BUG REG-06 (Input Type): phone is type="text" and validation only checks
    // non-empty, not digits — "hello" is accepted.
    if (phone.trim() === '') {
      errs.phone = 'Phone number is required.';
    }

    // BUG REG-09 (Equivalence Partitioning): ZIP should be 5 digits, but only
    // non-empty is checked, so letters like "ABCDE" pass.
    if (zip.trim() === '') {
      errs.zip = 'ZIP / postal code is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return (
    <RegistrationContext.Provider value={{
      firstName, setFirstName, lastName, setLastName, age, setAge, username, setUsername,
      email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
      phone, setPhone, zip, setZip,
      agreedTerms, setAgreedTerms, reviewEmail, setReviewEmail,
      progressStep, setProgressStep, errors, setErrors,
      validateStep1, validateStep2,
      registrations, registerAccount,
    }}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
};
