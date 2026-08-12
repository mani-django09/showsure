import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import { PhoneMockup, DepositShield, SmsReminder } from '../components/Illustrations';

const CATEGORIES = [
  { icon: 'sparkle', name: 'Nails', grad: 'linear-gradient(135deg,#f9a8d4,#c084fc)' },
  { icon: 'eye', name: 'Lashes & Brows', grad: 'linear-gradient(135deg,#a5b4fc,#818cf8)' },
  { icon: 'scissors', name: 'Hair & styling', grad: 'linear-gradient(135deg,#fca5a5,#f472b6)' },
  { icon: 'makeup', name: 'Makeup', grad: 'linear-gradient(135deg,#fda4af,#f43f5e)' },
  { icon: 'face', name: 'Facials & skincare', grad: 'linear-gradient(135deg,#fcd34d,#fbbf24)' },
  { icon: 'leaf', name: 'Massage & Spa', grad: 'linear-gradient(135deg,#6ee7b7,#5eead4)' },
  { icon: 'razor', name: 'Barbering', grad: 'linear-gradient(135deg,#93c5fd,#60a5fa)' },
];

const FEATURES = [
  { icon: 'lock', title: 'Card deposit at booking', desc: 'Clients book with a card hold — not a charge. Serious clients book, tire-kickers don\'t.' },
  { icon: 'zap', title: 'Automatic no-show charges', desc: 'Someone doesn\'t show? The deposit is charged automatically. No awkward phone calls.' },
  { icon: 'message', title: 'SMS reminders that work', desc: 'Confirmation instantly, reminders 24h and 2h before — with a one-tap cancel link so your slot frees up in time.' },
  { icon: 'star', title: 'Review booster', desc: 'After every visit, clients get a text asking for a Google review. Your rating grows on autopilot.' },
  { icon: 'link', title: 'One link for your bio', desc: 'A clean booking page made for Instagram. Add it to your bio and take bookings while you sleep.' },
  { icon: 'wallet', title: 'Your money, your account', desc: 'Deposits go straight to your own Square account. We never hold or touch your money. Zero commission.' },
];

const TESTIMONIALS = [
  { name: 'Bella Nails Studio', city: 'Austin, TX', icon: 'sparkle', grad: 'linear-gradient(135deg,#f9a8d4,#c084fc)', rating: 5, quote: 'No-shows went from 6 a week to almost none. The deposit hold does all the work — I don\'t have to be the bad guy anymore.' },
  { name: 'Lash Lounge by Kim', city: 'Miami, FL', icon: 'eye', grad: 'linear-gradient(135deg,#a5b4fc,#818cf8)', rating: 5, quote: 'Set it up in 10 minutes, put the link in my IG bio, and bookings just come in. The reminders alone paid for it.' },
  { name: 'Fade Room Barbers', city: 'Atlanta, GA', icon: 'razor', grad: 'linear-gradient(135deg,#93c5fd,#60a5fa)', rating: 5, quote: 'Flat price, no commission on my cuts like the other apps. Deposits land in my own Square. Exactly what I wanted.' },
];

const PLANS = [
  { name: 'Starter', price: 29, tagline: 'For solo artists', features: ['1 staff member', 'Unlimited bookings', 'Card deposits + no-show charges', 'SMS reminders'], featured: false },
  { name: 'Pro', price: 59, tagline: 'Most popular', features: ['Up to 5 staff', 'Everything in Starter', 'Google review booster', 'No-show analytics'], featured: true },
  { name: 'Growth', price: 99, tagline: 'For busy studios', features: ['Unlimited staff', 'Everything in Pro', 'Priority support', 'Early access to new features'], featured: false },
];

const FAQS = [
  { q: 'How do salon no-show deposits work?', a: 'When a client books, ShowSure places a hold on their card through your own Square account — no money actually moves. If they show up, the hold is released automatically. If they no-show, the deposit is charged per the policy you set. You decide the amount, from $10 to $50.' },
  { q: 'Is it legal to charge a no-show fee?', a: 'Yes. Charging a no-show or late-cancellation fee is standard practice in the beauty and wellness industry, as long as your policy is clearly shown before booking. ShowSure displays your deposit and policy on the booking page, and every reminder includes a free cancellation link, so clients always have a fair chance to cancel in time.' },
  { q: 'Do you take a cut of my bookings?', a: 'No — zero commission, ever. You pay a flat monthly price and deposits go directly to your Square account. Standard Square card processing fees apply, and those are paid to Square, not to us. Unlike marketplace apps, we never charge a percentage of your new clients.' },
  { q: 'What if a client cancels in time?', a: 'Every confirmation and reminder text includes a one-tap cancel link. If they cancel before your cutoff, the deposit hold is released instantly and the slot opens up for someone else — which is exactly the point.' },
  { q: 'Do my clients need to download an app?', a: 'No. Your booking page is a simple link that works in any browser — perfect for your Instagram bio, Google Business profile, or a QR code at the front desk. Clients book in under a minute, no account required.' },
  { q: 'How is ShowSure different from Fresha or Vagaro?', a: 'ShowSure does one thing extremely well — protecting your calendar from no-shows — without the bloat or the commission. Fresha is free but takes a cut of your new clients; Vagaro is a heavy all-in-one suite. ShowSure is a flat monthly price, zero commission, deposits in your own account, and set up in 10 minutes.' },
  { q: 'How do I stop no-shows at my salon?', a: 'The two things that cut no-shows the most are (1) a required card deposit that gives clients skin in the game, and (2) timely SMS reminders 24 and 2 hours before. ShowSure automates both, which is why salons typically see no-shows drop by more than half.' },
  { q: 'Can I cancel anytime?', a: 'Yes. There\'s no lock-in contract — cancel your subscription whenever you want and you\'ll keep access until the end of your current billing period.' },
];

const COMPARE = [
  { label: 'Flat monthly price', bs: true, fresha: false, vagaro: true, paper: 'n/a' },
  { label: 'Zero commission on your clients', bs: true, fresha: false, vagaro: true, paper: 'n/a' },
  { label: 'Card deposit + auto no-show charge', bs: true, fresha: true, vagaro: true, paper: false },
  { label: 'Deposits land in your own account', bs: true, fresha: false, vagaro: false, paper: 'n/a' },
  { label: 'Automatic SMS reminders', bs: true, fresha: true, vagaro: true, paper: false },
  { label: 'Set up in 10 minutes', bs: true, fresha: false, vagaro: false, paper: true },
];

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState({ service: '', location: '' });

  function runSearch() {
    const qs = new URLSearchParams();
    if (search.service) qs.set('service', search.service);
    if (search.location) qs.set('location', search.location);
    router.push(`/search?${qs.toString()}`);
  }

  return (
    <>
      <Head>
        <title>ShowSure — Salon Booking Software That Stops No-Shows</title>
        <meta name="description" content="Booking software for salons and beauty pros with card deposits, automatic no-show charges and SMS reminders. Flat price, zero commission, cancel anytime." />
        <meta name="keywords" content="salon booking software, stop no-shows, no-show fee, salon deposit, appointment reminders, nail tech booking app, lash artist booking, barber booking software, Fresha alternative, Vagaro alternative" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/" />
        <meta property="og:title" content="ShowSure — Booking software that stops salon no-shows" />
        <meta property="og:description" content="Card deposits + SMS reminders + automatic no-show charges. Deposits go straight to your own account. Flat price, zero commission." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frontend-swart-pi-29.vercel.app/" />
        <meta property="og:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'ShowSure',
            applicationCategory: 'BusinessApplication',
            description: 'Booking software for salons with card deposits, automatic no-show charges and SMS reminders.',
            offers: { '@type': 'Offer', price: '29.00', priceCurrency: 'USD' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '38' },
          }).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }}
        />
      </Head>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <span className="logo"><span className="logo-mark"><Icon name="shield" size={15} /></span> ShowSure</span>
          <div className="row">
            <a href="#categories" className="nav-link">Who it&apos;s for</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <Link href="/login" className="nav-link">Log in</Link>
            <Link href="/signup" className="btn btn-sm">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero — Fresha-style search widget */}
      <header className="hero3">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="pill">For nail techs · lash artists · hair · barbers · spas</div>
          <h1>The booking page your clients love —<br /><span className="accent">and that stops no-shows.</span></h1>
          <p className="sub">Card deposits, SMS reminders and automatic no-show charges. Deposits land in <b>your own account</b> — we never take a cut.</p>

          {/* Real salon search: service + location */}
          <div className="search-widget">
            <div className="search-field">
              <label>Service</label>
              <select value={search.service} onChange={(e) => setSearch({ ...search, service: e.target.value })}>
                <option value="">Any service</option>
                <option value="Manicure">Manicure</option>
                <option value="Lash">Lashes</option>
                <option value="Brow">Brows</option>
                <option value="Hair">Hair</option>
                <option value="Haircut">Haircut</option>
                <option value="Makeup">Makeup</option>
                <option value="Facial">Facial</option>
                <option value="Massage">Massage</option>
                <option value="Beard">Beard trim</option>
              </select>
            </div>
            <div className="search-divider" />
            <div className="search-field">
              <label>Location</label>
              <input
                type="text"
                placeholder="City or area (e.g. Austin)"
                value={search.location}
                onChange={(e) => setSearch({ ...search, location: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </div>
            <button className="search-btn" onClick={runSearch}>
              <Icon name="search" size={17} style={{ verticalAlign: '-3px', marginRight: 4 }} /> Search
            </button>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Find a salon near you and book in seconds — deposits held on your card, charged only if you no-show.
          </p>

          <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
            <Link href="/signup" className="btn btn-lg">Get started</Link>
            <a href="#how" className="btn btn-secondary btn-lg">How it works</a>
          </div>
        </div>
      </header>

      {/* Trust strip */}
      <section className="container">
        <div className="row">
          <div className="stat"><div className="num">-60%</div><div className="muted">typical no-show drop</div></div>
          <div className="stat"><div className="num">0%</div><div className="muted">commission — flat price</div></div>
          <div className="stat"><div className="num">10 min</div><div className="muted">to your first booking link</div></div>
          <div className="stat"><div className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="star" size={20} style={{ color: '#f59e0b' }} /> 4.9</div><div className="muted">loved by beauty pros</div></div>
        </div>
      </section>

      {/* Product showcase — phone mockup + copy */}
      <section className="container">
        <div className="split">
          <div className="split-media">
            <PhoneMockup />
          </div>
          <div className="split-text">
            <span className="eyebrow">Your booking page</span>
            <h2>A booking link so good, clients actually use it</h2>
            <p>
              Share one link in your Instagram bio and let clients book themselves — 24/7, no
              back-and-forth DMs. They pick a service, choose a time, and enter a card to hold their
              spot. It looks professional, works on any phone, and takes them under a minute.
            </p>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> No app for your clients to download</li>
              <li><Icon name="check" size={16} /> Your services, staff, hours and prices</li>
              <li><Icon name="check" size={16} /> Deposit &amp; policy shown up front — no surprises</li>
            </ul>
            <Link href="/signup" className="btn">Build your booking page free</Link>
          </div>
        </div>
      </section>

      {/* The cost of no-shows — problem/agitation */}
      <section className="cost-band">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow" style={{ color: '#fff', opacity: 0.85 }}>The quiet leak</span>
          <h2 style={{ color: '#fff' }}>No-shows cost the average studio <span className="accent-light">$3,000+ a year</span></h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 640, margin: '10px auto 0' }}>
            An empty chair earns nothing — but your rent, products and time still get spent. Two no-shows
            a week at $50 each is over $5,000 gone in a year. A small refundable deposit turns
            &ldquo;maybe I&apos;ll come&rdquo; into a real commitment, and ShowSure collects it automatically so you
            never have to be the bad guy.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 22 }}>
            <div className="cost-stat"><b>2/week</b><span>typical no-shows</span></div>
            <div className="cost-stat"><b>$50+</b><span>lost per empty slot</span></div>
            <div className="cost-stat"><b>-60%</b><span>drop with deposits</span></div>
          </div>
        </div>
      </section>

      {/* Categories showcase */}
      <section className="container" id="categories">
        <h2 className="section-title">Built for every kind of beauty pro</h2>
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <Link href="/signup" key={c.name} className="cat-tile">
              <div className="cat-thumb" style={{ background: c.grad }}><Icon name={c.icon} size={30} /></div>
              <b>{c.name}</b>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container" id="how">
        <h2 className="section-title">How it works</h2>
        <div className="card">
          <ol className="steps">
            <li><b>Set up in 10 minutes</b> — add services, staff and your deposit amount ($10–50, your call).</li>
            <li><b>Share your link</b> — Instagram bio, Google profile, or a QR code at the desk.</li>
            <li><b>Clients book with a card hold</b> — not a charge. It only becomes a charge if they ghost you.</li>
            <li><b>We remind them</b> — 24h and 2h before, with a cancel link so slots free up in time.</li>
            <li><b>No-show? Deposit charged automatically.</b> Showed up? Hold released, and they get a review request after.</li>
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="container">
        <h2 className="section-title">Everything you need, nothing you don&apos;t</h2>
        <div className="grid3">
          {FEATURES.map((f) => (
            <div className="card feature" key={f.title}>
              <div className="feature-icon"><Icon name={f.icon} size={22} /></div>
              <h3>{f.title}</h3>
              <p className="muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deep-dive: deposits */}
      <section className="container">
        <div className="split reverse">
          <div className="split-media"><DepositShield /></div>
          <div className="split-text">
            <span className="eyebrow">No-show protection</span>
            <h2>Deposits that protect your time — without the awkward conversation</h2>
            <p>
              When someone books, ShowSure places a hold on their card through <b>your own Square
              account</b>. Nothing is charged if they show up. If they ghost you, the deposit is captured
              automatically the moment you mark the no-show — no chasing, no confrontation, no lost income.
            </p>
            <p>
              You stay in control: choose your deposit amount, your cancellation window, and which clients
              it applies to. And because the money moves through your account, <b>we never touch a cent of
              it</b>.
            </p>
          </div>
        </div>
      </section>

      {/* Deep-dive: reminders */}
      <section className="container">
        <div className="split">
          <div className="split-media"><SmsReminder /></div>
          <div className="split-text">
            <span className="eyebrow">Automatic reminders</span>
            <h2>Reminders your clients actually read</h2>
            <p>
              Most no-shows aren&apos;t malicious — people just forget. ShowSure sends a friendly text the
              moment they book, then reminders 24 hours and 2 hours before the appointment, each with a
              one-tap cancel link so freed-up slots can be rebooked in time.
            </p>
            <p>
              After the visit, clients get a gentle nudge to leave a Google review — so your reputation
              grows while you focus on the chair in front of you.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="container" id="compare">
        <h2 className="section-title">How ShowSure compares</h2>
        <p className="muted" style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 20px' }}>
          Not another bloated all-in-one suite, and not a marketplace that skims your clients. Just
          focused no-show protection at a flat price.
        </p>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th></th>
                <th className="hi">ShowSure</th>
                <th>Fresha</th>
                <th>Vagaro</th>
                <th>Pen &amp; paper</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label}>
                  <td className="rowlabel">{r.label}</td>
                  {['bs', 'fresha', 'vagaro', 'paper'].map((k) => (
                    <td key={k} className={k === 'bs' ? 'hi' : ''}>
                      {r[k] === true ? <Icon name="check" size={17} className="yes" />
                        : r[k] === false ? <span className="no">—</span>
                        : <span className="na">n/a</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials — Fresha venue-card style */}
      <section className="container">
        <h2 className="section-title">Loved by studios across the US</h2>
        <div className="grid3">
          {TESTIMONIALS.map((t) => (
            <div className="venue-card" key={t.name}>
              <div className="venue-photo" style={{ background: t.grad }}><Icon name={t.icon} size={40} /></div>
              <div className="venue-body">
                <div className="row spread">
                  <b>{t.name}</b>
                  <span className="stars">{'★'.repeat(t.rating)}</span>
                </div>
                <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>📍 {t.city}</div>
                <p style={{ fontSize: '0.92rem' }}>“{t.quote}”</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container" id="pricing">
        <h2 className="section-title">Simple pricing. One saved no-show pays for it.</h2>
        <div className="grid3">
          {PLANS.map((p) => (
            <div className={`card plan ${p.featured ? 'featured' : ''}`} key={p.name}>
              {p.featured && <div className="plan-tag">Most popular</div>}
              <h3>{p.name}</h3>
              <div className="price">${p.price}<span className="muted">/mo</span></div>
              <p className="muted" style={{ marginBottom: 12 }}>{p.tagline}</p>
              <ul className="plan-list">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
              <Link href="/signup" className={`btn ${p.featured ? '' : 'btn-secondary'}`} style={{ width: '100%', textAlign: 'center' }}>Choose {p.name}</Link>
            </div>
          ))}
        </div>
        <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>All plans: unlimited bookings · zero commission · cancel anytime</p>
      </section>

      {/* FAQ */}
      <section className="container narrow-mid" id="faq">
        <h2 className="section-title">Questions salon owners ask us</h2>
        {FAQS.map((f) => (
          <details className="card faq" key={f.q}>
            <summary>{f.q}</summary>
            <p className="muted" style={{ marginTop: 8 }}>{f.a}</p>
          </details>
        ))}
      </section>

      {/* Final CTA */}
      <section className="container" style={{ textAlign: 'center', padding: '40px 16px 60px' }}>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Your next no-show doesn&apos;t have to cost you.</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Set up tonight. Protected by tomorrow&apos;s first appointment.</p>
        <Link href="/signup" className="btn btn-lg">Get started</Link>
      </section>

      <Footer />
    </>
  );
}
