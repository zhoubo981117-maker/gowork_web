import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import type { AuthResponse, User } from "../types";
import { AuthContext } from "./auth-context";

export { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.get<User>("/api/auth/me").then(
      (u) => { if (!cancelled) setUser(u); },
      () => { if (!cancelled) { setToken(null); setUser(null); localStorage.removeItem("token"); } },
    );
    return () => { cancelled = true; };
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/login", { username, password });
    setToken(res.token);
    localStorage.setItem("token", res.token);
  };

  const register = async (username: string, email: string, password: string) => {
    await api.post<User>("/api/auth/register", { username, email, password });
  };

  const logout = async () => {
    try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
