import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("goride_token");
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (e) {
      localStorage.removeItem("goride_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (token) => {
    localStorage.setItem("goride_token", token);
    await refresh();
  };

  const logout = () => {
    localStorage.removeItem("goride_token");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, setUser }),
    [user, loading, refresh]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
