import Head from 'next/head';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const EMAIL = 'support@showsure.app'; // TODO: update to your real support email

export default function Contact() {
  return (
    <div className="page-shell">
      <Head>
        <title>Contact ShowSure — We&apos;re Here to Help</title>
        <meta name="description" content="Questions about ShowSure? Get in touch with our team about setup, deposits, billing or anything else. We usually reply within one business day." />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact ShowSure" />
        <meta property="og:description" content="Questions about setup, deposits or billing? Get in touch — we usually reply within one business day." />
        <meta property="og:url" content="https://frontend-swart-pi-29.vercel.app/contact" />
        <meta property="og:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
      </Head>
      <PublicNav />
      <div className="page-body">
        <div className="container narrow" style={{ paddingTop: 48, textAlign: 'center' }}>
          <div className="empty-icon"><Icon name="message" size={26} /></div>
          <h1>Get in touch</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            Whether you&apos;re setting up your booking page, connecting payments, or just weighing it up —
            we&apos;re happy to help. We usually reply within one business day.
          </p>
          <div className="card" style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: 10 }}>Email us</h3>
            <p style={{ marginBottom: 14 }}>
              <a href={`mailto:${EMAIL}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>{EMAIL}</a>
            </p>
            <h3 style={{ marginBottom: 10 }}>Popular topics</h3>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> Setting up your services, staff and hours</li>
              <li><Icon name="check" size={16} /> Connecting Square for deposits</li>
              <li><Icon name="check" size={16} /> Billing, plans and cancellations</li>
              <li><Icon name="check" size={16} /> Toll-free SMS and reminders</li>
            </ul>
            <a href={`mailto:${EMAIL}`} className="btn" style={{ marginTop: 8 }}>Send us an email</a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
