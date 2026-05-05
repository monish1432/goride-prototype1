import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ArrowRight, Phone, KeyRound, User, Car, Wrench, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [step, setStep] = useState("phone"); // phone | otp | role
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, refresh, user } = useAuth();
  const nav = useNavigate();

  const sendOtp = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/send-otp", { phone });
      setDemoOtp(data.demo_otp || "123456");
      setStep("otp");
      toast.success(`OTP sent. Demo code: ${data.demo_otp || "123456"}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send OTP");
    } finally { setBusy(false); }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      // 1. Ask backend to verify OTP
      const { data } = await api.post("/auth/verify-otp", { phone, otp });
      
      // 2. FORCE SAVE THE TOKEN directly to local storage!
      if (data.token) {
         localStorage.setItem("token", data.token);
      }
      
      // 3. Move to role selection screen
      setStep("role");
      toast.success("Verified!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
    } finally { setBusy(false); }
  };

  const pickRole = async (role) => {
    setBusy(true);
    try {
      // 1. Manually pull the token we just saved
      const rawToken = localStorage.getItem("token");

      // 2. FORCE ATTACH the token to this specific request just in case the interceptor fails
      await api.post("/auth/select-role", 
        { role, name }, 
        { 
          headers: { Authorization: `Bearer ${rawToken}` } 
        }
      );
      
      // 3. Success! Go to dashboard.
      toast.success(`Onboarded as ${role}`);
      
      // If you have a refresh/login context function, call it here, otherwise just navigate:
      window.location.href = `/${role.toLowerCase()}`; 
      
    } catch (err) {
      toast.error("Could not save role");
      console.error(err);
    } finally { setBusy(false); }
  };
  
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="hidden lg:flex relative bg-neutral-950 text-white overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] blob-yellow opacity-60" />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#FFCC00] flex items-center justify-center font-display font-extrabold text-neutral-900 text-lg">Go</div>
            <span className="font-display font-extrabold text-2xl tracking-tight">GoRide</span>
          </div>
          <div>
            <h1 className="font-display text-5xl font-extrabold tracking-tighter leading-[1.05]">
              One platform.<br />
              Every <span className="bg-[#FFCC00] text-neutral-900 px-2">wheel</span> in town.
            </h1>
            <p className="mt-6 text-neutral-300 max-w-md">Bikes to trucks. Riders to logistics. Welcome to the unified mobility marketplace.</p>
          </div>
          <div className="text-xs text-neutral-500 uppercase tracking-[0.2em]">Demo OTP · 1 2 3 4 5 6</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold">
            Step {step === "phone" ? "01" : step === "otp" ? "02" : "03"} / 03
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight mt-3">
            {step === "phone" && "What's your number?"}
            {step === "otp" && "Verify it's you"}
            {step === "role" && "Pick your lane"}
          </h2>

          {step === "phone" && (
            <form onSubmit={sendOtp} className="mt-8 space-y-4" data-testid="phone-form">
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">Phone number</span>
                <div className="mt-2 flex items-center gap-2 border border-neutral-200 rounded-xl bg-neutral-50 focus-within:border-neutral-900 focus-within:bg-white transition px-4 py-3">
                  <Phone className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-500 font-medium">+91</span>
                  <input
                    autoFocus
                    inputMode="tel"
                    placeholder="98XXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-transparent outline-none font-medium tracking-wide"
                    data-testid="phone-input"
                  />
                </div>
              </label>
              <button type="submit" disabled={busy} className="gr-cta w-full" data-testid="send-otp-btn">
                Send OTP <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="mt-8 space-y-4" data-testid="otp-form">
              <div className="text-sm text-neutral-600">Sent to <span className="font-semibold text-neutral-900">+91 {phone}</span> · <button type="button" onClick={() => setStep("phone")} className="underline" data-testid="change-phone-btn">change</button></div>
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">6-digit code</span>
                <div className="mt-2 flex items-center gap-2 border border-neutral-200 rounded-xl bg-neutral-50 focus-within:border-neutral-900 focus-within:bg-white transition px-4 py-3">
                  <KeyRound className="w-4 h-4 text-neutral-500" />
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={demoOtp || "1 2 3 4 5 6"}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-transparent outline-none font-mono text-lg tracking-[0.4em]"
                    data-testid="otp-input"
                  />
                </div>
              </label>
              <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
                Demo OTP: <span className="font-mono font-bold">{demoOtp}</span>
              </div>
              <button type="submit" disabled={busy || otp.length < 6} className="gr-cta w-full" data-testid="verify-otp-btn">
                Verify & continue <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === "role" && (
            <div className="mt-8 space-y-4" data-testid="role-form">
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">Display name (optional)</span>
                <div className="mt-2 flex items-center gap-2 border border-neutral-200 rounded-xl bg-neutral-50 focus-within:border-neutral-900 focus-within:bg-white transition px-4 py-3">
                  <User className="w-4 h-4 text-neutral-500" />
                  <input
                    placeholder="What should we call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-transparent outline-none font-medium"
                    data-testid="name-input"
                  />
                </div>
              </label>
              <div className="text-sm font-semibold text-neutral-700 pt-2">I'm a…</div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => pickRole("customer")} disabled={busy} className="text-left gr-card p-5 hover:border-neutral-900 transition flex items-center gap-4" data-testid="role-customer-btn">
                  <div className="w-12 h-12 rounded-xl bg-[#FFCC00] flex items-center justify-center"><Car className="w-6 h-6 text-neutral-900" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">Customer</div>
                    <div className="text-sm text-neutral-600">Book rides & send goods</div>
                  </div>
                  <ArrowRight className="ml-auto w-5 h-5 text-neutral-400" />
                </button>
                <button onClick={() => pickRole("worker")} disabled={busy} className="text-left gr-card p-5 hover:border-neutral-900 transition flex items-center gap-4" data-testid="role-worker-btn">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center"><Wrench className="w-6 h-6 text-white" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">Worker · Driver</div>
                    <div className="text-sm text-neutral-600">Accept rides, manage your wallet</div>
                  </div>
                  <ArrowRight className="ml-auto w-5 h-5 text-neutral-400" />
                </button>
                <button onClick={() => pickRole("admin")} disabled={busy} className="text-left gr-card p-5 hover:border-neutral-900 transition flex items-center gap-4" data-testid="role-admin-btn">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center"><Shield className="w-6 h-6 text-[#FFCC00]" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">Admin</div>
                    <div className="text-sm text-neutral-600">Oversee the platform</div>
                  </div>
                  <ArrowRight className="ml-auto w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-10 text-xs text-neutral-500">
            By continuing you agree to GoRide's mock terms. This is a BCA capstone demo.
          </div>
        </div>
      </div>
    </div>
  );
}
