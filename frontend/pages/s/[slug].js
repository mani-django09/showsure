import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api, fmtTime, fmtMoney } from '../../lib/api';
import PublicNav from '../../components/PublicNav';
import Footer from '../../components/Footer';
import Icon from '../../components/Icon';

// Wraps every page state with the shared nav + footer and a sticky-footer layout
function Shell({ children }) {
  return (
    <div className="page-shell">
      <Head>
        <title>Book an appointment — ShowSure</title>
        <meta name="description" content="Book your appointment online in seconds. A small card deposit protects your slot — charged only if you don't show up." />
      </Head>
      <PublicNav />
      <div className="page-body">{children}</div>
      <Footer />
    </div>
  );
}

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

// Fresha-style booking flow: service cards -> staff chips -> date scroller -> time chips -> details
// Fetch the salon server-side so crawlers and social-share bots (Instagram, WhatsApp,
// Facebook link previews) — which never run client JS — see the real salon name,
// description and OG tags instead of a generic "Loading…" shell.
export async function getServerSideProps({ params }) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5055';
  try {
    const res = await fetch(`${backendUrl}/api/public/${params.slug}`);
    if (!res.ok) return { props: { initialBiz: null, initialNotFound: true } };
    const biz = await res.json();
    return { props: { initialBiz: biz, initialNotFound: false } };
  } catch {
    return { props: { initialBiz: null, initialNotFound: false } };
  }
}

export default function BookingPage({ initialBiz, initialNotFound }) {
  const router = useRouter();
  const { slug } = router.query;

  const [biz, setBiz] = useState(initialBiz);
  const [notFound, setNotFound] = useState(initialNotFound);
  const [serviceId, setServiceId] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [card, setCard] = useState(null); // Square Web Payments SDK card element

  const days = useMemo(() => nextDays(14), []);
  const openWeekdays = useMemo(() => new Set((biz?.hours || []).map((h) => h.weekday)), [biz]);

  useEffect(() => {
    if (!slug) return;
    api(`/public/${slug}`).then(setBiz).catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    setSlots(null);
    setSlot(null);
    if (!slug || !serviceId || !staffId || !date) return;
    api(`/public/${slug}/availability?service_id=${serviceId}&staff_id=${staffId}&date=${date}`)
      .then((d) => setSlots(d.slots))
      .catch((e) => setError(e.message));
  }, [slug, serviceId, staffId, date]);

  // When the salon has Square connected, load the Web Payments SDK and mount the
  // card field as soon as the client reaches the details step. Card data is
  // tokenized in the browser by Square — our servers never see card numbers.
  useEffect(() => {
    if (slot === null || !biz?.square?.connected || card) return;
    let cancelled = false;
    async function initCard() {
      try {
        if (!window.Square) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = biz.square.sdk_url;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Could not load payment form'));
            document.head.appendChild(s);
          });
        }
        if (cancelled) return;
        const payments = window.Square.payments(biz.square.app_id, biz.square.location_id);
        const c = await payments.card();
        await c.attach('#card-container');
        if (!cancelled) setCard(c);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    initCard();
    return () => { cancelled = true; };
  }, [slot, biz, card]);

  async function book(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let card_token;
      if (biz?.square?.connected) {
        if (!card) throw new Error('Payment form is still loading — one second');
        const result = await card.tokenize();
        if (result.status !== 'OK') {
          throw new Error(result.errors?.[0]?.message || 'Please check your card details');
        }
        card_token = result.token;
      }
      const res = await api(`/public/${slug}/bookings`, {
        method: 'POST',
        body: { service_id: serviceId, staff_id: staffId, date, start_min: slot, card_token, ...form },
      });
      setDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (notFound) return <Shell><div className="container narrow"><div className="card" style={{ marginTop: 40 }}><h1>Salon not found</h1></div></div></Shell>;
  if (!biz) {
    return (
      <Shell>
        <div className="container narrow" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="spinner" />
          <p className="muted" style={{ marginTop: 12 }}>Loading booking page…</p>
        </div>
      </Shell>
    );
  }

  if (biz.accepting === false) {
    return (
      <Shell>
      <Head>
        <title>{`${biz.name} — ShowSure`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="container narrow">
        <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
          <h1>{biz.name}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            This salon isn&apos;t taking online bookings right now. Please contact them directly.
          </p>
        </div>
      </div>
      </Shell>
    );
  }

  const service = biz.services.find((s) => s.id === serviceId);
  const staffMember = biz.staff.find((s) => s.id === staffId);

  if (done) {
    return (
      <Shell>
      <div className="container narrow">
        <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
          <h1>✅ You&apos;re booked!</h1>
          <p style={{ margin: '12px 0' }}>
            <b>{done.service}</b> with {done.staff}
            <br />
            {done.date} at {fmtTime(done.start_min)}
          </p>
          <p className="muted">
            A confirmation text is on its way. A {fmtMoney(biz.deposit_cents)} deposit is held on your card —
            it&apos;s only charged if you don&apos;t show up.
          </p>
        </div>
      </div>
      </Shell>
    );
  }

  const pageUrl = `https://frontend-swart-pi-29.vercel.app/s/${biz.slug}`;
  const pageDesc = biz.about
    ? `${biz.about} Book online in seconds — a small deposit protects your slot.`
    : `Book an appointment at ${biz.name}. A small card deposit protects your slot, charged only if you don't show up.`;
  const ogImage = `https://frontend-swart-pi-29.vercel.app/api/og?salon=${encodeURIComponent(biz.name)}&deposit=${encodeURIComponent(fmtMoney(biz.deposit_cents))}`;

  return (
    <Shell>
      <Head>
        <title>{`${biz.name} — Book Online | ShowSure`}</title>
        <meta name="description" content={pageDesc.slice(0, 160)} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="business.business" />
        <meta property="og:title" content={`Book at ${biz.name}`} />
        <meta property="og:description" content={pageDesc.slice(0, 160)} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Book at ${biz.name}`} />
        <meta name="twitter:description" content={pageDesc.slice(0, 160)} />
        <meta name="twitter:image" content={ogImage} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: biz.name,
            description: biz.about || undefined,
            address: biz.address || undefined,
            priceRange: '$$',
          }).replace(/</g, '\\u003c') }}
        />
      </Head>
      <div className="bp-hero">
        <div className="bp-hero-inner">
          <div className="bp-avatar">{biz.name[0]}</div>
          <div className="bp-hero-text">
            <h1>{biz.name}</h1>
            {biz.about && <p className="bp-about">{biz.about}</p>}
            <div className="bp-meta">
              {biz.address && <span><Icon name="pin" size={15} /> {biz.address}</span>}
              <span><Icon name="shield" size={15} /> {fmtMoney(biz.deposit_cents)} deposit · charged only for no-shows</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bp-content">
        {/* 1. Service cards */}
        <div className="card">
          <h2>Choose a service</h2>
          {biz.services.map((s) => (
            <div
              key={s.id}
              className={`svc ${serviceId === s.id ? 'sel' : ''}`}
              onClick={() => setServiceId(s.id)}
            >
              <div>
                <b>{s.name}</b>
                <div className="muted">{s.duration_min} min</div>
              </div>
              <div className="row">
                <b>{fmtMoney(s.price_cents)}</b>
                <span className={`svc-radio ${serviceId === s.id ? 'on' : ''}`} />
              </div>
            </div>
          ))}
        </div>

        {/* 2. Staff chips */}
        {serviceId && (
          <div className="card">
            <h2>Choose your artist</h2>
            <div className="row">
              {biz.staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`chip ${staffId === s.id ? 'sel' : ''}`}
                  onClick={() => setStaffId(s.id)}
                >
                  <span className="chip-avatar">{s.name[0]}</span> {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Date scroller */}
        {staffId && (
          <div className="card">
            <h2>Pick a day</h2>
            <div className="date-scroll">
              {days.map((d) => {
                const closed = !openWeekdays.has(d.weekday);
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
                  <p className="muted">Fully booked that day — try another date.</p>
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
          </div>
        )}

        {/* 4. Summary + details */}
        {slot !== null && (
          <div className="card">
            <div className="bp-summary">
              <b>{service?.name}</b> with {staffMember?.name}
              <br />
              <span className="muted">{date} at {fmtTime(slot)} · {fmtMoney(service?.price_cents || 0)}</span>
            </div>
            <form onSubmit={book}>
              {error && <div className="error">{error}</div>}
              <input
                placeholder="Your name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Mobile number (for reminders)"
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                required
              />
              {biz.square?.connected && (
                <>
                  <label className="muted">Card for the {fmtMoney(biz.deposit_cents)} deposit hold</label>
                  <div id="card-container" style={{ marginBottom: 12 }} />
                </>
              )}
              <button disabled={busy} style={{ width: '100%' }}>
                {busy ? 'Booking…' : `Confirm booking — hold ${fmtMoney(biz.deposit_cents)} deposit`}
              </button>
              <p className="muted" style={{ marginTop: 8 }}>
                Your card is only charged if you miss the appointment without cancelling.
              </p>
            </form>
          </div>
        )}

        {/* Trust row to fill space + reassure customers */}
        <div className="bp-trust">
          <div><span><Icon name="lock" size={22} /></span> Secure card hold</div>
          <div><span><Icon name="bell" size={22} /></span> SMS reminders</div>
          <div><span><Icon name="undo" size={22} /></span> Free cancellation</div>
        </div>
        <p className="bp-powered">Powered by <Icon name="shield" size={13} style={{ verticalAlign: '-2px' }} /> ShowSure</p>
      </div>
    </Shell>
  );
}
