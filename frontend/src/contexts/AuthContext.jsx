import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = checking, null = anonymous
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (_) {
      setUser(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (username, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { username, password });
      setUser(data);
      return data;
    } catch (e) {
      setError(formatApiError(e));
      throw e;
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout, error, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
