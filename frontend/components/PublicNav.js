import Link from 'next/link';
import Icon from './Icon';

// Slim top bar for customer-facing pages (booking, search)
export default function PublicNav() {
  return (
    <nav className="pubnav">
      <div className="pubnav-inner">
        <Link href="/" className="pubnav-brand">
          <span className="mark"><Icon name="shield" size={16} /></span> ShowSure
        </Link>
        <Link href="/signup" className="btn btn-sm">For salons <Icon name="arrow" size={15} style={{ verticalAlign: '-2px' }} /></Link>
      </div>
    </nav>
  );
}
