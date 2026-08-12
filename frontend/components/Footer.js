import Link from 'next/link';
import Icon from './Icon';

// Shared site footer used across public pages
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="sf-brand">
          <div className="sf-logo"><span className="mark"><Icon name="shield" size={16} /></span> ShowSure</div>
          <p className="muted">Stop losing money to no-shows. Booking with deposits, reminders & review boosting — for salons, nail techs, lash artists & barbers.</p>
        </div>
        <div className="sf-cols">
          <div className="sf-col">
            <h4>Product</h4>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/search">Find a salon</Link>
          </div>
          <div className="sf-col">
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/signup">Get started</Link>
          </div>
          <div className="sf-col">
            <h4>Legal</h4>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} ShowSure</span>
        <span className="muted">Deposits stay in your own account · Zero commission · Made for independent beauty pros</span>
      </div>
    </footer>
  );
}
