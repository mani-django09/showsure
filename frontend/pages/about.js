import Head from 'next/head';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';

export default function About() {
  return (
    <div className="page-shell">
      <Head>
        <title>About ShowSure — No-Show Protection for Beauty Pros</title>
        <meta name="description" content="ShowSure helps independent salons and beauty pros stop losing money to no-shows — with fair deposits, honest flat pricing, and zero commission." />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About ShowSure — No-Show Protection for Beauty Pros" />
        <meta property="og:description" content="We built ShowSure so independent beauty pros stop losing money to no-shows — fair deposits, flat pricing, zero commission." />
        <meta property="og:url" content="https://frontend-swart-pi-29.vercel.app/about" />
        <meta property="og:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://frontend-swart-pi-29.vercel.app/api/og" />
      </Head>
      <PublicNav />
      <div className="page-body">
        <div className="container narrow-mid" style={{ paddingTop: 40 }}>
          <span className="eyebrow">Our story</span>
          <h1 style={{ fontSize: '2rem' }}>We built ShowSure for the chair that earns nothing</h1>

          <div className="legal" style={{ padding: '20px 0' }}>
            <p>
              Every no-show is more than a missed appointment — it&apos;s rent that still has to be paid,
              product that was prepped, and time that can never be sold again. For an independent beauty
              professional, a couple of no-shows a week can quietly erase thousands of dollars a year.
            </p>
            <p>
              The big booking apps either bury this problem inside a bloated, expensive suite, or they&apos;re
              &ldquo;free&rdquo; because they quietly take a cut of your hard-won clients. We thought there should be a
              simpler, fairer option: a tool that does one job — protecting your calendar — brilliantly,
              at a price you can predict, with your money staying in your own account.
            </p>
            <p>
              So we built ShowSure. A beautiful booking link, refundable card deposits, automatic SMS
              reminders, and one-tap no-show charges — set up in about ten minutes. No commission on your
              bookings. No holding your money. No pressure.
            </p>
            <p>
              We&apos;re a small, independent team that believes the people who make others look and feel their
              best deserve software that respects their time and their income. That&apos;s the whole idea.
            </p>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
            <Link href="/signup" className="btn btn-lg">Join us — start free</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
