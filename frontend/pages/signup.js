import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { api } from '../lib/api';
import Icon from '../components/Icon';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api('/auth/signup', { method: 'POST', body: form });
      localStorage.setItem('bs_token', token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Head>
        <title>Start your free trial — ShowSure</title>
        <meta name="description" content="Create your ShowSure account — booking page with card deposits, SMS reminders and automatic no-show protection. 14-day free trial, no card required." />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/signup" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Start your free trial — ShowSure" />
        <meta property="og:description" content="Booking page with card deposits, SMS reminders and no-show protection. 14-day free trial, no card required." />
        <meta property="og:url" content="https://frontend-swart-pi-29.vercel.app/signup" />
        <meta property="og:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
      </Head>
      <div className="auth-card">
        <Link href="/" className="auth-brand"><span className="mark"><Icon name="shield" size={15} /></span> ShowSure</Link>
        <h1>Start protecting your calendar</h1>
        <p className="muted" style={{ marginBottom: 18 }}>14-day free trial · no card required.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <input
            placeholder="Salon name (e.g. Glow Studio)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button disabled={busy} style={{ width: '100%' }}>{busy ? 'Creating…' : 'Create free account'}</button>
        </form>
        <p className="muted" style={{ marginTop: 14, textAlign: 'center' }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
