/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Patient {
  id: number;
  name: string;
  dob: string;
  /** Correct age as of today — the Records UI intentionally recomputes it wrong (HLT-05). */
  age: number;
  insurance: string;
  allergies: string;
}

export interface BookedSlot {
  date: string;
  time: string;
}

export const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
export const MAX_DOSAGE_MG = 1000;

// Stored ages are correct as of 2026. Riley's birthday (Nov 30) hasn't happened
// yet this year — the naive year-subtraction in the Records page (HLT-05) will
// show 41 instead of 40.
export const PATIENTS: Patient[] = [
  { id: 1, name: 'Jordan Lee', dob: '1961-06-14', age: 65, insurance: 'medicare', allergies: 'penicillin' },
  { id: 2, name: 'Sam Rivera', dob: '2010-02-29', age: 16, insurance: 'pediatric', allergies: 'none' },
  { id: 3, name: 'Alex Kim', dob: '1990-03-04', age: 36, insurance: 'private', allergies: '' },
  { id: 4, name: 'Riley Chen', dob: '1985-11-30', age: 40, insurance: 'private', allergies: 'sulfa drugs' },
];

// Seeded appointments — note ids 901/902 already share the same date+time slot,
// evidence that double-booking (HLT-07) has been happening in production.
export const SEED_APPOINTMENTS = [
  { id: 901, patientId: 1, date: '2026-06-20', time: '09:00', status: 'confirmed' },
  { id: 902, patientId: 3, date: '2026-06-20', time: '09:00', status: 'confirmed' },
];

interface HealthState {
  bookings: BookedSlot[];
  bookingStatus: string;
  setBookingStatus: (s: string) => void;
  bookSlot: (date: string, time: string) => void;
}

const HealthContext = createContext<HealthState | undefined>(undefined);

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const HealthProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<BookedSlot[]>([]);
  const [bookingStatus, setBookingStatus] = useState('');

  const bookSlot = (date: string, time: string) => {
    const [yStr, mStr, dStr] = date.split('-');
    const year = parseInt(yStr, 10);

    // BUG HLT-03 (Edge Case): a legacy guard crashes on Feb 29 even in a valid
    // leap year (it should only reject Feb 29 in non-leap years).
    if (mStr === '02' && dStr === '29' && isLeapYear(year)) {
      throw new Error('System Exception: Invalid Date in Legacy Scheduling Module.');
    }

    // BUG HLT-11 (Timezone): parsing "YYYY-MM-DD" via new Date() yields midnight
    // UTC, then toLocaleDateString() in a negative-offset zone shows the prior day.
    const parsed = new Date(date);

    // BUG HLT-09 (Edge Case): the confirmation reformats using the ambiguous
    // M/D/YYYY layout so 03/04 (DD/MM) is read back as April 3 (MM/DD).
    const ambiguous = `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;

    // BUG HLT-02 (Date Validation): no check that the date is today or later,
    // so past dates are accepted.
    // BUG HLT-16 (Business Rule): clinics are Mon-Fri, but weekend dates are
    // never rejected either.
    // BUG HLT-07 (Logic): no double-booking guard — the same date+time can be
    // booked repeatedly.
    setBookings(prev => [...prev, { date, time }]);
    // BUG HLT-17: there is intentionally no cancelBooking — once booked, a slot
    // can never be released from the UI.
    setBookingStatus(`Appointment booked for ${ambiguous} at ${time} (${parsed.toLocaleDateString()}).`);
  };

  return (
    <HealthContext.Provider value={{ bookings, bookingStatus, setBookingStatus, bookSlot }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within HealthProvider');
  return ctx;
};
