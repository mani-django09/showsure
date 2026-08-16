import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Icon from '../components/Icon';

// Admin console for curating the public salon directory.
// The secret is kept in sessionStorage only — it is never written to a cookie
// or the URL, so it doesn't leak via history or referrers.
const KEY = 'ss_admin_secret';

const STATUS_LABEL = { approved: 'Listed', pending: 'Pending', rejected: 'Rejected' };

export default function Admin() {
  const [secret, setSecret] = useState('');
  const [input, setInput] = useState('');
  const [businesses, setBusinesses] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY);
    if (saved) setSecret(saved);
  }, []);

  const load = useCallback(async (s) => {
    setError('');
    try {
      const res = await fetch('/api/admin/businesses', { headers: { 'x-admin-secret': s } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setBusinesses(data.businesses);
      sessionStorage.setItem(KEY, s);
    } catch (e) {
      setError(e.message);
      setBusinesses(null);
      if (/unauthor/i.test(e.message)) { sessionStorage.removeItem(KEY); setSecret(''); }
    }
  }, []);

  useEffect(() => { if (secret) load(secret); }, [secret, load]);

  async function setStatus(id, status) {
    setBusy(`${id}:${status}`);
    setError('');
    try {
      const res = await fetch(`/api/admin/businesses/${id}/directory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      await load(secret);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  if (!secret) {
    return (
      <>
        <Head><title>Admin — ShowSure</title><meta name="robots" content="noindex" /></Head>
        <div className="container narrow" style={{ paddingTop: 60 }}>
          <div className="card">
            <h2 style={{ marginBottom: 6 }}>Admin access</h2>
            <p className="muted" style={{ marginBottom: 14 }}>Enter the admin secret to curate the salon directory.</p>
            {error && <div className="error">{error}</div>}
            <input
              type="password"
              placeholder="Admin secret"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && input && setSecret(input)}
            />
            <button className="btn" style={{ width: '100%' }} onClick={() => input && setSecret(input)}>
              Unlock
            </button>
          </div>
        </div>
      </>
    );
  }

  const pending = (businesses || []).filter((b) => b.directory_status === 'pending');

  return (
    <>
      <Head><title>Admin — ShowSure</title><meta name="robots" content="noindex" /></Head>

      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <span className="mark"><Icon name="shield" size={18} /></span>
            <span className="name">Directory admin<small>ShowSure</small></span>
          </div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => { sessionStorage.removeItem(KEY); setSecret(''); setBusinesses(null); }}
          >
            Lock
          </button>
        </div>
      </header>

      <div className="container">
        {error && <div className="error">{error}</div>}

        <div className="card">
          <h2 style={{ marginBottom: 6 }}>
            Salons {businesses ? `(${businesses.length})` : ''}
            {pending.length > 0 && <span className="badge no_show" style={{ marginLeft: 8 }}>{pending.length} pending</span>}
          </h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Only <b>Listed</b> salons appear in public search — and only if they also have an active
            subscription, an address, services, staff and hours. <b>Ready</b> shows whether those are met.
          </p>

          {!businesses ? (
            <p className="muted">Loading…</p>
          ) : businesses.length === 0 ? (
            <p className="muted">No salons have signed up yet.</p>
          ) : (
            <div className="compare-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Salon</th><th>Address</th><th>Setup</th><th>Plan</th>
                    <th>Ready</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <b>{b.name}</b>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>{b.email}</div>
                        <a className="muted" style={{ fontSize: '0.82rem' }} href={`/s/${b.slug}`} target="_blank" rel="noreferrer">/s/{b.slug} ↗</a>
                      </td>
                      <td className="muted" style={{ fontSize: '0.85rem' }}>{b.address || <i>none</i>}</td>
                      <td className="muted" style={{ fontSize: '0.85rem' }}>
                        {b.services} svc · {b.staff} staff · {b.hours} days
                        <div>{b.bookings} bookings</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {b.plan}
                        <div className="muted">{b.subscription_active ? 'active' : b.subscription_status}</div>
                        <div className="muted">{b.square_connected ? '✓ Square' : 'no Square'}</div>
                      </td>
                      <td>
                        {b.listing_ready
                          ? <span className="badge completed">Ready</span>
                          : <span className="badge cancelled">Not ready</span>}
                      </td>
                      <td>
                        <span className={`badge ${b.directory_status === 'approved' ? 'confirmed' : b.directory_status === 'rejected' ? 'no_show' : 'cancelled'}`}>
                          {STATUS_LABEL[b.directory_status] || b.directory_status}
                        </span>
                      </td>
                      <td>
                        <div className="row">
                          {b.directory_status !== 'approved' && (
                            <button className="btn-success btn-sm" disabled={!!busy} onClick={() => setStatus(b.id, 'approved')}>
                              {busy === `${b.id}:approved` ? '…' : 'List'}
                            </button>
                          )}
                          {b.directory_status !== 'rejected' && (
                            <button className="btn-danger btn-sm" disabled={!!busy} onClick={() => setStatus(b.id, 'rejected')}>
                              {busy === `${b.id}:rejected` ? '…' : 'Reject'}
                            </button>
                          )}
                          {b.directory_status !== 'pending' && (
                            <button className="btn-secondary btn-sm" disabled={!!busy} onClick={() => setStatus(b.id, 'pending')}>
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
