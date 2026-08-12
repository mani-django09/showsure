import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { api, fmtMoney } from '../lib/api';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const SERVICE_OPTS = [
  ['', 'Any service'], ['Manicure', 'Manicure'], ['Lash', 'Lashes'], ['Brow', 'Brows'],
  ['Hair', 'Hair'], ['Haircut', 'Haircut'], ['Makeup', 'Makeup'], ['Facial', 'Facial'],
  ['Massage', 'Massage'], ['Beard', 'Beard trim'],
];

export default function Search() {
  const router = useRouter();
  const [form, setForm] = useState({ service: '', location: '' });
  const [salons, setSalons] = useState(null);
  const [error, setError] = useState('');

  // Sync form from URL and run the search whenever the query changes
  useEffect(() => {
    if (!router.isReady) return;
    const service = router.query.service || '';
    const location = router.query.location || '';
    setForm({ service, location });
    const qs = new URLSearchParams();
    if (service) qs.set('service', service);
    if (location) qs.set('location', location);
    setSalons(null);
    setError('');
    api(`/public/search?${qs.toString()}`)
      .then((d) => setSalons(d.salons))
      .catch((e) => setError(e.message));
  }, [router.isReady, router.query.service, router.query.location]);

  function runSearch(e) {
    e?.preventDefault();
    const qs = new URLSearchParams();
    if (form.service) qs.set('service', form.service);
    if (form.location) qs.set('location', form.location);
    router.push(`/search?${qs.toString()}`);
  }

  return (
    <div className="page-shell">
      <Head>
        <title>Find a salon near you — ShowSure</title>
        <meta name="description" content="Search salons and beauty pros near you and book online in seconds. Your slot is protected with a small deposit — charged only for no-shows." />
        <meta property="og:title" content="Find a salon near you — ShowSure" />
        <meta property="og:description" content="Search and book salons near you. Deposits protect your slot." />
        <meta property="og:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/search" />
      </Head>

      <PublicNav />

      <div className="page-body">
      <h1 className="visually-hidden">Find and book a salon or beauty pro near you</h1>
      <div className="search-bar-wrap">
        <div className="container">
          <form className="search-widget" onSubmit={runSearch}>
            <div className="search-field">
              <label>Service</label>
              <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                {SERVICE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="search-divider" />
            <div className="search-field">
              <label>Location</label>
              <input
                type="text"
                placeholder="City or area"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <button type="submit" className="search-btn">
              <Icon name="search" size={17} style={{ verticalAlign: '-3px', marginRight: 4 }} /> Search
            </button>
          </form>
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}

        {salons === null && !error && <p className="muted">Searching…</p>}

        {salons && (
          <>
            <h2 style={{ marginBottom: 4 }}>
              {salons.length} salon{salons.length === 1 ? '' : 's'}
              {form.location ? ` in “${form.location}”` : ''}
              {form.service ? ` for ${form.service.toLowerCase()}` : ''}
            </h2>
            <p className="muted" style={{ marginBottom: 20 }}>Tap a salon to book. Deposits protect your slot.</p>

            {salons.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div className="empty-icon"><Icon name="search" size={26} /></div>
                <h2>No salons found</h2>
                <p className="muted">Try a different city or service — or, if you run a salon, list yours free.</p>
                <Link href="/signup" className="btn" style={{ marginTop: 12 }}>List your salon free</Link>
              </div>
            ) : (
              <div className="grid3">
                {salons.map((s) => (
                  <Link href={`/s/${s.slug}`} key={s.slug} className="venue-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="venue-photo" style={{ background: 'linear-gradient(135deg,#c084fc,#818cf8)' }}>
                      <span>{s.name[0]}</span>
                    </div>
                    <div className="venue-body">
                      <b>{s.name}</b>
                      {s.address && (
                        <div className="muted" style={{ fontSize: '0.85rem', margin: '2px 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="pin" size={13} /> {s.address}
                        </div>
                      )}
                      <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        {s.services.slice(0, 3).map((svc) => (
                          <span key={svc.name} className="svc-tag">{svc.name} · {fmtMoney(svc.price_cents)}</span>
                        ))}
                      </div>
                      <span className="badge confirmed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="shield" size={12} /> {fmtMoney(s.deposit_cents)} deposit
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>

      <Footer />
    </div>
  );
}
