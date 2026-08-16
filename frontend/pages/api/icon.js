import { ImageResponse } from 'next/og';

export const config = { runtime: 'edge' };

// Square 1080x1080 profile-photo asset — brand gradient + filled shield mark.
// Kept generous padding around the icon since Instagram/most avatars crop to a circle.
export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 55%, #4f46e5 100%)',
        }}
      >
        <svg width="520" height="520" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 1.5l8.5 3.2v6.4c0 6.1-3.6 10.3-8.5 12.9-4.9-2.6-8.5-6.8-8.5-12.9V4.7L12 1.5z" />
        </svg>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
