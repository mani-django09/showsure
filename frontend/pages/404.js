import Head from 'next/head';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <div className="page-shell">
      <Head><title>Page not found — ShowSure</title></Head>
      <PublicNav />
      <div className="page-body">
        <div className="container narrow" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="empty-icon"><Icon name="pin" size={26} /></div>
          <h1>Page not found</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/" className="btn">Go home</Link>
            <Link href="/search" className="btn btn-secondary">Find a salon</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
