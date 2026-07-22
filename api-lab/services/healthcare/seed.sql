-- Patient Portal (Healthcare module) — seed data.
-- Inserted by src/initDb.ts only when the patients table is empty.

INSERT INTO patients (name, dob, plan_tier, member_id, ssn, user_id, deductible_met) VALUES
  -- deductible_met (1000) sits EXACTLY on the Gold deductible (1000): the HLTH-03
  -- '>' vs '>=' boundary is directly observable via POST /copay/estimate {patient_id:1}.
  ('Alice Nguyen',  '1990-06-15', 'Gold',   'MBR-1001', '555-11-2222', 1, 1000.00),
  ('Bobby Tables',  '2010-03-02', 'Silver', 'MBR-1002', '555-33-4444', 2,    0.00),  -- a minor
  ('Carol Winters', '1958-11-30', 'Bronze', 'MBR-1003', '555-55-6666', 3,  500.00);

INSERT INTO providers (name, specialty) VALUES
  ('Dr. Reed',   'Cardiology'),
  ('Dr. Okafor', 'Family Medicine');

-- A booked future appointment, plus a COMPLETED one (for the cancel/state test).
INSERT INTO appointments (patient_id, provider_id, slot_at, status) VALUES
  (1, 1, now() + interval '3 days', 'booked'),
  (1, 2, now() - interval '10 days', 'completed'),
  (3, 1, now() + interval '1 day',  'booked');

INSERT INTO vitals (patient_id, systolic, diastolic, heart_rate, temp_c) VALUES
  (1, 118, 76, 68, 36.8),
  (3, 145, 92, 80, 37.1);
