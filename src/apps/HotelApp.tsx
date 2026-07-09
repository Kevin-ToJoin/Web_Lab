import { useState, useEffect } from 'react';
import { ArrowLeft, BedDouble, CalendarRange, Users, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

interface RoomType {
  id: string;
  name: string;
  nightly: number;
  maxGuests: number;
}

interface Booking {
  roomId: string;
  checkIn: string;
  checkOut: string;
}

const ROOM_TYPES: RoomType[] = [
  { id: 'standard', name: 'Standard Room', nightly: 120, maxGuests: 2 },
  { id: 'deluxe',   name: 'Deluxe Room',   nightly: 190, maxGuests: 3 },
  { id: 'suite',    name: 'Executive Suite', nightly: 320, maxGuests: 4 },
];

const RESORT_FEE_PER_NIGHT = 25;
const MIN_NIGHTS_WEEKEND = 2;
const MAX_STAY_NIGHTS = 30;
const CHILD_FREE_UNDER = 12; // children strictly under 12 stay free

interface Quote {
  nights: number;
  roomSubtotal: number;
  resortFee: number;
  discount: number;
  total: number;
}

const HotelInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [rooms, setRooms] = useState('1');
  const [childAge, setChildAge] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('standard');
  const [loyalty, setLoyalty] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState('');

  // Overbooking demo — a rolling list of confirmed bookings.
  const [bookings, setBookings] = useState<Booking[]>([
    { roomId: 'standard', checkIn: '2026-08-10', checkOut: '2026-08-14' },
  ]);
  const [bookingStatus, setBookingStatus] = useState('');

  const roomType = ROOM_TYPES.find(r => r.id === roomTypeId) ?? ROOM_TYPES[0];

  const isWeekend = (iso: string) => {
    // BUG HOT-09 (L6 Timezone): new Date("YYYY-MM-DD") is parsed as UTC midnight,
    // so getDay() in a negative-offset zone can report the previous day — a Saturday
    // stay reads as Friday and skips the weekend minimum-nights rule.
    const d = new Date(iso);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const calculateQuote = () => {
    setStatus('');
    if (!checkIn || !checkOut) {
      setStatus('Please select both check-in and check-out dates.');
      setQuote(null);
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    // BUG HOT-01 (L3 Date Validation): should reject check-out <= check-in, but only
    // rejects a strictly-earlier date, so a zero-night stay (in === out) slips through.
    if (outDate < inDate) {
      setStatus('Check-out cannot be before check-in.');
      setQuote(null);
      return;
    }

    // BUG HOT-02 (L4 Date Validation): no guard that check-in is today or later, so
    // past dates are accepted. (Intended: reject inDate < startOfToday.)

    const msPerNight = 1000 * 60 * 60 * 24;
    // BUG HOT-03 (L5 Boundary): nights are counted inclusively (+1), charging one
    // extra night. A Mon→Wed stay is 2 nights but bills 3.
    const nights = Math.round((outDate.getTime() - inDate.getTime()) / msPerNight) + 1;

    // BUG HOT-13 (L6 Edge Case): no maximum-stay cap; a 400-night booking is accepted.
    // (Intended: reject nights > MAX_STAY_NIGHTS.)
    void MAX_STAY_NIGHTS;

    const guestCount = parseInt(guests, 10) || 0;
    const roomCount = parseInt(rooms, 10) || 0;

    // BUG HOT-10 (L4 Missing Validation): zero rooms / zero guests are accepted
    // instead of rejected. (Intended: require rooms >= 1 and guests >= 1.)

    // BUG HOT-04 (L4 Boundary): max-guests-per-room is not enforced. Booking 6 guests
    // in a single Standard room (max 2) is allowed. (Intended: guests <= maxGuests * rooms.)
    void roomType.maxGuests;

    // BUG HOT-07 (L5 Boundary): the weekend 2-night minimum is not enforced.
    if (isWeekend(checkIn) && nights < MIN_NIGHTS_WEEKEND) {
      // (Intended: block the booking here. Left as a no-op comment on purpose.)
    }

    // BUG HOT-14 (L5 Boundary): "children under 12 stay free" is implemented with <=,
    // so a 12-year-old is wrongly counted as free. (Intended: age < CHILD_FREE_UNDER.)
    const child = parseInt(childAge, 10);
    const childIsFree = !isNaN(child) && child <= CHILD_FREE_UNDER;
    void childIsFree;

    // BUG HOT-06 (L3 Logic): room subtotal ignores the number of rooms — it charges
    // for a single room regardless of how many were requested.
    const roomSubtotal = roomType.nightly * nights; // should be * roomCount

    const resortFee = RESORT_FEE_PER_NIGHT * nights * roomCount;

    // BUG HOT-08 (L4 Logic): the resort fee is added to the base BEFORE the loyalty
    // discount, so the discount is applied to fees it should not touch.
    const preDiscount = roomSubtotal + resortFee;

    // BUG HOT-11 (L5 Logic): the loyalty discount is applied twice (10% then 10% of the
    // remainder) because the same 0.10 factor is subtracted in two places.
    let discount = 0;
    if (loyalty) {
      discount = preDiscount * 0.10;
      discount += (preDiscount - discount) * 0.10;
    }

    const total = preDiscount - discount;

    setQuote({
      nights,
      roomSubtotal,
      resortFee,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
    setStatus(`Quote ready for ${roomType.name} — ${nights} night(s), ${guestCount} guest(s), ${roomCount} room(s).`);
  };

  const datesOverlap = (aIn: string, aOut: string, bIn: string, bOut: string) =>
    aIn < bOut && bIn < aOut;

  const confirmBooking = () => {
    if (!checkIn || !checkOut) {
      setBookingStatus('Select dates before booking.');
      return;
    }
    // BUG HOT-05 (L5 Logic): overbooking — no check for an overlapping reservation on
    // the same room, so the room can be double-booked for the same nights.
    const conflict = bookings.find(
      b => b.roomId === roomTypeId && datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut),
    );
    void conflict; // intentionally ignored (the bug)

    setBookings(prev => [...prev, { roomId: roomTypeId, checkIn, checkOut }]);
    setBookingStatus(`Booked ${roomType.name} for ${checkIn} → ${checkOut}.`);
  };

  useEffect(() => {
    setRequirements(`## Hotel Booking Engine — "StayEasy"

Guests search availability, price a stay, and confirm a reservation.

### Functional Requirements
- **Check-out must be strictly after check-in** — a zero-night (same-day) stay is invalid.
- **Check-in must be today or later** — past dates are rejected.
- **Nights** = (check-out − check-in) in whole days. A Mon→Wed stay is **2 nights**, not 3.
- **Guests per room** must not exceed the room's **max occupancy** (Standard 2, Deluxe 3, Suite 4). Total capacity = maxGuests × rooms.
- **Rooms** and **guests** must both be **≥ 1**.
- A room **cannot be double-booked** for overlapping dates (no overbooking).
- **Room subtotal** = nightly rate × nights × **number of rooms**.
- The **resort fee** ($${RESORT_FEE_PER_NIGHT}/night/room) is added, and any **loyalty discount is applied to the room subtotal only** (not to fees), and **only once** (10%).
- Weekend stays require a **${MIN_NIGHTS_WEEKEND}-night minimum**.
- A stay may not exceed **${MAX_STAY_NIGHTS} nights**.
- Dates must **not drift across timezones**.
- **Children under ${CHILD_FREE_UNDER}** (strictly) stay free; a ${CHILD_FREE_UNDER}-year-old is **not** free.

### Levels
14 bugs, difficulty levels 3-6 (date validation, boundary value, logic, timezone, missing validation).`);

    setDbTables({
      Rooms: ROOM_TYPES.map((r, i) => ({ id: i + 1, code: r.id, name: r.name, nightly: r.nightly, maxGuests: r.maxGuests })),
      Reservations: [
        { id: 5001, room: 'standard', checkIn: '2026-08-10', checkOut: '2026-08-14', guests: 2, status: 'confirmed' },
        { id: 5002, room: 'suite',    checkIn: '2026-09-01', checkOut: '2026-09-03', guests: 4, status: 'confirmed' },
      ],
      Fees: [
        { id: 1, label: 'Resort fee (per night, per room)', amount: RESORT_FEE_PER_NIGHT },
        { id: 2, label: 'Loyalty discount', amount: '10%' },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/quote',
        description: 'Prices a stay. (Reflects HOT-03: inclusive night count, and HOT-06: ignores room count.)',
        payloadTemplate: '{\n  "roomType": "standard",\n  "checkIn": "2026-08-10",\n  "checkOut": "2026-08-12",\n  "rooms": 2\n}',
        handler: (requestBody: string) => {
          try {
            const { roomType: rt, checkIn: ci, checkOut: co } = JSON.parse(requestBody || '{}');
            const room = ROOM_TYPES.find(r => r.id === rt) ?? ROOM_TYPES[0];
            const ms = 1000 * 60 * 60 * 24;
            // BUG HOT-03: inclusive +1. BUG HOT-06: room count ignored.
            const nights = Math.round((new Date(co).getTime() - new Date(ci).getTime()) / ms) + 1;
            const subtotal = room.nightly * nights;
            return { status: 200, body: { nights, subtotal } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/reservations',
        description: 'Confirms a reservation. (Reflects HOT-05: no overlap check, and HOT-02: past dates accepted.)',
        payloadTemplate: '{\n  "roomType": "standard",\n  "checkIn": "2026-08-11",\n  "checkOut": "2026-08-13"\n}',
        handler: (requestBody: string) => {
          try {
            const { roomType: rt, checkIn: ci, checkOut: co } = JSON.parse(requestBody || '{}');
            // BUG HOT-05: accepts overlapping dates. BUG HOT-02: no past-date guard.
            return { status: 200, body: { confirmed: true, room: rt, checkIn: ci, checkOut: co } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      { bugId: 'HOT-01', title: 'Zero-night stay accepted', location: 'HotelApp.tsx — calculateQuote()', technique: 'Date Validation',
        buggyCode: 'if (outDate < inDate) { reject }',
        fixedCode: 'if (outDate <= inDate) { setStatus("Check-out must be after check-in."); return; }',
        explanation: 'Only a strictly-earlier check-out is rejected, so check-in === check-out (0 nights) passes. Use <=.' },
      { bugId: 'HOT-02', title: 'Past check-in dates accepted', location: 'HotelApp.tsx — calculateQuote()', technique: 'Date Validation',
        buggyCode: '// no past-date check',
        fixedCode: 'const today = new Date(); today.setHours(0,0,0,0);\nif (inDate < today) { setStatus("Check-in is in the past."); return; }',
        explanation: 'A stay starting yesterday is quoted. Reject check-in dates earlier than today.' },
      { bugId: 'HOT-03', title: 'Night count is off-by-one', location: 'HotelApp.tsx — calculateQuote()', technique: 'Boundary Value',
        buggyCode: 'const nights = diffDays(out, in) + 1;',
        fixedCode: 'const nights = diffDays(out, in); // no +1',
        explanation: 'Nights are counted inclusively, billing one extra night. The count is check-out minus check-in.' },
      { bugId: 'HOT-04', title: 'Room occupancy not enforced', location: 'HotelApp.tsx — calculateQuote()', technique: 'Boundary Value',
        buggyCode: 'void roomType.maxGuests; // never checked',
        fixedCode: 'if (guestCount > roomType.maxGuests * roomCount) { setStatus("Too many guests for the rooms."); return; }',
        explanation: 'Six guests fit into one 2-person room. Enforce guests <= maxGuests × rooms.' },
      { bugId: 'HOT-05', title: 'Overbooking — no overlap check', location: 'HotelApp.tsx — confirmBooking()', technique: 'Logic Error',
        buggyCode: 'void conflict; // ignored\nsetBookings(prev => [...prev, newBooking]);',
        fixedCode: 'if (conflict) { setBookingStatus("Room already booked for those dates."); return; }',
        explanation: 'An overlapping reservation on the same room is ignored, allowing a double-booking. Block on conflict.' },
      { bugId: 'HOT-06', title: 'Subtotal ignores room count', location: 'HotelApp.tsx — calculateQuote()', technique: 'Logic Error',
        buggyCode: 'const roomSubtotal = nightly * nights;',
        fixedCode: 'const roomSubtotal = nightly * nights * roomCount;',
        explanation: 'Two rooms are billed as one. Multiply by the number of rooms.' },
      { bugId: 'HOT-07', title: 'Weekend minimum-nights not enforced', location: 'HotelApp.tsx — calculateQuote()', technique: 'Boundary Value',
        buggyCode: 'if (isWeekend(checkIn) && nights < 2) { /* no-op */ }',
        fixedCode: 'if (isWeekend(checkIn) && nights < MIN_NIGHTS_WEEKEND) { setStatus("2-night minimum on weekends."); return; }',
        explanation: 'The weekend minimum is checked but never acted on. Reject stays below the minimum.' },
      { bugId: 'HOT-08', title: 'Discount applied to resort fees', location: 'HotelApp.tsx — calculateQuote()', technique: 'Logic Error',
        buggyCode: 'const preDiscount = roomSubtotal + resortFee;\ndiscount = preDiscount * 0.10;',
        fixedCode: 'discount = roomSubtotal * 0.10; // fees are non-discountable\nconst total = roomSubtotal - discount + resortFee;',
        explanation: 'The loyalty discount is taken on room + fees. It should apply to the room subtotal only.' },
      { bugId: 'HOT-09', title: 'Weekend check drifts by timezone', location: 'HotelApp.tsx — isWeekend()', technique: 'Timezone Error',
        buggyCode: 'const d = new Date(iso); // UTC midnight\nreturn d.getDay() === 0 || d.getDay() === 6;',
        fixedCode: "const [y,m,dd] = iso.split('-').map(Number);\nconst d = new Date(y, m - 1, dd); // local",
        explanation: 'UTC parsing shifts the weekday in negative offsets. Build a local date before reading getDay().' },
      { bugId: 'HOT-10', title: 'Zero rooms / zero guests accepted', location: 'HotelApp.tsx — calculateQuote()', technique: 'Missing Validation',
        buggyCode: '// roomCount / guestCount never floor-checked',
        fixedCode: 'if (roomCount < 1 || guestCount < 1) { setStatus("Need at least 1 room and 1 guest."); return; }',
        explanation: 'A booking for 0 rooms or 0 guests is priced. Require both to be at least 1.' },
      { bugId: 'HOT-11', title: 'Loyalty discount applied twice', location: 'HotelApp.tsx — calculateQuote()', technique: 'Logic Error',
        buggyCode: 'discount = pre * 0.10;\ndiscount += (pre - discount) * 0.10;',
        fixedCode: 'discount = roomSubtotal * 0.10; // once',
        explanation: 'The 10% is subtracted twice, over-discounting the stay. Apply it a single time.' },
      { bugId: 'HOT-12', title: '"Modify Search" button is a no-op', location: 'HotelApp.tsx — header button', technique: 'UI Bug',
        buggyCode: '<button>Modify Search</button> // no onClick',
        fixedCode: '<button onClick={() => setQuote(null)}>Modify Search</button>',
        explanation: 'The Modify Search control does nothing. Wire it to clear the current quote and re-open the form.' },
      { bugId: 'HOT-13', title: 'No maximum-stay cap', location: 'HotelApp.tsx — calculateQuote()', technique: 'Edge Case',
        buggyCode: 'void MAX_STAY_NIGHTS; // never checked',
        fixedCode: 'if (nights > MAX_STAY_NIGHTS) { setStatus("Stays are capped at 30 nights."); return; }',
        explanation: 'A 400-night stay is quoted. Cap the number of nights at the maximum.' },
      { bugId: 'HOT-14', title: 'Child free-age boundary off-by-one', location: 'HotelApp.tsx — calculateQuote()', technique: 'Boundary Value',
        buggyCode: 'const childIsFree = age <= 12;',
        fixedCode: 'const childIsFree = age < CHILD_FREE_UNDER; // strictly under 12',
        explanation: 'Children under 12 stay free, but <= 12 lets a 12-year-old in free. Use a strict less-than.' },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const inputStyle = { marginBottom: '1rem' };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>StayEasy</h1>
          <p>Hotel booking engine: search, price, and reserve a stay. (Difficulty: Medium)</p>
        </div>
        {/* BUG HOT-12: this button has no onClick handler. */}
        <button className="btn btn-secondary">Modify Search</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Search / quote form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarRange size={20} /> Search &amp; Price a Stay
          </h2>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="room-type">Room Type</label>
            <select id="room-type" className="input-field" value={roomTypeId} onChange={e => setRoomTypeId(e.target.value)}>
              {ROOM_TYPES.map(r => (
                <option key={r.id} value={r.id}>{r.name} — ${r.nightly}/night (max {r.maxGuests})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="check-in">Check-in</label>
              <input id="check-in" type="date" className="input-field" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </div>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="check-out">Check-out</label>
              <input id="check-out" type="date" className="input-field" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="guests">Guests</label>
              <input id="guests" type="number" className="input-field" value={guests} onChange={e => setGuests(e.target.value)} />
            </div>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="rooms">Rooms</label>
              <input id="rooms" type="number" className="input-field" value={rooms} onChange={e => setRooms(e.target.value)} />
            </div>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="child-age">Child age</label>
              <input id="child-age" type="number" className="input-field" value={childAge} onChange={e => setChildAge(e.target.value)} placeholder="opt." />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={loyalty} onChange={e => setLoyalty(e.target.checked)} />
            <Tag size={16} /> Apply loyalty discount (10%)
          </label>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={calculateQuote}>
            Get Quote
          </button>

          {status && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{status}</p>}

          {quote && (
            <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Nights</span><span>{quote.nights}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Room subtotal</span><span>${quote.roomSubtotal.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Resort fee</span><span>${quote.resortFee.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--success)' }}><span>Discount</span><span>-${quote.discount.toFixed(2)}</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.6rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}><span>Total</span><span data-testid="quote-total">${quote.total.toFixed(2)}</span></div>
            </div>
          )}
        </div>

        {/* Availability / booking */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BedDouble size={20} /> Confirm Reservation
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <Users size={14} style={{ verticalAlign: 'middle' }} /> Uses the dates and room type selected on the left.
          </p>

          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={confirmBooking}>
            Book This Room
          </button>
          {bookingStatus && <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{bookingStatus}</p>}

          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Confirmed bookings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {bookings.map((b, i) => (
              <div key={i} className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{ROOM_TYPES.find(r => r.id === b.roomId)?.name ?? b.roomId}</span>
                <span style={{ color: 'var(--text-muted)' }}>{b.checkIn} → {b.checkOut}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const HotelApp = () => (
  <QALayout>
    <HotelInner />
  </QALayout>
);
