// Recreates the "Bella Lash & Nail Studio" demo salon on the LIVE Render backend.
// Run this any time before a sales call/DM if the free-tier data has reset:
//
//   node seed-demo.js
//
// Live demo URL after running:  https://frontend-swart-pi-29.vercel.app/s/bella-lash-nail-studio
// Dashboard login:              demo@showsure.app / DemoSalon2026

const BASE = 'https://showsure.onrender.com/api';
const CREDS = { name: 'Bella Lash & Nail Studio', email: 'demo@showsure.app', password: 'DemoSalon2026' };

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

(async () => {
  // Sign up (or log in if it already exists from a previous run)
  let auth = await api('/auth/signup', { method: 'POST', body: CREDS });
  if (!auth.token) {
    auth = await api('/auth/login', { method: 'POST', body: { email: CREDS.email, password: CREDS.password } });
  }
  if (!auth.token) { console.error('Could not create or log into demo account:', auth); process.exit(1); }
  const token = auth.token;
  console.log('✓ Demo account ready, slug:', auth.slug);

  await api('/me', { method: 'PATCH', token, body: {
    about: 'Award-winning lash & nail studio in Austin, TX. Loved for our precision lash sets and long-lasting gel manicures.',
    address: '412 Congress Ave, Austin, TX',
    deposit_cents: 2500,
    google_review_url: 'https://g.page/r/example/review',
  } });
  console.log('✓ Profile set');

  const services = [
    { name: 'Classic Lash Set', duration_min: 90, price_cents: 12000 },
    { name: 'Lash Fill', duration_min: 60, price_cents: 7500 },
    { name: 'Gel Manicure', duration_min: 45, price_cents: 5500 },
    { name: 'Brow Lamination', duration_min: 30, price_cents: 5000 },
  ];
  for (const s of services) await api('/services', { method: 'POST', token, body: s });
  console.log('✓', services.length, 'services added');

  const staff = ['Bella', 'Maria'];
  for (const name of staff) await api('/staff', { method: 'POST', token, body: { name } });
  console.log('✓', staff.length, 'staff added');

  await api('/hours', { method: 'PUT', token, body: { hours: [
    { weekday: 2, open_min: 600, close_min: 1140 }, // Tue 10-19
    { weekday: 3, open_min: 600, close_min: 1140 },
    { weekday: 4, open_min: 600, close_min: 1140 },
    { weekday: 5, open_min: 600, close_min: 1140 },
    { weekday: 6, open_min: 600, close_min: 960 },  // Sat 10-16
  ] } });
  console.log('✓ Hours set (Tue–Sat)');

  console.log('\n🎉 Demo salon ready:');
  console.log('   Booking page: https://frontend-swart-pi-29.vercel.app/s/' + auth.slug);
  console.log('   Dashboard:    https://frontend-swart-pi-29.vercel.app/dashboard');
  console.log('   Login:        ' + CREDS.email + ' / ' + CREDS.password);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
