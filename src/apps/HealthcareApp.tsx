import React, { useState } from 'react';
import { ArrowLeft, Calendar, FileText, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HealthcareApp = () => {
  const navigate = useNavigate();
  
  const [age, setAge] = useState('');
  const [hasCondition, setHasCondition] = useState(false);
  const [copay, setCopay] = useState<number | null>(null);

  const [date, setDate] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  const calculateCopay = () => {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) return;

    // BUG LEVEL 8: Decision Table flaw
    // Rules:
    // 1. Age < 18: $0
    // 2. Age >= 65 AND Pre-existing: $20
    // 3. Age >= 65 AND NO Pre-existing: $30
    // 4. Default: $50
    
    // The Bug: The logic order is flawed, or the condition check is wrong.
    // If age >= 65 and hasCondition is true, it mistakenly falls into the default or a wrong branch because of a typo in the logical operator.
    
    if (ageNum < 18) {
      setCopay(0);
    } else if (ageNum >= 65 || hasCondition) { 
      // BUG: Used || instead of &&. So anyone with a condition gets $30, even if they are 20! 
      // And a 65 year old with a condition gets $30 instead of $20!
      setCopay(30);
    } else if (ageNum >= 65 && hasCondition) {
      // Unreachable code due to previous bug
      setCopay(20);
    } else {
      setCopay(50);
    }
  };

  const handleBooking = () => {
    // BUG LEVEL 9: Date Validation (Allows weekends and past dates)
    const selectedDate = new Date(date);
    
    if (!date) {
      setBookingStatus('Please select a date.');
      return;
    }

    // BUG LEVEL 9: Leap year bug. 
    // We simulate a badly written custom date parser that crashes on Feb 29th of any year, even leap years.
    if (date.endsWith('-02-29')) {
      throw new Error("System Exception: Invalid Date Format in Legacy Module.");
    }

    // The intended checks that are MISSING (Level 9 bug):
    // const today = new Date();
    // if (selectedDate < today) { error }
    // if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) { error }

    setBookingStatus(`Appointment successfully booked for ${selectedDate.toLocaleDateString()}. (Simulated)`);
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>MediPortal Connect</h1>
        <p>Patient services and insurance calculator. (Difficulty: Expert)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Copay Calculator */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> Insurance Copay Estimator
          </h2>
          
          <div className="input-group">
            <label className="input-label">Patient Age</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 68"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <input 
              type="checkbox" 
              id="condition"
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              checked={hasCondition}
              onChange={(e) => setHasCondition(e.target.checked)}
            />
            <label htmlFor="condition" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
              Has Pre-existing Medical Condition
            </label>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem', backgroundColor: 'var(--secondary)' }}
            onClick={calculateCopay}
          >
            <Activity size={18} /> Calculate Copay
          </button>

          {copay !== null && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Estimated Copay</div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--secondary)' }}>${copay}</div>
            </div>
          )}
        </div>

        {/* Appointment Booking */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} /> Schedule Appointment
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Our clinics are open Monday-Friday. Same-day appointments are not guaranteed.
          </p>

          <div className="input-group">
            <label className="input-label">Select Date</label>
            <input 
              type="date" 
              className="input-field" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={handleBooking}
          >
            Confirm Booking
          </button>

          {bookingStatus && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)', 
              background: bookingStatus.includes('Please') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: bookingStatus.includes('Please') ? 'var(--danger)' : 'var(--success)',
              textAlign: 'center',
              fontWeight: 500
            }}>
              {bookingStatus}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
