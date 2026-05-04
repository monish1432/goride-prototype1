# GoRide — Product Requirements Document

## Original Problem Statement
Build a full-stack app for **GoRide — A Unified Automobile Transport and Logistics Application**. A dual-sided marketplace that streamlines passenger transportation (bikes, autos, cars, taxis) **and** goods logistics (tempos, trucks) on a single platform. Innovation: zero-visible-commission model — flat ₹1 per completed ride silently deducted via a **Worker Wallet**.

## Architecture (delivered)
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui base + Leaflet (CartoDB Positron tiles) + Sonner toasts
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (collections: `users`, `vehicles`, `rides`, `wallet_txns`)
- **Auth**: mock OTP (`123456`), token = user id sent as `Bearer`
- **Maps**: Leaflet + OpenStreetMap (no API key required)
- **Design**: Swiss / High-Contrast archetype, Outfit (display) + IBM Plex Sans (body), Taxi-Yellow (#FFCC00) accents on near-white surfaces

## User Personas
1. **Customer** — books rides or sends parcels in Bengaluru.
2. **Worker (Driver)** — registers vehicles, goes online, accepts requests, earns; ₹1 fee silently logged in their wallet.
3. **Admin** — oversees marketplace stats, ride log, user roster.

## Core Requirements (static)
- Mock OTP login + role selection
- Six vehicle types with India-context per-km rates
- Distance via Haversine; fare = base + km*rate
- Live ride state machine: searching → assigned → arrived → started → completed (also cancelled)
- Worker wallet auto-debits ₹1 on completion + logs earning txn
- Admin stats incl. platform_revenue (= completed × ₹1) and gross fare
- Mobile-first responsive UI

## What's Implemented (Feb 2026)
- ✅ Marketing landing page (hero, marquee, vehicle catalog, how-it-works, worker-wallet section, CTA)
- ✅ 3-step login: phone → OTP → role
- ✅ Customer dashboard: map + book/track/history tabs, fare estimator, live timeline
- ✅ Worker dashboard: online toggle, vehicle registration & active switching, incoming requests, ride status advance, wallet w/ transaction ledger
- ✅ Admin dashboard: 4 stat cards (auto-refresh 6s), rides table, users table
- ✅ Backend: full REST API (auth/catalog/vehicles/rides/wallet/admin) — 22/22 pytest cases pass
- ✅ End-to-end happy path verified by testing agent

## Backlog
**P1**
- Real SMS OTP (Twilio) to replace mock
- Driver location simulation (animated marker on map during active ride)
- Customer rating & feedback after ride

**P2**
- Real-time updates via WebSocket (replace 3-4 s polling)
- Razorpay/Stripe wallet top-up for workers
- Push notifications
- Geocoding of free-text addresses (replace preset Bengaluru list)
- Document upload (DL/RC images) with object storage
- Multi-city expansion + dynamic pickup/drop drag pins
- Surge pricing logic during peak hours

## Next Tasks
1. Add ride-rating module (1-5★ + comment)
2. Animate driver pin moving from pickup to drop during 'started' status
3. Add filter & search to admin tables (by status / role / date)
