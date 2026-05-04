import React, { useEffect, useState, useCallback } from "react";
import TopBar from "../../components/TopBar";
import MapView from "../../components/MapView";
import { api } from "../../lib/api";
import { PRESET_LOCATIONS, VEHICLE_TYPES } from "../../lib/locations";
import { ArrowRight, MapPin, Navigation2, Loader2, History, Sparkles, X, CheckCircle2, Clock, Bike, Car, Truck } from "lucide-react";
import { toast } from "sonner";

const VEH_ICON = {
  bike: <Bike className="w-5 h-5" />,
  auto: <span className="text-lg">🛺</span>,
  car: <Car className="w-5 h-5" />,
  taxi: <span className="text-lg">🚕</span>,
  tempo: <span className="text-lg">🛻</span>,
  truck: <Truck className="w-5 h-5" />,
};

const StepDot = ({ done, active, label, time }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-3.5 h-3.5 rounded-full border-2 ${done ? "bg-emerald-500 border-emerald-500" : active ? "bg-[#FFCC00] border-neutral-900 status-dot" : "bg-white border-neutral-300"}`} />
      <div className="w-px flex-1 bg-neutral-200 my-1" style={{ minHeight: 16 }} />
    </div>
    <div className="pb-2">
      <div className={`text-sm font-semibold ${done || active ? "text-neutral-900" : "text-neutral-400"}`}>{label}</div>
      {time && <div className="text-xs text-neutral-500">{new Date(time).toLocaleTimeString()}</div>}
    </div>
  </div>
);

const STATUS_FLOW = ["searching", "assigned", "arrived", "started", "completed"];
const STATUS_LABEL = {
  searching: "Searching for driver",
  assigned: "Driver assigned",
  arrived: "Driver arrived",
  started: "Ride in progress",
  completed: "Ride completed",
  cancelled: "Cancelled",
};

function LocationSelect({ label, value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">{label}</span>
      <select
        value={value?.name || ""}
        onChange={(e) => {
          const loc = PRESET_LOCATIONS.find((l) => l.name === e.target.value);
          onChange(loc ? { ...loc, address: loc.name } : null);
        }}
        className="mt-1.5 w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-neutral-900 focus:bg-white"
        data-testid={testid}
      >
        <option value="">Select…</option>
        {PRESET_LOCATIONS.map((l) => (
          <option key={l.name} value={l.name}>{l.name}</option>
        ))}
      </select>
    </label>
  );
}

export default function CustomerDashboard() {
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [vehicleType, setVehicleType] = useState("auto");
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("book");

  const loadHistory = useCallback(async () => {
    const { data } = await api.get("/rides/customer");
    setHistory(data.rides);
    const ongoing = data.rides.find((r) => !["completed", "cancelled"].includes(r.status));
    setActiveRide(ongoing || null);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Estimate fare when pickup/drop/vehicle change
  useEffect(() => {
    if (!pickup || !drop) { setEstimate(null); return; }
    setEstimating(true);
    api.post("/rides/estimate", { pickup, drop, vehicle_type: vehicleType })
      .then(({ data }) => setEstimate(data))
      .catch(() => setEstimate(null))
      .finally(() => setEstimating(false));
  }, [pickup, drop, vehicleType]);

  // Poll active ride
  useEffect(() => {
    if (!activeRide) return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/rides/${activeRide.id}`);
        setActiveRide(data.ride);
        if (["completed", "cancelled"].includes(data.ride.status)) {
          setTimeout(loadHistory, 1500);
        }
      } catch (err) {
        console.warn("[customer] active ride poll failed", err);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [activeRide?.id, loadHistory]);

  const bookRide = async () => {
    if (!pickup || !drop || !vehicleType) return toast.error("Pick all fields");
    if (pickup.name === drop.name) return toast.error("Pickup and drop must differ");
    try {
      const { data } = await api.post("/rides", {
        pickup: { ...pickup, address: pickup.name },
        drop:   { ...drop,   address: drop.name },
        vehicle_type: vehicleType,
      });
      setActiveRide(data.ride);
      toast.success("Looking for a driver…");
      setTab("track");
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Booking failed");
    }
  };

  const cancel = async () => {
    if (!activeRide) return;
    try {
      const { data } = await api.post(`/rides/${activeRide.id}/status`, { status: "cancelled" });
      setActiveRide(data.ride);
      toast.message("Ride cancelled");
      setTimeout(loadHistory, 800);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Cannot cancel");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <TopBar title="Customer" />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid lg:grid-cols-12 gap-6 flex-1">
        {/* Map */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="gr-card overflow-hidden h-[460px] lg:h-[640px]">
            <MapView pickup={pickup} drop={drop} className="h-full w-full" />
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-5 order-1 lg:order-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 bg-white border border-neutral-200 p-1 rounded-xl" data-testid="customer-tabs">
            {[
              { k: "book", l: "Book", icon: Sparkles },
              { k: "track", l: "Track", icon: Navigation2 },
              { k: "history", l: "History", icon: History },
            ].map(({ k, l, icon: Icon }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                data-testid={`tab-${k}`}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                <Icon className="w-4 h-4" />{l}
              </button>
            ))}
          </div>

          {tab === "book" && (
            <div className="gr-card p-5 space-y-4" data-testid="book-panel">
              <div>
                <div className="font-display text-xl font-bold tracking-tight">Where to?</div>
                <div className="text-sm text-neutral-600">Pick locations from the Bengaluru list.</div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <LocationSelect label="Pickup" value={pickup} onChange={setPickup} testid="pickup-select" />
                <LocationSelect label="Drop" value={drop} onChange={setDrop} testid="drop-select" />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500 mb-2">Vehicle</div>
                <div className="grid grid-cols-3 gap-2" data-testid="vehicle-grid">
                  {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setVehicleType(k)}
                      data-testid={`vehicle-${k}`}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition ${vehicleType === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:border-neutral-400"}`}
                    >
                      <div className="text-xl">{v.icon}</div>
                      <div className="text-xs font-semibold">{v.label}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-neutral-500">{VEHICLE_TYPES[vehicleType]?.desc}</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4" data-testid="fare-card">
                {estimating ? (
                  <div className="flex items-center gap-2 text-neutral-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Computing route…</div>
                ) : estimate ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 font-semibold">Estimate</div>
                      <div className="font-display text-3xl font-extrabold tracking-tight" data-testid="fare-amount">₹{estimate.fare}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{estimate.distance_km} km · ETA {estimate.eta_min} min</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-neutral-500">Rate</div>
                      <div className="font-semibold">₹{estimate.rate_per_km}/km</div>
                      <div className="text-xs text-neutral-500">+ ₹{estimate.base_fare} base</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">Select pickup & drop to see fare.</div>
                )}
              </div>

              <button onClick={bookRide} disabled={!estimate || activeRide} className="gr-cta w-full" data-testid="book-ride-btn">
                {activeRide ? "You have an active ride" : "Book ride"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {tab === "track" && (
            <div className="gr-card p-5 space-y-4" data-testid="track-panel">
              {!activeRide ? (
                <div className="text-center py-10">
                  <Clock className="w-10 h-10 mx-auto text-neutral-300" />
                  <div className="font-display font-bold text-lg mt-3">No active ride</div>
                  <div className="text-sm text-neutral-500">Book one to start tracking.</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="font-display text-xl font-bold tracking-tight">Live tracking</div>
                    <span className="gr-pill bg-amber-100 text-amber-900" data-testid="ride-status">{STATUS_LABEL[activeRide.status]}</span>
                  </div>
                  <div className="rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FFCC00] flex items-center justify-center">{VEH_ICON[activeRide.vehicle_type]}</div>
                      <div>
                        <div className="font-semibold">{VEHICLE_TYPES[activeRide.vehicle_type]?.label} · ₹{activeRide.fare}</div>
                        <div className="text-xs text-neutral-500">{activeRide.distance_km} km · {activeRide.pickup.address} → {activeRide.drop.address}</div>
                      </div>
                    </div>
                    {activeRide.worker_name && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 text-sm">
                        <div className="text-neutral-500 text-xs uppercase tracking-wider">Driver</div>
                        <div className="font-semibold">{activeRide.worker_name}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    {STATUS_FLOW.map((s, i) => {
                      const idx = STATUS_FLOW.indexOf(activeRide.status);
                      const event = activeRide.timeline?.find((t) => t.status === s);
                      return (
                        <StepDot
                          key={s}
                          done={idx > i}
                          active={idx === i}
                          label={STATUS_LABEL[s]}
                          time={event?.at}
                        />
                      );
                    })}
                  </div>

                  {!["completed", "cancelled"].includes(activeRide.status) && (
                    <button onClick={cancel} className="gr-ghost w-full text-red-600 border-red-200 hover:bg-red-50" data-testid="cancel-ride-btn">
                      <X className="w-4 h-4" /> Cancel ride
                    </button>
                  )}
                  {activeRide.status === "completed" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-emerald-900">Ride completed</div>
                        <div className="text-xs text-emerald-700">Thanks for riding GoRide.</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3" data-testid="history-panel">
              {history.length === 0 && (
                <div className="gr-card p-8 text-center text-neutral-500">No rides yet.</div>
              )}
              {history.map((r) => (
                <div key={r.id} className="gr-card p-4 flex items-center justify-between" data-testid={`history-row-${r.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">{VEH_ICON[r.vehicle_type]}</div>
                    <div>
                      <div className="font-semibold">{r.pickup.address} → {r.drop.address}</div>
                      <div className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()} · {r.distance_km} km</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-lg">₹{r.fare}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-neutral-500">{r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
