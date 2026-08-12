import Head from 'next/head';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';

const UPDATED = 'July 4, 2026';
const CONTACT = 'support@showsure.app'; // TODO: update to your real support email/domain

export default function Terms() {
  return (
    <div className="page-shell">
      <Head>
        <title>Terms of Service — ShowSure</title>
        <meta name="description" content="ShowSure Terms of Service — subscriptions, no-show deposits via your own Square account, SMS messaging consent and acceptable use." />
        <link rel="canonical" href="https://frontend-swart-pi-29.vercel.app/terms" />
      </Head>
      <PublicNav />

      <div className="page-body">
        <div className="legal">
          <div className="legal-head">
            <h1>Terms of Service</h1>
            <div className="legal-updated">Last updated: {UPDATED}</div>
          </div>

          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of ShowSure
            (&ldquo;ShowSure&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), a software service that lets salons and independent
            beauty professionals (&ldquo;you&rdquo;, &ldquo;the business&rdquo;) take online bookings, collect
            refundable no-show deposits, and send appointment reminders. By creating an account or
            using the service, you agree to these Terms.
          </p>

          <h2><span className="n">1.</span>The service</h2>
          <p>
            ShowSure provides a booking page, calendar, client records, automated SMS reminders,
            and no-show deposit tooling. We are a software provider only. We do not provide beauty
            services and are not a party to the appointment between a business and its customers.
          </p>

          <h2><span className="n">2.</span>Accounts</h2>
          <p>
            You must provide accurate information and are responsible for activity under your account
            and for keeping your password secure. You must be at least 18 years old and authorized to
            act for the business you register.
          </p>

          <h2><span className="n">3.</span>Subscriptions &amp; billing</h2>
          <ul>
            <li>New accounts include a 14-day free trial. No card is required to start.</li>
            <li>Paid plans are billed monthly through our payment provider, Lemon Squeezy, which acts
              as the merchant of record for your subscription.</li>
            <li>You can cancel anytime; access continues until the end of the current billing period.
              Fees already paid are non-refundable except where required by law.</li>
            <li>If your trial ends or a subscription lapses, online bookings for your page are paused
              until you subscribe.</li>
          </ul>

          <h2><span className="n">4.</span>Deposits &amp; customer payments</h2>
          <p>
            No-show deposits are processed through <strong>your own connected Square account</strong>.
            ShowSure never holds, receives, or transfers your customers&rsquo; funds. You set your own
            deposit amount and no-show policy and are solely responsible for applying it fairly and
            lawfully, for any refunds, and for resolving disputes with your customers. Card processing
            fees are charged by Square, not by us.
          </p>

          <h2><span className="n">5.</span>SMS messaging</h2>
          <p>
            The service sends transactional text messages (booking confirmations, reminders, no-show
            notices, and review requests) to phone numbers entered during booking. By booking, a
            customer consents to receive these messages; standard carrier rates may apply. Recipients
            can reply STOP to opt out. You agree not to use ShowSure to send marketing or
            promotional texts without proper consent.
          </p>

          <h2><span className="n">6.</span>Acceptable use</h2>
          <p>You agree not to misuse the service, including: uploading unlawful content, infringing
            others&rsquo; rights, attempting to breach security, or using the service to harass or defraud
            anyone. We may suspend accounts that violate these Terms.</p>

          <h2><span className="n">7.</span>Intellectual property</h2>
          <p>ShowSure and its software remain our property. You retain ownership of the business
            and customer data you enter, and you grant us the limited rights needed to operate the
            service for you.</p>

          <h2><span className="n">8.</span>Disclaimers</h2>
          <p>The service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee
            that reminders or deposit charges will always succeed, or that the service will be
            uninterrupted or error-free.</p>

          <h2><span className="n">9.</span>Limitation of liability</h2>
          <p>To the maximum extent permitted by law, ShowSure will not be liable for indirect or
            consequential damages, or for lost revenue, missed appointments, or amounts related to
            deposits. Our total liability for any claim is limited to the fees you paid us in the
            three months before the claim.</p>

          <h2><span className="n">10.</span>Termination</h2>
          <p>You may stop using the service and delete your account at any time. We may suspend or
            terminate access for violations of these Terms.</p>

          <h2><span className="n">11.</span>Changes</h2>
          <p>We may update these Terms; material changes will be posted here with a new date. Continued
            use after changes means you accept them.</p>

          <h2><span className="n">12.</span>Contact</h2>
          <p>Questions about these Terms? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
