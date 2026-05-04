import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Bike, Car, Truck, Wallet, MapPin, Sparkles, ShieldCheck, Zap, Building2,
} from "lucide-react";
import TopBar from "../components/TopBar";

const Pill = ({ children }) => (
  <span className="gr-pill bg-neutral-900 text-[#FFCC00]">
    <span className="status-dot inline-block w-1.5 h-1.5 rounded-full bg-[#FFCC00]" />
    {children}
  </span>
);

const VehicleCard = ({ icon, name, rate, tag }) => (
  <div className="gr-card p-5 flex items-center justify-between hover:border-neutral-900 transition">
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 font-semibold">{tag}</div>
      <div className="font-display text-2xl font-bold mt-1">{name}</div>
      <div className="text-sm text-neutral-600 mt-1">From <span className="font-semibold text-neutral-900">{rate}</span></div>
    </div>
    <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center">{icon}</div>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] blob-yellow pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <Pill>Beta · One app · Six vehicles</Pill>
            <h1 className="font-display mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.02]">
              Book the ride.<br />
              Send the parcel.<br />
              <span className="bg-[#FFCC00] px-2 -mx-1 inline-block">One app for it all.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-700 max-w-xl leading-relaxed">
              GoRide unifies bikes, autos, cars, taxis, tempos and trucks on a single platform —
              with a <span className="font-semibold text-neutral-900">zero-visible commission</span> model that puts more in every driver's pocket.
            </p>
            <div className="mt-8 flex flex-wrap gap-3" data-testid="landing-cta-row">
              <Link to="/login" className="gr-cta text-base" data-testid="landing-get-started">
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how" className="gr-ghost">How it works</a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-neutral-600">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> OTP-secured login</div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-600" /> Real-time tracking</div>
              <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-neutral-700" /> ₹1 flat platform fee</div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="gr-card p-1.5 shadow-sm">
              <img
                src="https://images.pexels.com/photos/35755244/pexels-photo-35755244.jpeg"
                alt="Indian autos lined up"
                className="w-full h-[420px] object-cover rounded-xl"
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="gr-card p-4">
                <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Rides</div>
                <div className="font-display text-2xl font-extrabold">6 types</div>
              </div>
              <div className="gr-card p-4">
                <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Fee</div>
                <div className="font-display text-2xl font-extrabold">₹1 flat</div>
              </div>
              <div className="gr-card p-4">
                <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Coverage</div>
                <div className="font-display text-2xl font-extrabold">BLR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="border-y border-neutral-200 bg-neutral-900 text-[#FFCC00] overflow-hidden">
        <div className="flex marquee-track whitespace-nowrap py-3 font-display font-bold text-lg tracking-tight">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span>UNIFIED MOBILITY</span><span>·</span>
              <span>RIDES + LOGISTICS</span><span>·</span>
              <span>ZERO-VISIBLE COMMISSION</span><span>·</span>
              <span>WORKER WALLET</span><span>·</span>
              <span>OTP SECURE</span><span>·</span>
              <span>LIVE TRACKING</span><span>·</span>
            </div>
          ))}
        </div>
      </div>

      {/* VEHICLES */}
      <section id="vehicles" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold">Catalog</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-2">Six vehicles. One booking flow.</h2>
          </div>
          <p className="text-neutral-600 max-w-md">From a quick bike sprint across Indiranagar to a full truck shift across town — GoRide picks the right wheels for every job.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          <VehicleCard tag="Passenger" name="Bike"  rate="₹18/km" icon={<Bike className="w-7 h-7" />} />
          <VehicleCard tag="Passenger" name="Auto"  rate="₹22/km" icon={<span className="text-2xl">🛺</span>} />
          <VehicleCard tag="Passenger" name="Car"   rate="₹30/km" icon={<Car className="w-7 h-7" />} />
          <VehicleCard tag="Passenger" name="Taxi"  rate="₹35/km" icon={<span className="text-2xl">🚕</span>} />
          <VehicleCard tag="Logistics" name="Tempo" rate="₹40/km" icon={<span className="text-2xl">🛻</span>} />
          <VehicleCard tag="Logistics" name="Truck" rate="₹60/km" icon={<Truck className="w-7 h-7" />} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-neutral-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-xs uppercase tracking-[0.2em] text-[#FFCC00] font-semibold">How it works</div>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight mt-3">
              Three taps.<br />Wheels at your door.
            </h2>
            <p className="mt-5 text-neutral-300 max-w-md">
              Whether you're hailing a ride or hauling a fridge, the GoRide flow is the same:
              pick where, pick what, and we'll match you in seconds.
            </p>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-4">
            {[
              { n: "01", t: "Pick locations", d: "Tap pickup & drop on the map. We sort the route." , Icon: MapPin },
              { n: "02", t: "Choose vehicle", d: "Bike to truck — see fare upfront, no surprises.", Icon: Sparkles },
              { n: "03", t: "Track live",     d: "Real-time status from request → ride complete.",  Icon: Zap },
            ].map(({ n, t, d, Icon }) => (
              <div key={n} className="border border-neutral-800 rounded-2xl p-6 hover:border-[#FFCC00] transition">
                <Icon className="w-6 h-6 text-[#FFCC00]" />
                <div className="font-display text-4xl font-extrabold mt-6">{n}</div>
                <div className="font-display text-xl font-bold mt-3">{t}</div>
                <div className="text-sm text-neutral-400 mt-2 leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKER WALLET */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6">
          <img
            src="https://images.pexels.com/photos/7363095/pexels-photo-7363095.jpeg"
            alt="Driver smiling"
            className="rounded-2xl w-full h-[460px] object-cover border border-neutral-200"
          />
        </div>
        <div className="lg:col-span-6">
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold">Driver-first</div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight mt-3">
            Earn 100%.<br />Pay <span className="bg-[#FFCC00] px-2 inline-block">just ₹1</span>.
          </h2>
          <p className="mt-5 text-lg text-neutral-700 leading-relaxed max-w-lg">
            No 20-30% commissions. No murky deductions. Every completed ride contributes a flat
            ₹1 to platform upkeep — visible to you in your <span className="font-semibold">Worker Wallet</span>, never hidden.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="gr-card p-5">
              <Wallet className="w-5 h-5 text-neutral-700" />
              <div className="font-display text-2xl font-bold mt-3">Transparent ledger</div>
              <div className="text-sm text-neutral-600 mt-1">Every paisa accounted for, in real time.</div>
            </div>
            <div className="gr-card p-5">
              <Building2 className="w-5 h-5 text-neutral-700" />
              <div className="font-display text-2xl font-bold mt-3">Multi-vehicle</div>
              <div className="text-sm text-neutral-600 mt-1">Switch between truck and bike without re-onboarding.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#FFCC00] py-20 text-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight max-w-xl">
              Ready to ride? Or to drive?
            </h2>
            <p className="mt-3 text-neutral-800 max-w-md">Hop in as a Customer, Worker, or Admin — single tap, mock OTP <code className="bg-neutral-900 text-[#FFCC00] px-2 py-0.5 rounded text-sm font-mono">123456</code>.</p>
          </div>
          <Link to="/login" className="gr-cta-dark !py-4 !px-6 text-lg" data-testid="landing-bottom-cta">
            Launch GoRide <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-neutral-950 text-neutral-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-display font-extrabold text-white tracking-tight">GoRide</div>
          <div className="text-sm">© {new Date().getFullYear()} GoRide · Indus Valley Degree College · BCA Capstone</div>
        </div>
      </footer>
    </div>
  );
}
