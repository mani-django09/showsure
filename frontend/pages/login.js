import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { api } from '../lib/api';
import Icon from '../components/Icon';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: form });
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
        <title>Log in — ShowSure</title>
        <meta name="description" content="Log in to your ShowSure dashboard to manage bookings, deposits and reminders." />
        <meta name="robots" content="noindex" />
      </Head>
      <div className="auth-card">
        <Link href="/" className="auth-brand"><span className="mark"><Icon name="shield" size={15} /></span> ShowSure</Link>
        <h1>Welcome back</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Log in to manage your bookings.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button disabled={busy} style={{ width: '100%' }}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p className="muted" style={{ marginTop: 14, textAlign: 'center' }}>
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
