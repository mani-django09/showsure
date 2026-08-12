import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api } from '../../lib/api';
import PublicNav from '../../components/PublicNav';
import Footer from '../../components/Footer';
import Icon from '../../components/Icon';

export default function CancelPage() {
  const { token } = useRouter().query;
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      const res = await api(`/public/cancel/${token}`, { method: 'POST' });
      setStatus(res.status);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <Head>
        <title>Cancel appointment — ShowSure</title>
        <meta name="robots" content="noindex" />
      </Head>
      <PublicNav />
      <div className="page-body">
        <div className="container narrow">
          <div className="card" style={{ marginTop: 60, textAlign: 'center' }}>
            {status === 'cancelled' ? (
              <>
                <div className="empty-icon" style={{ background: '#d1fae5', color: 'var(--success)' }}><Icon name="check" size={26} /></div>
                <h1>Appointment cancelled</h1>
                <p className="muted">Your deposit hold has been released. Hope to see you another time!</p>
              </>
            ) : status ? (
              <>
                <h1>Already {status}</h1>
                <p className="muted">This booking can no longer be cancelled online.</p>
              </>
            ) : (
              <>
                <div className="empty-icon"><Icon name="calendar" size={26} /></div>
                <h1>Cancel your appointment?</h1>
                <p className="muted" style={{ marginBottom: 16 }}>
                  Cancelling now releases your deposit hold — no charge.
                </p>
                {error && <div className="error">{error}</div>}
                <button className="btn-danger" disabled={busy} onClick={cancel}>
                  {busy ? 'Cancelling…' : 'Yes, cancel my appointment'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
