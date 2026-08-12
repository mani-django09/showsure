// On-brand SVG illustrations (self-contained, gradient-matched to the theme).
// Used across the marketing pages as "images" without external/stock assets.

export function PhoneMockup() {
  return (
    <svg viewBox="0 0 300 560" className="illus" role="img" aria-label="ShowSure booking page on a phone">
      <defs>
        <linearGradient id="bsGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="bsShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#6d28d9" floodOpacity="0.22" />
        </filter>
      </defs>
      {/* Phone body */}
      <rect x="30" y="10" width="240" height="540" rx="36" fill="#fff" filter="url(#bsShadow)" stroke="#e8e6f0" />
      {/* Gradient header */}
      <path d="M30 46 a36 36 0 0 1 36-36 h168 a36 36 0 0 1 36 36 v104 h-240 z" fill="url(#bsGrad)" />
      <circle cx="66" cy="86" r="22" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.4)" />
      <text x="66" y="94" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">G</text>
      <text x="100" y="80" fontSize="15" fontWeight="800" fill="#fff">Glow Studio</text>
      <text x="100" y="100" fontSize="10" fill="rgba(255,255,255,0.9)">Austin, TX · $20 deposit</text>
      <text x="52" y="140" fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.95)">Choose a service</text>
      {/* Service rows */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(52 ${168 + i * 52})`}>
          <rect width="196" height="42" rx="10" fill="#fff" stroke={i === 0 ? '#7c3aed' : '#e8e6f0'} strokeWidth={i === 0 ? 2 : 1} />
          <text x="12" y="18" fontSize="11" fontWeight="700" fill="#17172b">{['Gel Manicure', 'Lash Fill', 'Brow Lamination'][i]}</text>
          <text x="12" y="32" fontSize="9" fill="#6b7280">{['45 min', '60 min', '30 min'][i]}</text>
          <text x="150" y="26" textAnchor="end" fontSize="11" fontWeight="800" fill="#17172b">{['$65', '$75', '$50'][i]}</text>
          <circle cx="180" cy="21" r="6" fill={i === 0 ? '#7c3aed' : 'none'} stroke={i === 0 ? '#7c3aed' : '#cbd5e1'} strokeWidth="2" />
        </g>
      ))}
      {/* Book button */}
      <rect x="52" y="336" width="196" height="40" rx="12" fill="url(#bsGrad)" />
      <text x="150" y="361" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">Confirm booking</text>
      {/* Trust row */}
      {['Secure', 'Reminders', 'Free cancel'].map((t, i) => (
        <g key={t} transform={`translate(${52 + i * 66} 392)`}>
          <rect width="58" height="46" rx="10" fill="#f5f3ff" />
          <circle cx="29" cy="18" r="8" fill="#ede9fe" />
          <path d={i === 0 ? 'M25 18 h8 M25 15 v6 M33 15 v6' : i === 1 ? 'M25 20 q4 -8 8 0' : 'M25 15 q8 0 8 6'} stroke="#7c3aed" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <text x="29" y="40" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#6b7280">{t}</text>
        </g>
      ))}
    </svg>
  );
}

export function DepositShield() {
  return (
    <svg viewBox="0 0 320 260" className="illus" role="img" aria-label="Card deposit protected by a shield">
      <defs>
        <linearGradient id="bsGrad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="bsSh2" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#6d28d9" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Credit card */}
      <g filter="url(#bsSh2)">
        <rect x="40" y="70" width="200" height="126" rx="16" fill="url(#bsGrad2)" transform="rotate(-6 140 133)" />
        <rect x="60" y="108" width="36" height="26" rx="5" fill="rgba(255,255,255,0.85)" transform="rotate(-6 140 133)" />
        <rect x="60" y="158" width="120" height="9" rx="4" fill="rgba(255,255,255,0.75)" transform="rotate(-6 140 133)" />
        <rect x="60" y="172" width="70" height="8" rx="4" fill="rgba(255,255,255,0.5)" transform="rotate(-6 140 133)" />
      </g>
      {/* Shield badge */}
      <g transform="translate(198 120)" filter="url(#bsSh2)">
        <circle r="52" fill="#fff" stroke="#e8e6f0" />
        <path d="M0 -30 L26 -19 V4 C26 22 0 32 0 32 C0 32 -26 22 -26 4 V-19 Z" fill="url(#bsGrad2)" />
        <path d="M-11 2 L-3 10 L13 -8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function SmsReminder() {
  return (
    <svg viewBox="0 0 320 260" className="illus" role="img" aria-label="SMS reminder on a phone">
      <defs>
        <linearGradient id="bsGrad3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="bsSh3" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#6d28d9" floodOpacity="0.2" />
        </filter>
      </defs>
      <rect x="96" y="18" width="128" height="224" rx="24" fill="#fff" filter="url(#bsSh3)" stroke="#e8e6f0" />
      <rect x="96" y="18" width="128" height="40" rx="24" fill="url(#bsGrad3)" />
      <rect x="96" y="40" width="128" height="18" fill="url(#bsGrad3)" />
      <text x="160" y="43" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">Messages</text>
      {/* Incoming bubble */}
      <g transform="translate(108 74)">
        <rect width="96" height="52" rx="12" fill="#f1eefb" />
        <text x="8" y="18" fontSize="7.5" fill="#33324a">Reminder: your appt</text>
        <text x="8" y="30" fontSize="7.5" fill="#33324a">at Glow Studio is</text>
        <text x="8" y="42" fontSize="7.5" fontWeight="700" fill="#6d28d9">tomorrow 3:00 PM</text>
      </g>
      {/* Reply bubble */}
      <g transform="translate(140 138)">
        <rect width="72" height="30" rx="12" fill="url(#bsGrad3)" />
        <text x="36" y="19" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">See you then!</text>
      </g>
      <g transform="translate(108 178)">
        <rect width="60" height="26" rx="12" fill="#f1eefb" />
        <text x="30" y="17" textAnchor="middle" fontSize="7.5" fill="#059669" fontWeight="700">Delivered ✓</text>
      </g>
    </svg>
  );
}
