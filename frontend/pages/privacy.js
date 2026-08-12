import Head from 'next/head';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';

const UPDATED = 'July 4, 2026';
const CONTACT = 'support@showsure.app'; // TODO: update to your real support email/domain

export default function Privacy() {
  return (
    <div className="page-shell">
      <Head>
        <title>Privacy Policy — ShowSure</title>
        <meta name="description" content="How ShowSure collects, uses and protects business and booking data, including phone numbers used only for transactional SMS — never sold or shared." />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/privacy" />
      </Head>
      <PublicNav />

      <div className="page-body">
        <div className="legal">
          <div className="legal-head">
            <h1>Privacy Policy</h1>
            <div className="legal-updated">Last updated: {UPDATED}</div>
          </div>

          <p>
            This Privacy Policy explains how ShowSure (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and
            protects information when salons use our booking software and when their customers book
            appointments through a ShowSure booking page.
          </p>

          <h2><span className="n">1.</span>Information we collect</h2>
          <ul>
            <li><strong>Business account data:</strong> salon name, email, password (hashed), address,
              business hours, services, and staff you add.</li>
            <li><strong>Customer booking data:</strong> the name, phone number, and appointment details
              a customer provides when booking. The business enters or collects this to run its
              appointments.</li>
            <li><strong>Payment metadata:</strong> we do not store card numbers. Card details are
              tokenized directly by Square (deposits) and Lemon Squeezy (subscriptions). We store only
              identifiers such as a payment/subscription ID and status.</li>
            <li><strong>Usage &amp; technical data:</strong> log data such as IP address and basic
              activity needed to operate and secure the service.</li>
          </ul>

          <h2><span className="n">2.</span>How we use information</h2>
          <ul>
            <li>To provide the booking, calendar, deposit, and reminder features.</li>
            <li>To send transactional SMS (confirmations, reminders, no-show notices, review requests).</li>
            <li>To process subscriptions and prevent fraud and abuse.</li>
            <li>To support you and improve the service.</li>
          </ul>

          <h2><span className="n">3.</span>SMS &amp; phone numbers</h2>
          <div className="callout">
            Phone numbers collected for appointments are used <strong>only</strong> to send that
            booking&rsquo;s transactional messages. We do <strong>not</strong> sell phone numbers or share
            them for third-party marketing. Recipients can reply STOP to opt out of messages at any
            time.
          </div>

          <h2><span className="n">4.</span>Service providers we share data with</h2>
          <p>We share the minimum data needed with trusted providers who process it on our behalf:</p>
          <ul>
            <li><strong>Square</strong> — processes no-show deposits on the salon&rsquo;s own account.</li>
            <li><strong>Lemon Squeezy</strong> — processes salon subscription payments (merchant of record).</li>
            <li><strong>Twilio</strong> — delivers SMS messages.</li>
            <li><strong>Hosting/infrastructure</strong> — runs our servers and database.</li>
          </ul>
          <p>We do not sell your personal information.</p>

          <h2><span className="n">5.</span>Cookies</h2>
          <p>We use a small amount of local storage to keep businesses logged in. We do not use
            third-party advertising cookies.</p>

          <h2><span className="n">6.</span>Data retention</h2>
          <p>We keep account and booking data for as long as your account is active and as needed to
            provide the service. You can request deletion of your account and associated data.</p>

          <h2><span className="n">7.</span>Security</h2>
          <p>Passwords are hashed, card data never touches our servers, and access is restricted. No
            system is perfectly secure, but we take reasonable measures to protect your data.</p>

          <h2><span className="n">8.</span>Your rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting
            us. Salon customers should contact the salon they booked with, or us, to exercise these
            rights.</p>

          <h2><span className="n">9.</span>Children</h2>
          <p>ShowSure is intended for businesses and adults. It is not directed at children under 16.</p>

          <h2><span className="n">10.</span>Changes</h2>
          <p>We may update this policy; changes will be posted here with a new date.</p>

          <h2><span className="n">11.</span>Contact</h2>
          <p>Privacy questions? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
