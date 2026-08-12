# BookShield — No-Show Protection for US Salons

SaaS: booking page + card-on-file deposit + SMS reminders + no-show auto-charge + review booster.

**Business model:** $29–99/mo subscription (via Lemon Squeezy / Dodo — Merchant of Record, no Stripe, works from India).
**Deposits:** each salon connects their OWN Square account (OAuth) — money never touches us.

## Stack

- `backend/` — Node + Express + SQLite (better-sqlite3), JWT auth
- `frontend/` — Next.js (pages router)
- SMS — Twilio (dev mode: logs to console until creds added)
- Deposits — Square stubs in `backend/lib/deposits.js` (dev mode: simulated holds)

## Run (dev)

```bash
# backend (port 5055)
cd backend
npm install
npm run dev

# frontend (port 3001)
cd frontend
npm install
npm run dev
```

Open http://localhost:3001 — sign up a salon, add services/staff in dashboard, then open your public booking page at `/s/<your-slug>`.

## Env vars (backend/.env)

See `backend/.env.example`. Everything works WITHOUT env vars in dev mode (SMS + deposits are simulated and logged).

## Go-live checklist

1. **Twilio** (code DONE — just add creds): buy US number, set `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`
   in `.env`. REQUIRED: **A2P 10DLC registration** (Twilio console → Messaging → Regulatory
   compliance) — takes 1–3 weeks, start early. Without creds SMS logs to console (dev mode).
2. **Square** (code DONE — just add keys): developer.squareup.com → create app →
   set `SQUARE_APP_ID/APP_SECRET`, register OAuth redirect `{BACKEND_PUBLIC_URL}/api/square/callback`.
   Test with `SQUARE_ENV=sandbox` + Square test cards, then flip to `production`.
   Salon connects via dashboard → Setup → "Connect Square account".
3. Lemon Squeezy / Dodo: subscription checkout + webhook → set `businesses.plan`
4. Deploy on VPS with pm2 (same pattern as smallpdf), Postgres later if needed

## Roadmap (v1 scope — keep it small)

- [x] Auth (salon signup/login)
- [x] Services / staff / hours / deposit amount setup
- [x] Public booking page with live availability (Fresha-style) + salon search
- [x] Deposit hold on booking — **real Square when connected**, simulated in dev
- [x] SMS: confirmation, 24h + 2h reminders, no-show charge notice, review request (Twilio-ready, E.164)
- [x] Dashboard: tabs (Today / Calendar / Clients CRM / Setup), per-staff stats
- [x] Square OAuth (connect / callback / disconnect / token auto-refresh)
- [x] Square Web Payments SDK card field on booking page (tokenized client-side)
- [ ] Twilio 10DLC registration (manual, console)
- [ ] Lemon Squeezy subscription gating
- [ ] Deploy
