import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api, fmtTime, fmtMoney } from '../lib/api';
import Icon from '../components/Icon';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLAN_LABEL = { starter: 'Starter', pro: 'Pro', growth: 'Growth' };

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 30-min time options for the hours editor
const TIME_OPTS = [];
for (let m = 0; m <= 24 * 60; m += 30) TIME_OPTS.push(m);

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('today');
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [date, setDate] = useState(isoDate(new Date()));
  const [bookings, setBookings] = useState([]);
  const [week, setWeek] = useState([]);
  const [clients, setClients] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [error, setError] = useState('');

  // Setup forms
  const [svc, setSvc] = useState({ name: '', duration_min: 60, price: 50 });
  const [staffName, setStaffName] = useState('');
  const [settings, setSettings] = useState({ deposit: 20, google_review_url: '', about: '', address: '' });
  const [hours, setHours] = useState([]); // [{weekday, open_min, close_min}] — absent weekday = closed
  const [squareStatus, setSquareStatus] = useState(null); // {configured, connected, env}
  const [billing, setBilling] = useState(null); // {plan, active, trial_days_left, plans, ...}

  const load = useCallback(async () => {
    try {
      const [meData, statsData, bkData, billingData] = await Promise.all([
        api('/me', { auth: true }),
        api('/stats', { auth: true }),
        api(`/bookings?date=${date}`, { auth: true }),
        api('/billing/status', { auth: true }),
      ]);
      setMe(meData);
      setStats(statsData);
      setBookings(bkData.bookings);
      setBilling(billingData);
      setHours(meData.hours);
      setSettings({
        deposit: meData.deposit_cents / 100,
        google_review_url: meData.google_review_url || '',
        about: meData.about || '',
        address: meData.address || '',
      });
    } catch {
      router.push('/login');
    }
  }, [date, router]);

  useEffect(() => { load(); }, [load]);

  // Calendar: today + 6 days
  useEffect(() => {
    if (tab !== 'calendar') return;
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 6);
    api(`/bookings/range?from=${isoDate(from)}&to=${isoDate(to)}`, { auth: true })
      .then((d) => setWeek(d.bookings))
      .catch((e) => setError(e.message));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'clients') return;
    api('/clients', { auth: true }).then((d) => setClients(d.clients)).catch((e) => setError(e.message));
    api('/waitlist', { auth: true }).then((d) => setWaitlist(d.waitlist)).catch((e) => setError(e.message));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'setup') return;
    api('/square/status', { auth: true }).then(setSquareStatus).catch(() => {});
  }, [tab]);

  // After the Square OAuth redirect (?square=connected / ?square=error)
  useEffect(() => {
    if (router.query.square === 'connected') setTab('setup');
    if (router.query.square === 'error') { setTab('setup'); setError(`Square: ${router.query.msg || 'connection failed'}`); }
  }, [router.query.square, router.query.msg]);

  async function connectSquare() {
    try {
      const { url } = await api('/square/connect', { auth: true });
      window.location.href = url; // off to Square's approval screen
    } catch (e) {
      setError(e.message);
    }
  }

  async function upgrade(plan) {
    setError('');
    try {
      const { url } = await api('/billing/checkout', { method: 'POST', body: { plan }, auth: true });
      window.location.href = url; // Lemon Squeezy checkout (or dev success redirect)
    } catch (e) {
      setError(e.message);
    }
  }

  // After returning from checkout
  useEffect(() => {
    if (router.query.billing === 'success') { setTab('billing'); load(); }
  }, [router.query.billing]); // eslint-disable-line

  async function act(fn) {
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.message); }
  }

  const setBookingStatus = (id, status) =>
    act(() => api(`/bookings/${id}`, { method: 'PATCH', body: { status }, auth: true }));

  function toggleDay(weekday) {
    setHours((h) =>
      h.some((x) => x.weekday === weekday)
        ? h.filter((x) => x.weekday !== weekday)
        : [...h, { weekday, open_min: 9 * 60, close_min: 18 * 60 }]
    );
  }
  function setDayTime(weekday, field, value) {
    setHours((h) => h.map((x) => (x.weekday === weekday ? { ...x, [field]: +value } : x)));
  }

  if (!me) {
    return (
      <>
        <Head><title>Dashboard — ShowSure</title><meta name="robots" content="noindex" /></Head>
        <div className="container"><p className="muted">Loading…</p></div>
      </>
    );
  }

  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/s/${me.slug}` : `/s/${me.slug}`;
  const calDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    calDays.push({ iso: isoDate(d), label: `${WEEKDAYS[d.getDay()]} ${d.getDate()}` });
  }

  return (
    <>
      <Head><title>{`${me.name} — Dashboard`}</title><meta name="robots" content="noindex" /></Head>

      {/* App header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <span className="mark"><Icon name="shield" size={18} /></span>
            <span className="name">{me.name}<small>ShowSure dashboard</small></span>
          </div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => { localStorage.removeItem('bs_token'); router.push('/'); }}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="container">
        {/* Trial / subscription banner */}
        {billing && !billing.active && (
          <div className="banner danger">
            ⛔ Your {billing.subscription_status === 'trialing' ? 'trial has ended' : 'subscription is inactive'} —
            online bookings are paused. <button className="btn-sm" onClick={() => setTab('billing')}>Choose a plan</button>
          </div>
        )}
        {billing && billing.active && billing.subscription_status === 'trialing' && (
          <div className="banner">
            🎁 <b>{billing.trial_days_left} day{billing.trial_days_left === 1 ? '' : 's'} left</b> in your free trial.
            <button className="btn-sm" onClick={() => setTab('billing')}>Upgrade now</button>
          </div>
        )}

        {/* Booking link */}
        <div className="card linkbar">
          <div className="row spread">
            <div>
              <div className="label">🔗 Your booking link</div>
              <div className="url">{bookingUrl}</div>
            </div>
            <div className="row">
              <button className="btn-sm" onClick={() => navigator.clipboard.writeText(bookingUrl)}>Copy</button>
              <a className="btn-sm" href={`/s/${me.slug}`} target="_blank" rel="noreferrer">Open ↗</a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[['today', '📋 Today'], ['calendar', '🗓️ Calendar'], ['clients', '👥 Clients'], ['billing', '💎 Billing'], ['setup', '⚙️ Setup']].map(([k, label]) => (
            <button key={k} className={`tab ${tab === k ? 'sel' : ''}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {/* ---- TODAY ---- */}
        {tab === 'today' && (
          <>
            {stats && (
              <div className="row" style={{ marginBottom: 18 }}>
                <div className="stat"><span className="stat-icon"><Icon name="calendar" size={18} /></span><div className="num">{stats.total_bookings}</div><div className="muted">Total bookings</div></div>
                <div className="stat"><span className="stat-icon"><Icon name="dollar" size={18} /></span><div className="num">{fmtMoney(stats.completed_revenue_cents)}</div><div className="muted">Revenue (completed)</div></div>
                <div className="stat"><span className="stat-icon"><Icon name="shield" size={18} /></span><div className="num">{stats.no_shows}</div><div className="muted">No-shows caught</div></div>
                <div className="stat"><span className="stat-icon"><Icon name="undo" size={18} /></span><div className="num">{fmtMoney(stats.recovered_cents)}</div><div className="muted">Recovered from no-shows</div></div>
              </div>
            )}

            <div className="card">
              <div className="row spread" style={{ marginBottom: 8 }}>
                <h2>Bookings</h2>
                <input type="date" style={{ width: 'auto', marginBottom: 0 }} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {bookings.length === 0 ? (
                <p className="muted">No bookings on this day.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Time</th><th>Client</th><th>Service</th><th>Staff</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {bookings.map((bk) => (
                      <tr key={bk.id}>
                        <td>{fmtTime(bk.start_min)}</td>
                        <td>{bk.customer_name}<div className="muted">{bk.customer_phone}</div></td>
                        <td>{bk.service_name}</td>
                        <td>{bk.staff_name}</td>
                        <td><span className={`badge ${bk.status}`}>{bk.status.replace('_', '-')}</span></td>
                        <td>
                          {bk.status === 'confirmed' && (
                            <div className="row">
                              <button className="btn-success btn-sm" onClick={() => setBookingStatus(bk.id, 'completed')}>✓ Done</button>
                              <button className="btn-danger btn-sm" onClick={() => setBookingStatus(bk.id, 'no_show')}>No-show</button>
                              <button className="btn-secondary btn-sm" onClick={() => setBookingStatus(bk.id, 'cancelled')}>Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {stats?.per_staff?.length > 0 && (
              <div className="card">
                <h2>Per-staff performance</h2>
                <table>
                  <thead><tr><th>Staff</th><th>Bookings</th><th>No-shows</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {stats.per_staff.map((s) => (
                      <tr key={s.name}>
                        <td>{s.name}</td><td>{s.bookings}</td><td>{s.no_shows}</td><td>{fmtMoney(s.revenue_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---- CALENDAR (next 7 days) ---- */}
        {tab === 'calendar' && (
          <div className="card">
            <h2>Next 7 days</h2>
            <div className="week">
              {calDays.map((d) => {
                const dayBookings = week.filter((b) => b.date === d.iso);
                return (
                  <div className="day-col" key={d.iso}>
                    <div className="day-head">{d.label}</div>
                    {dayBookings.length === 0 ? (
                      <div className="muted" style={{ fontSize: '0.75rem', textAlign: 'center', padding: 8 }}>—</div>
                    ) : (
                      dayBookings.map((b) => (
                        <div className={`bk-card ${b.status}`} key={b.id}>
                          <b>{fmtTime(b.start_min)}</b>
                          <div>{b.customer_name}</div>
                          <div className="muted" style={{ fontSize: '0.72rem' }}>{b.service_name} · {b.staff_name}</div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- CLIENTS (CRM) ---- */}
        {tab === 'clients' && (
          <>
          {waitlist.length > 0 && (
            <div className="card">
              <h2>⏳ Waitlist ({waitlist.length})</h2>
              <p className="muted" style={{ marginBottom: 10 }}>
                Customers waiting for a fully-booked day — we text them automatically the moment a matching slot opens up.
              </p>
              <table>
                <thead>
                  <tr><th>Client</th><th>Phone</th><th>Service</th><th>Staff</th><th>Wants date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id}>
                      <td>{w.customer_name}</td>
                      <td className="muted">{w.customer_phone}</td>
                      <td>{w.service_name}</td>
                      <td className="muted">{w.staff_name || 'Any staff'}</td>
                      <td>{w.date}</td>
                      <td>
                        {w.notified
                          ? <span className="badge confirmed">Notified</span>
                          : <span className="badge no_show">Waiting</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="card">
            <h2>Clients ({clients.length})</h2>
            {clients.length === 0 ? (
              <p className="muted">No clients yet — they appear automatically after their first booking.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Client</th><th>Phone</th><th>Visits</th><th>No-shows</th>
                    <th>Total spent</th><th>Last service</th><th>Last visit</th><th>Next visit</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.phone}>
                      <td>
                        {c.name}
                        {c.no_shows > 0 && <span className="badge no_show" style={{ marginLeft: 6 }}>⚠ risky</span>}
                      </td>
                      <td className="muted">{c.phone}</td>
                      <td>{c.completed}/{c.total_bookings}</td>
                      <td>{c.no_shows}</td>
                      <td>{fmtMoney(c.total_spent_cents || 0)}</td>
                      <td className="muted">{c.last_service || '—'}</td>
                      <td className="muted">{c.last_visit || '—'}</td>
                      <td>
                        {c.next_visit
                          ? <span className="badge confirmed">{c.next_visit}</span>
                          : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
        )}

        {/* ---- BILLING ---- */}
        {tab === 'billing' && billing && (
          <>
            {router.query.billing === 'success' && (
              <div className="banner">✅ You&apos;re subscribed! Thanks — your plan is active.</div>
            )}
            <div className="card">
              <div className="row spread">
                <div>
                  <h2 style={{ marginBottom: 4 }}>Current plan: {billing.plan === 'none' ? 'No active plan' : billing.plan === 'trial' ? 'Free trial' : (PLAN_LABEL[billing.plan] || billing.plan)}</h2>
                  <p className="muted">
                    Status: <b>{billing.subscription_status}</b>
                    {billing.subscription_status === 'trialing' && ` · ${billing.trial_days_left} days left`}
                    {billing.current_period_end && ` · renews ${billing.current_period_end.slice(0, 10)}`}
                  </p>
                </div>
                {billing.active
                  ? <span className="badge completed">Active</span>
                  : <span className="badge no_show">Inactive</span>}
              </div>
              {!billing.configured && (
                <p className="muted" style={{ marginTop: 10 }}>
                  ⚙️ Dev mode: Lemon Squeezy keys not set — “subscribing” activates instantly for testing.
                </p>
              )}
            </div>

            <div className="grid3">
              {billing.plans.map((p) => {
                const current = billing.plan === p.key && billing.active;
                return (
                  <div className={`card plan ${p.key === 'pro' ? 'featured' : ''}`} key={p.key}>
                    {p.key === 'pro' && <div className="plan-tag">Most popular</div>}
                    <h3>{p.label}</h3>
                    <div className="price">${p.price}<span className="muted">/mo</span></div>
                    <ul className="plan-list">
                      <li>✓ {p.staff} staff</li>
                      <li>✓ Unlimited bookings</li>
                      <li>✓ Deposits + no-show charges</li>
                      <li>✓ SMS reminders</li>
                      {p.key !== 'starter' && <li>✓ Review booster</li>}
                    </ul>
                    <button
                      disabled={current}
                      style={{ width: '100%' }}
                      className={current ? 'btn-secondary' : ''}
                      onClick={() => upgrade(p.key)}
                    >
                      {current ? 'Current plan' : `Choose ${p.label}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>
              Secure checkout via Lemon Squeezy · cancel anytime · zero commission on your bookings
            </p>
          </>
        )}

        {/* ---- SETUP ---- */}
        {tab === 'setup' && (
          <>
            <div className="card">
              <h2>Services</h2>
              {me.services.map((s) => (
                <div className="row spread" key={s.id} style={{ marginBottom: 8 }}>
                  <span>{s.name} — {fmtMoney(s.price_cents)} ({s.duration_min} min)</span>
                  <button className="btn-secondary btn-sm" onClick={() => act(() => api(`/services/${s.id}`, { method: 'DELETE', auth: true }))}>Remove</button>
                </div>
              ))}
              <div className="row" style={{ marginTop: 8 }}>
                <input style={{ flex: 2, marginBottom: 0 }} placeholder="Service name" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
                <input style={{ flex: 1, marginBottom: 0 }} type="number" min="15" step="15" placeholder="Minutes" value={svc.duration_min} onChange={(e) => setSvc({ ...svc, duration_min: +e.target.value })} />
                <input style={{ flex: 1, marginBottom: 0 }} type="number" min="0" placeholder="Price $" value={svc.price} onChange={(e) => setSvc({ ...svc, price: +e.target.value })} />
                <button
                  className="btn-sm"
                  onClick={() => svc.name && act(async () => {
                    await api('/services', { method: 'POST', auth: true, body: { name: svc.name, duration_min: svc.duration_min, price_cents: Math.round(svc.price * 100) } });
                    setSvc({ name: '', duration_min: 60, price: 50 });
                  })}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="card">
              <h2>Staff</h2>
              {me.staff.map((s) => (
                <div className="row spread" key={s.id} style={{ marginBottom: 8 }}>
                  <span>{s.name}</span>
                  <button className="btn-secondary btn-sm" onClick={() => act(() => api(`/staff/${s.id}`, { method: 'DELETE', auth: true }))}>Remove</button>
                </div>
              ))}
              <div className="row" style={{ marginTop: 8 }}>
                <input style={{ flex: 1, marginBottom: 0 }} placeholder="Staff name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                <button
                  className="btn-sm"
                  onClick={() => staffName && act(async () => {
                    await api('/staff', { method: 'POST', auth: true, body: { name: staffName } });
                    setStaffName('');
                  })}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="card">
              <h2>Opening hours</h2>
              {WEEKDAYS.map((label, wd) => {
                const day = hours.find((h) => h.weekday === wd);
                return (
                  <div className="row" key={wd} style={{ marginBottom: 8 }}>
                    <label style={{ width: 90 }}>
                      <input type="checkbox" checked={!!day} onChange={() => toggleDay(wd)} style={{ width: 'auto', marginRight: 6, marginBottom: 0 }} />
                      {label}
                    </label>
                    {day ? (
                      <>
                        <select style={{ width: 110, marginBottom: 0 }} value={day.open_min} onChange={(e) => setDayTime(wd, 'open_min', e.target.value)}>
                          {TIME_OPTS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
                        </select>
                        <span className="muted">to</span>
                        <select style={{ width: 110, marginBottom: 0 }} value={day.close_min} onChange={(e) => setDayTime(wd, 'close_min', e.target.value)}>
                          {TIME_OPTS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
                        </select>
                      </>
                    ) : (
                      <span className="muted">Closed</span>
                    )}
                  </div>
                );
              })}
              <button style={{ marginTop: 8 }} onClick={() => act(() => api('/hours', { method: 'PUT', auth: true, body: { hours } }))}>
                Save hours
              </button>
            </div>

            <div className="card">
              <h2>Salon profile & settings</h2>
              <label className="muted">About (shown on your booking page)</label>
              <input placeholder="e.g. Award-winning lash & nail studio in Austin" value={settings.about} onChange={(e) => setSettings({ ...settings, about: e.target.value })} />
              <label className="muted">Address</label>
              <input placeholder="123 Main St, Austin, TX" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              <label className="muted">No-show deposit ($)</label>
              <input type="number" min="0" value={settings.deposit} onChange={(e) => setSettings({ ...settings, deposit: +e.target.value })} />
              <label className="muted">Google review link (sent after each visit)</label>
              <input placeholder="https://g.page/r/…/review" value={settings.google_review_url} onChange={(e) => setSettings({ ...settings, google_review_url: e.target.value })} />
              <button
                onClick={() => act(() => api('/me', {
                  method: 'PATCH', auth: true,
                  body: {
                    deposit_cents: Math.round(settings.deposit * 100),
                    google_review_url: settings.google_review_url,
                    about: settings.about,
                    address: settings.address,
                  },
                }))}
              >
                Save settings
              </button>
            </div>

            <div className="card">
              <h2>💳 Square payments</h2>
              {router.query.square === 'connected' && (
                <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>✅ Square connected successfully!</p>
              )}
              {!squareStatus ? (
                <p className="muted">Checking status…</p>
              ) : me.square_connected ? (
                <>
                  <p style={{ marginBottom: 8 }}>
                    Status: <b style={{ color: 'var(--success)' }}>Connected ✓</b>
                    {squareStatus.env === 'sandbox' && <span className="badge cancelled" style={{ marginLeft: 8 }}>sandbox</span>}
                  </p>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Client deposits are held and charged on <b>your own Square account</b>. We never touch your money.
                  </p>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => act(() => api('/square/disconnect', { method: 'POST', auth: true }))}
                  >
                    Disconnect Square
                  </button>
                </>
              ) : squareStatus.configured ? (
                <>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Connect your Square account so client card deposits are real. Takes 2 minutes —
                    you approve on Square&apos;s own page, deposits land directly in your account.
                  </p>
                  <button onClick={connectSquare}>Connect Square account</button>
                </>
              ) : (
                <p className="muted">
                  ⚙️ Dev mode: Square keys are not set on the server, so deposits are <b>simulated</b>.
                  Everything else works normally. (Server owner: set SQUARE_APP_ID / SQUARE_APP_SECRET.)
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
