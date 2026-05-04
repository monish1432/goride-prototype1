import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LogOut, User } from "lucide-react";

export default function TopBar({ title, right }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="topbar-logo">
          <div className="w-9 h-9 rounded-lg bg-[#FFCC00] flex items-center justify-center font-display font-extrabold text-neutral-900 text-lg tracking-tight">
            Go
          </div>
          <div className="font-display font-extrabold text-xl tracking-tight">
            GoRide
            {title && <span className="text-neutral-400 font-medium ml-2 text-sm">/ {title}</span>}
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {right}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600">
                <User className="w-4 h-4" />
                <span data-testid="user-phone">{user.name || user.phone}</span>
                <span className="gr-pill bg-neutral-100 text-neutral-700 capitalize">{user.role}</span>
              </div>
              <button
                onClick={() => { logout(); nav("/"); }}
                className="gr-ghost !px-3 !py-2"
                data-testid="logout-btn"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="gr-cta-dark !py-2 !px-4 text-sm" data-testid="topbar-login">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
