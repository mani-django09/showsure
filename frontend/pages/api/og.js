import { ImageResponse } from 'next/og';

export const config = { runtime: 'edge' };

// Dynamic OG/Twitter share image — 1200x630, brand gradient.
// /api/og                                  -> generic ShowSure card
// /api/og?salon=Glow+Studio&deposit=%2420   -> per-salon card (used on /s/[slug])
export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const salon = searchParams.get('salon');
  const deposit = searchParams.get('deposit');

  const titleText = salon ? `Book at ${salon}` : 'Stop losing money to no-shows';
  const titleSize = salon ? (salon.length > 18 ? 52 : 64) : 54;
  const subText = salon
    ? (deposit ? `🛡️ ${deposit} deposit · charged only for no-shows` : '🛡️ Deposit protected · charged only for no-shows')
    : 'Card deposits · SMS reminders · automatic no-show charges';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 55%, #4f46e5 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
            }}
          >
            🛡️
          </div>
          <div style={{ display: 'flex', color: '#fff', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            ShowSure
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: '1000px',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#fff',
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: -1.5,
          }}
        >
          {titleText}
        </div>

        <div
          style={{
            display: 'flex',
            width: '900px',
            justifyContent: 'center',
            textAlign: 'center',
            marginTop: 28,
            color: 'rgba(255,255,255,0.92)',
            fontSize: 28,
            ...(salon ? { background: 'rgba(255,255,255,0.14)', padding: '14px 32px', borderRadius: 999, width: 'auto' } : {}),
          }}
        >
          {subText}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
