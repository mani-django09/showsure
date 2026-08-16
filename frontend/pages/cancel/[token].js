import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api, fmtTime, fmtMoney } from '../../lib/api';
import PublicNav from '../../components/PublicNav';
import Footer from '../../components/Footer';
import Icon from '../../components/Icon';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function nextDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: DAY_NAMES[d.getDay()],
      weekday: d.getDay(),
      num: d.getDate(),
      month: MONTHS[d.getMonth()],
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function ManageBookingPage() {
  const { token } = useRouter().query;
  const [booking, setBooking] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState('view'); // view | reschedule
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [result, setResult] = useState(null); // { kind: 'cancelled' | 'rescheduled', ... }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => nextDays(14), []);
  const openWeekdays = useMemo(() => new Set((booking?.hours || []).map((h) => h.weekday)), [booking]);

  useEffect(() => {
    if (!token) return;
    api(`/public/booking/${token}`).then(setBooking).catch(() => setNotFound(true));
  }, [token]);

  useEffect(() => {
    setSlots(null);
    setSlot(null);
    if (mode !== 'reschedule' || !date) return;
    api(`/public/booking/${token}/availability?date=${date}`)
      .then((d) => setSlots(d.slots))
      .catch((e) => setError(e.message));
  }, [mode, date, token]);

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      const res = await api(`/public/cancel/${token}`, { method: 'POST' });
      setResult({ kind: res.status === 'cancelled' ? 'cancelled' : 'already', status: res.status });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReschedule() {
    setBusy(true);
    setError('');
    try {
      const res = await api(`/public/reschedule/${token}`, { method: 'POST', body: { date, start_min: slot } });
      setResult({ kind: 'rescheduled', date: res.date, start_min: res.start_min, service: res.service });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <Shell>
        <div className="card" style={{ marginTop: 60, textAlign: 'center' }}>
          <h1>Booking not found</h1>
          <p className="muted">This link may have expired or already been used.</p>
        </div>
      </Shell>
    );
  }

  if (!booking) {
    return (
      <Shell>
        <div className="container narrow" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="spinner" />
          <p className="muted" style={{ marginTop: 12 }}>Loading your appointment…</p>
        </div>
      </Shell>
    );
  }

  // ---- Result screens ----
  if (result?.kind === 'cancelled') {
    return (
      <Shell>
        <div className="card" style={{ marginTop: 60, textAlign: 'center' }}>
          <div className="empty-icon" style={{ background: '#d1fae5', color: 'var(--success)' }}><Icon name="check" size={26} /></div>
          <h1>Appointment cancelled</h1>
          <p className="muted">Your deposit hold has been released. Hope to see you another time!</p>
        </div>
      </Shell>
    );
  }
  if (result?.kind === 'rescheduled') {
    return (
      <Shell>
        <div className="card" style={{ marginTop: 60, textAlign: 'center' }}>
          <div className="empty-icon" style={{ background: '#d1fae5', color: 'var(--success)' }}><Icon name="check" size={26} /></div>
          <h1>Appointment moved</h1>
          <p style={{ margin: '10px 0' }}>
            <b>{result.service}</b> at {booking.business.name}
            <br />
            {result.date} at {fmtTime(result.start_min)}
          </p>
          <p className="muted">Your deposit hold carries over — nothing extra was charged.</p>
        </div>
      </Shell>
    );
  }

  if (booking.status !== 'confirmed') {
    return (
      <Shell>
        <div className="card" style={{ marginTop: 60, textAlign: 'center' }}>
          <h1>Already {booking.status.replace('_', '-')}</h1>
          <p className="muted">This booking can no longer be changed online.</p>
        </div>
      </Shell>
    );
  }

  // ---- Default view: appointment summary + Reschedule / Cancel ----
  return (
    <Shell>
      <div className="card" style={{ marginTop: 40 }}>
        <div className="empty-icon"><Icon name="calendar" size={26} /></div>
        <h1>Your appointment</h1>
        <p style={{ margin: '10px 0 18px' }}>
          <b>{booking.service?.name}</b> {booking.staff?.name ? `with ${booking.staff.name}` : ''} at {booking.business.name}
          <br />
          <span className="muted">{booking.date} at {fmtTime(booking.start_min)}</span>
        </p>

        {error && <div className="error">{error}</div>}

        {mode === 'view' ? (
          <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
            <button className="btn" onClick={() => setMode('reschedule')}>Reschedule</button>
            <button className="btn-danger" disabled={busy} onClick={cancel}>
              {busy ? 'Cancelling…' : 'Cancel appointment'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ marginBottom: 8 }}>Pick a new day</h2>
            <div className="date-scroll">
              {days.map((d) => {
                const closed = openWeekdays.size > 0 && !openWeekdays.has(d.weekday);
                return (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={closed}
                    className={`date-pill ${date === d.iso ? 'sel' : ''}`}
                    onClick={() => setDate(d.iso)}
                  >
                    <span className="muted" style={{ fontSize: '0.75rem' }}>{d.day}</span>
                    <b>{d.num}</b>
                    <span className="muted" style={{ fontSize: '0.7rem' }}>{d.month}</span>
                  </button>
                );
              })}
            </div>

            {slots && (
              <>
                <h2 style={{ marginTop: 16 }}>Pick a time</h2>
                {slots.length === 0 ? (
                  <p className="muted">No open times that day — try another date.</p>
                ) : (
                  <div className="slot-grid">
                    {slots.map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={`slot ${slot === t ? 'selected' : ''}`}
                        onClick={() => setSlot(t)}
                      >
                        {fmtTime(t)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 18 }}>
              <button className="btn-secondary" onClick={() => { setMode('view'); setError(''); }}>Back</button>
              <button className="btn" disabled={slot === null || busy} onClick={confirmReschedule}>
                {busy ? 'Moving…' : 'Confirm new time'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="page-shell">
      <Head>
        <title>Manage appointment — ShowSure</title>
        <meta name="robots" content="noindex" />
      </Head>
      <PublicNav />
      <div className="page-body">
        <div className="container narrow" style={{ textAlign: 'center' }}>
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
