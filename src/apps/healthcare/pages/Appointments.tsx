import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useHealth, TIME_SLOTS, SEED_APPOINTMENTS } from '../context/HealthContext';
import { HealthChrome } from './HealthChrome';

export const Appointments = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { bookings, bookingStatus, setBookingStatus, bookSlot } = useHealth();

  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);

  const handleBooking = () => {
    if (!date) {
      setBookingStatus('Error: Please select a date.');
      return;
    }
    bookSlot(date, timeSlot);
  };

  useEffect(() => {
    setRequirements(`## MediPortal — Schedule Appointment
URL: \`/healthcare/appointments\`

### Functional Requirements
- Appointment dates must be **today or in the future**; past dates are rejected.
- Clinics are open **Monday–Friday only** — weekend dates must be rejected.
- **Feb 29** is a valid date in a **leap year** and must not error.
- A time slot can only be booked **once** per date — no double-booking.
- Dates must display **unambiguously** and must **not drift across timezones**.
- A booked appointment must be **cancellable**.

### Bug Hints (7 bugs on this page):
- 🐛 **Level 9 (Date):** Book a date in the **past** (e.g. last month). Accepted?
- 🐛 **Level 4 (Business Rule):** Book a **Saturday or Sunday**. The clinic is closed — does the system care?
- 🐛 **Level 9 (Edge Case):** Book **Feb 29, 2028** (a valid leap-year date). What happens to the whole app?
- 🐛 **Level 9 (Logic):** Book the same date + time slot **twice**. Rejected the second time? Also peek at the seeded \`Appointments\` table — ids 901/902.
- 🐛 **Level 9 (Edge Case):** Book March 4th. Read the confirmation — could "3/4/2026" be misread as April 3rd?
- 🐛 **Level 9 (Timezone):** Compare the two dates in the confirmation message. In a negative-UTC-offset timezone, do they match?
- 🐛 **Level 3 (Missing):** You booked a slot by mistake. Find the cancel button.`);

    setDbTables({
      Appointments: SEED_APPOINTMENTS,
      Your_Bookings: bookings.length === 0 ? [{ note: 'No bookings this session yet.' }] : bookings,
      Clinic_Hours: [{ days: 'Monday-Friday', open: '09:00', close: '16:00' }],
    });

    setApiEndpoints([
      {
        method: 'POST',
        path: '/api/appointments',
        description: 'Books an appointment. (Reflects HLT-02: accepts past dates, HLT-16: accepts weekends, HLT-07: allows double-booking.)',
        payloadTemplate: '{\n  "date": "2020-01-01",\n  "time": "09:00"\n}',
        handler: (requestBody: string) => {
          try {
            const { date: d, time } = JSON.parse(requestBody || '{}');
            // BUG HLT-02/HLT-16/HLT-07: no past-date, weekday, or conflict checks.
            return { status: 200, body: { booked: true, date: d, time } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ]);

    setRemoteSolutions({ app: 'healthcare', bugIds: ['HLT-02', 'HLT-03', 'HLT-07', 'HLT-09', 'HLT-11', 'HLT-16', 'HLT-17'] });
  }, [bookings, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <HealthChrome>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '520px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} /> Schedule Appointment
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Clinics are open Monday-Friday. Future dates only.
        </p>

        <div className="input-group">
          <label className="input-label">Select Date</label>
          <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Time Slot</label>
          <select className="input-field" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={handleBooking}>
          Confirm Booking
        </button>

        {bookings.length > 0 && (
          <div style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <strong>Booked slots:</strong>
            {/* BUG HLT-17: read-only list — no cancel action */}
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              {bookings.map((b, i) => <li key={i}>{b.date} @ {b.time}</li>)}
            </ul>
          </div>
        )}

        {bookingStatus && (
          <div style={{
            marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)',
            background: bookingStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: bookingStatus.includes('Error') ? 'var(--danger)' : 'var(--success)',
            textAlign: 'center', fontWeight: 500,
          }}>
            {bookingStatus}
          </div>
        )}
      </div>
    </HealthChrome>
  );
};
