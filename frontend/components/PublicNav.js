import Link from 'next/link';
import Icon from './Icon';

// Shared top bar for every public-facing page (home, about, pricing, booking, search…)
// so the header never changes when navigating between pages.
export default function PublicNav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          <span className="logo-mark"><Icon name="shield" size={15} /></span> ShowSure
        </Link>
        <div className="row">
          <Link href="/#categories" className="nav-link">Who it&apos;s for</Link>
          <Link href="/#pricing" className="nav-link">Pricing</Link>
          <Link href="/#faq" className="nav-link">FAQ</Link>
          <Link href="/login" className="nav-link">Log in</Link>
          <Link href="/signup" className="btn btn-sm">Start free</Link>
        </div>
      </div>
    </nav>
  );
}
