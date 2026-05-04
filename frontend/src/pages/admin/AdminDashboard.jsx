import React, { useEffect, useState } from "react";
import TopBar from "../../components/TopBar";
import { api } from "../../lib/api";
import { VEHICLE_TYPES } from "../../lib/locations";
import { Activity, Users, Wrench, IndianRupee, TrendingUp, MapPin, BadgeCheck } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, sub, accent = "bg-neutral-100", testid }) => (
  <div className="gr-card p-5" data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 font-semibold">{label}</div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4 text-neutral-900" />
      </div>
    </div>
    <div className="font-display text-3xl font-extrabold tracking-tight mt-3">{value}</div>
    {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
  </div>
);

const STATUS_COLORS = {
  searching: "bg-amber-100 text-amber-900",
  assigned: "bg-blue-100 text-blue-900",
  arrived: "bg-indigo-100 text-indigo-900",
  started: "bg-violet-100 text-violet-900",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("rides");

  const load = async () => {
    const [s, r, u] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/rides"),
      api.get("/admin/users"),
    ]);
    setStats(s.data);
    setRides(r.data.rides);
    setUsers(u.data.users);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar title="Admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-neutral-500">Loading…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <TopBar title="Admin" />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold">Control room</div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">GoRide Operations</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard testid="stat-rides-total" icon={Activity} label="Rides total" value={stats.rides_total} sub={`${stats.rides_today} today`} accent="bg-amber-100" />
          <StatCard testid="stat-revenue" icon={IndianRupee} label="Platform revenue" value={`₹${stats.platform_revenue.toFixed(2)}`} sub="₹1 per completed ride" accent="bg-[#FFCC00]" />
          <StatCard testid="stat-gross" icon={TrendingUp} label="Gross fare" value={`₹${stats.gross_fare.toFixed(2)}`} sub={`${stats.rides_completed} completed`} accent="bg-emerald-100" />
          <StatCard testid="stat-customers" icon={Users} label="Customers" value={stats.customers} sub={`${stats.workers} workers · ${stats.workers_online} online`} accent="bg-neutral-100" />
        </div>

        <div className="flex gap-2 bg-white border border-neutral-200 p-1 rounded-xl w-fit" data-testid="admin-tabs">
          {[
            { k: "rides", l: "Rides", icon: MapPin },
            { k: "users", l: "Users", icon: Users },
          ].map(({ k, l, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              data-testid={`admin-tab-${k}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              <Icon className="w-4 h-4" />{l}
            </button>
          ))}
        </div>

        {tab === "rides" && (
          <div className="gr-card overflow-hidden" data-testid="admin-rides-table">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">When</th>
                    <th className="text-left px-4 py-3 font-semibold">Vehicle</th>
                    <th className="text-left px-4 py-3 font-semibold">Route</th>
                    <th className="text-left px-4 py-3 font-semibold">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold">Worker</th>
                    <th className="text-right px-4 py-3 font-semibold">Fare</th>
                    <th className="text-right px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rides.length === 0 && (
                    <tr><td colSpan="7" className="px-4 py-10 text-center text-neutral-500">No rides yet.</td></tr>
                  )}
                  {rides.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50" data-testid={`admin-ride-${r.id}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="gr-pill bg-neutral-100 text-neutral-800">{VEHICLE_TYPES[r.vehicle_type]?.icon} {VEHICLE_TYPES[r.vehicle_type]?.label}</span></td>
                      <td className="px-4 py-3 max-w-xs truncate">{r.pickup.address} → {r.drop.address}</td>
                      <td className="px-4 py-3">{r.customer_name}</td>
                      <td className="px-4 py-3">{r.worker_name || <span className="text-neutral-400">—</span>}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">₹{r.fare}</td>
                      <td className="px-4 py-3 text-right"><span className={`gr-pill ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="gr-card overflow-hidden" data-testid="admin-users-table">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Joined</th>
                    <th className="text-left px-4 py-3 font-semibold">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Role</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Wallet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50" data-testid={`admin-user-${u.id}`}>
                      <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{new Date(u.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono">+91 {u.phone}</td>
                      <td className="px-4 py-3">{u.name || <span className="text-neutral-400">—</span>}</td>
                      <td className="px-4 py-3 capitalize"><span className="gr-pill bg-neutral-100 text-neutral-800">{u.role || "guest"}</span></td>
                      <td className="px-4 py-3">
                        {u.role === "worker" ? (
                          <span className={`gr-pill ${u.is_online ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>
                            {u.is_online ? <><BadgeCheck className="w-3 h-3" /> online</> : "offline"}
                          </span>
                        ) : <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{u.role === "worker" ? `₹${(u.wallet_balance ?? 0).toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
