import React, { useEffect, useState, useCallback } from "react";
import TopBar from "../../components/TopBar";
import MapView from "../../components/MapView";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { VEHICLE_TYPES } from "../../lib/locations";
import { Power, Wallet, Car, Plus, CheckCheck, Navigation2, ListChecks, IndianRupee, ArrowRight, Truck } from "lucide-react";
import { toast } from "sonner";

const STATUS_NEXT = { assigned: "arrived", arrived: "started", started: "completed" };
const STATUS_LABEL = {
  searching: "Searching", assigned: "Assigned", arrived: "Arrived",
  started: "In Progress", completed: "Completed", cancelled: "Cancelled",
};

function VehicleForm({ onAdd, busy }) {
  const [type, setType] = useState("auto");
  const [plate, setPlate] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [rcNo, setRcNo] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!plate || !licenseNo || !rcNo) return toast.error("All fields required");
    onAdd({ type, plate, license_no: licenseNo, rc_no: rcNo });
    setPlate(""); setLicenseNo(""); setRcNo("");
  };
  return (
    <form onSubmit={submit} className="gr-card p-5 space-y-3" data-testid="vehicle-form">
      <div className="font-display text-lg font-bold">Register a vehicle</div>
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-neutral-900" data-testid="vehicle-type-select">
          {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="KA 01 AB 1234" className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-neutral-900 font-mono uppercase" data-testid="plate-input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="DL no." className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-neutral-900" data-testid="license-input" />
        <input value={rcNo} onChange={(e) => setRcNo(e.target.value)} placeholder="RC no." className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-neutral-900" data-testid="rc-input" />
      </div>
      <button type="submit" disabled={busy} className="gr-cta w-full" data-testid="add-vehicle-btn">
        <Plus className="w-4 h-4" /> Add vehicle
      </button>
    </form>
  );
}

export default function WorkerDashboard() {
  const { user, refresh } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [activeVid, setActiveVid] = useState(null);
  const [available, setAvailable] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("ride");

  const loadVehicles = useCallback(async () => {
    const { data } = await api.get("/vehicles");
    setVehicles(data.vehicles);
    setActiveVid(data.active_vehicle_id);
  }, []);

  const loadAvailable = useCallback(async () => {
    try {
      const { data } = await api.get("/rides/worker/available");
      setAvailable(data.rides);
    } catch (err) {
      console.warn("[worker] available rides poll failed", err);
    }
  }, []);

  const loadActive = useCallback(async () => {
    const { data } = await api.get("/rides/worker/mine");
    const ongoing = data.rides.find((r) => ["assigned", "arrived", "started"].includes(r.status));
    setActiveRide(ongoing || null);
  }, []);

  const loadWallet = useCallback(async () => {
    const { data } = await api.get("/wallet/me");
    setWallet(data);
  }, []);

  useEffect(() => { loadVehicles(); loadActive(); loadWallet(); }, [loadVehicles, loadActive, loadWallet]);

  useEffect(() => {
    if (!user?.is_online || activeRide) return;
    loadAvailable();
    const t = setInterval(loadAvailable, 4000);
    return () => clearInterval(t);
  }, [user?.is_online, activeRide, loadAvailable]);

  useEffect(() => {
    if (!activeRide) return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/rides/${activeRide.id}`);
        setActiveRide(["completed", "cancelled"].includes(data.ride.status) ? null : data.ride);
        if (["completed", "cancelled"].includes(data.ride.status)) { loadWallet(); refresh(); }
      } catch (err) {
        console.warn("[worker] active ride poll failed", err);
      }
    }, 3500);
    return () => clearInterval(t);
  }, [activeRide?.id, loadWallet, refresh]);

  const toggleOnline = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/worker/online", { online: !user.is_online });
      await refresh();
      toast.success(data.is_online ? "You're online" : "You're offline");
      if (data.is_online) loadAvailable();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const addVehicle = async (payload) => {
    setBusy(true);
    try {
      await api.post("/vehicles", payload);
      toast.success("Vehicle registered");
      loadVehicles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const activate = async (vid) => {
    await api.post(`/vehicles/${vid}/activate`);
    toast.success("Active vehicle switched");
    loadVehicles();
  };

  const accept = async (rid) => {
    try {
      const { data } = await api.post(`/rides/${rid}/accept`);
      setActiveRide(data.ride);
      toast.success("Ride accepted");
      setTab("ride");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not accept");
    }
  };

  const advance = async () => {
    if (!activeRide) return;
    const next = STATUS_NEXT[activeRide.status];
    if (!next) return;
    try {
      const { data } = await api.post(`/rides/${activeRide.id}/status`, { status: next });
      if (next === "completed") {
        toast.success("Ride completed · ₹1 platform fee deducted");
        setActiveRide(null);
        loadWallet(); refresh();
      } else {
        setActiveRide(data.ride);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const advanceLabel = activeRide ? ({
    assigned: "Mark as Arrived",
    arrived: "Start ride",
    started: "Complete ride",
  }[activeRide.status]) : "";

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <TopBar
        title="Worker"
        right={
          <button
            onClick={toggleOnline}
            disabled={busy}
            data-testid="online-toggle"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${user?.is_online ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-700"}`}
          >
            <Power className="w-4 h-4" />
            {user?.is_online ? "Online" : "Offline"}
          </button>
        }
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid lg:grid-cols-12 gap-6 flex-1">
        {/* Left column: Map + active ride */}
        <div className="lg:col-span-7 space-y-4">
          <div className="gr-card overflow-hidden h-[400px] lg:h-[460px]">
            <MapView pickup={activeRide?.pickup} drop={activeRide?.drop} className="h-full w-full" />
          </div>

          {activeRide && (
            <div className="gr-card p-5" data-testid="active-ride-card">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 font-semibold">Active ride</div>
                  <div className="font-display text-2xl font-bold mt-1">{activeRide.pickup.address} → {activeRide.drop.address}</div>
                  <div className="text-sm text-neutral-600 mt-0.5">{activeRide.distance_km} km · {VEHICLE_TYPES[activeRide.vehicle_type]?.label} · ₹{activeRide.fare}</div>
                </div>
                <span className="gr-pill bg-amber-100 text-amber-900">{STATUS_LABEL[activeRide.status]}</span>
              </div>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                  <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Customer</div>
                  <div className="font-semibold">{activeRide.customer_name}</div>
                  <div className="text-xs text-neutral-500">+91 {activeRide.customer_phone}</div>
                </div>
                <button onClick={advance} className="gr-cta-dark" data-testid="advance-ride-btn">
                  <CheckCheck className="w-4 h-4" /> {advanceLabel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex gap-2 bg-white border border-neutral-200 p-1 rounded-xl">
            {[
              { k: "ride", l: "Rides", icon: Navigation2 },
              { k: "wallet", l: "Wallet", icon: Wallet },
              { k: "vehicles", l: "Vehicles", icon: Car },
            ].map(({ k, l, icon: Icon }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                data-testid={`worker-tab-${k}`}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                <Icon className="w-4 h-4" />{l}
              </button>
            ))}
          </div>

          {tab === "ride" && (
            <div className="space-y-3" data-testid="rides-panel">
              {!user?.is_online && (
                <div className="gr-card p-6 text-center">
                  <Power className="w-10 h-10 mx-auto text-neutral-300" />
                  <div className="font-display font-bold text-lg mt-3">You're offline</div>
                  <div className="text-sm text-neutral-500">Go online to receive ride requests.</div>
                </div>
              )}
              {user?.is_online && !activeRide && available.length === 0 && (
                <div className="gr-card p-6 text-center">
                  <ListChecks className="w-10 h-10 mx-auto text-neutral-300" />
                  <div className="font-display font-bold text-lg mt-3">Waiting for requests…</div>
                  <div className="text-sm text-neutral-500">Customers nearby will appear here.</div>
                </div>
              )}
              {user?.is_online && !activeRide && available.map((r) => (
                <div key={r.id} className="gr-card p-4 flex items-center gap-3" data-testid={`request-${r.id}`}>
                  <div className="w-12 h-12 rounded-xl bg-[#FFCC00] flex items-center justify-center text-2xl">
                    {VEHICLE_TYPES[r.vehicle_type]?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.pickup.address} → {r.drop.address}</div>
                    <div className="text-xs text-neutral-500">{r.distance_km} km · {r.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold">₹{r.fare}</div>
                    <button onClick={() => accept(r.id)} className="gr-cta !py-1.5 !px-3 mt-1 text-xs" data-testid={`accept-${r.id}`}>
                      Accept <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "wallet" && wallet && (
            <div className="space-y-3" data-testid="wallet-panel">
              <div className="rounded-2xl bg-neutral-900 text-white p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-[#FFCC00] font-semibold">Worker Wallet</div>
                <div className="flex items-baseline gap-1 mt-3">
                  <IndianRupee className="w-7 h-7 text-[#FFCC00]" />
                  <div className="font-display text-5xl font-extrabold tracking-tighter" data-testid="wallet-balance">{wallet.balance.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
                  <div>
                    <div className="text-neutral-400 text-xs uppercase tracking-wider">Earnings</div>
                    <div className="font-semibold">₹{wallet.earnings_total.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-xs uppercase tracking-wider">Fees paid</div>
                    <div className="font-semibold">₹{wallet.platform_fees_total.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-xs uppercase tracking-wider">Rides</div>
                    <div className="font-semibold">{wallet.completed_rides}</div>
                  </div>
                </div>
              </div>
              <div className="gr-card p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 font-semibold mb-2">Recent transactions</div>
                {wallet.transactions.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">No transactions yet.</div>}
                <div className="divide-y divide-neutral-200">
                  {wallet.transactions.slice(0, 12).map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-neutral-500">{new Date(t.at).toLocaleString()}</div>
                      </div>
                      <div className={`font-mono font-bold ${t.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {t.amount < 0 ? "−" : "+"}₹{Math.abs(t.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "vehicles" && (
            <div className="space-y-3" data-testid="vehicles-panel">
              <div className="space-y-2">
                {vehicles.length === 0 && (
                  <div className="gr-card p-6 text-center text-neutral-500">
                    <Truck className="w-10 h-10 mx-auto text-neutral-300" />
                    <div className="font-display font-bold text-lg mt-3">No vehicles yet</div>
                    <div className="text-sm">Register one below.</div>
                  </div>
                )}
                {vehicles.map((v) => (
                  <div key={v.id} className={`gr-card p-4 flex items-center justify-between ${activeVid === v.id ? "border-neutral-900" : ""}`} data-testid={`vehicle-row-${v.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-xl">{VEHICLE_TYPES[v.type]?.icon}</div>
                      <div>
                        <div className="font-semibold">{VEHICLE_TYPES[v.type]?.label} · <span className="font-mono">{v.plate}</span></div>
                        <div className="text-xs text-neutral-500">DL {v.license_no} · RC {v.rc_no}</div>
                      </div>
                    </div>
                    {activeVid === v.id ? (
                      <span className="gr-pill bg-emerald-100 text-emerald-800">Active</span>
                    ) : (
                      <button onClick={() => activate(v.id)} className="gr-ghost !py-1.5 !px-3 text-xs" data-testid={`activate-${v.id}`}>Activate</button>
                    )}
                  </div>
                ))}
              </div>
              <VehicleForm onAdd={addVehicle} busy={busy} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
