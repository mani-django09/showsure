import Head from 'next/head';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const STEPS = [
  { icon: 'clock', title: '1. Set up in 10 minutes', body: 'Add your services, staff, working hours and the deposit amount you want to protect each slot (most studios pick $10–$50). No technical setup required, and no card needed to create your account.' },
  { icon: 'link', title: '2. Share your booking link', body: 'You get a clean booking page at a link you can drop into your Instagram bio, Google Business profile, or a QR code at the front desk. Clients book themselves, 24/7 — no more back-and-forth DMs.' },
  { icon: 'lock', title: '3. Clients book with a card hold', body: 'When a client books, we place a hold on their card through your own Square account. Nothing is charged yet — it is a hold, not a payment. Your deposit policy is shown clearly before they confirm.' },
  { icon: 'bell', title: '4. Automatic reminders go out', body: 'A confirmation text is sent instantly, then reminders 24 hours and 2 hours before the appointment. Each includes a one-tap cancel link, so if someone truly can’t make it, the slot frees up in time to rebook.' },
  { icon: 'zap', title: '5. No-show? The deposit is charged', body: 'If a client doesn’t show, you mark it in your dashboard and the deposit is captured automatically into your account. If they show up, the hold is released. Either way, you’re protected — and you never had an awkward money conversation.' },
  { icon: 'star', title: '6. Grow your reputation', body: 'After each completed visit, clients get a friendly nudge to leave a Google review, so your rating climbs on autopilot while you focus on your craft.' },
];

export default function HowItWorks() {
  return (
    <div className="page-shell">
      <Head>
        <title>How ShowSure Works — Stop Salon No-Shows in 6 Steps</title>
        <meta name="description" content="See how ShowSure stops salon no-shows: set up in 10 minutes, collect refundable card deposits, send SMS reminders, and auto-charge no-shows." />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/how-it-works" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="How ShowSure Works — Stop Salon No-Shows in 6 Steps" />
        <meta property="og:description" content="Set up in 10 minutes, collect refundable card deposits, send SMS reminders, and auto-charge no-shows automatically." />
        <meta property="og:url" content="https://frontend-swart-pi-29.vercel.app/how-it-works" />
        <meta property="og:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
      </Head>
      <PublicNav />
      <div className="page-body">
        <div className="container narrow-mid" style={{ paddingTop: 40 }}>
          <span className="eyebrow">How it works</span>
          <h1 style={{ fontSize: '2rem' }}>From no-shows to a protected calendar — in one afternoon</h1>
          <p className="muted" style={{ fontSize: '1.05rem', margin: '8px 0 8px' }}>
            ShowSure turns your booking page into a no-show shield. Here&apos;s exactly what happens,
            step by step.
          </p>
        </div>

        <div className="container narrow-mid">
          {STEPS.map((s) => (
            <div className="card step-card" key={s.title}>
              <div className="step-icon"><Icon name={s.icon} size={22} /></div>
              <div>
                <h3 style={{ marginBottom: 4 }}>{s.title}</h3>
                <p className="muted" style={{ fontSize: '0.95rem' }}>{s.body}</p>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Link href="/signup" className="btn btn-lg">Get started</Link>
            <p className="muted" style={{ marginTop: 8 }}>No card required to sign up · Cancel anytime</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
