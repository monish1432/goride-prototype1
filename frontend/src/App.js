import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import WorkerDashboard from "./pages/worker/WorkerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

import "./App.css";

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.role) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/customer" element={<Guard role="customer"><CustomerDashboard /></Guard>} />
          <Route path="/worker"   element={<Guard role="worker"><WorkerDashboard /></Guard>} />
          <Route path="/admin"    element={<Guard role="admin"><AdminDashboard /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
