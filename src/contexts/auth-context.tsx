"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiHttpError,
  buildBasicAuthorization,
  clearSession,
  fetchAdminMe,
  fetchCurrentAccount,
  getDisplayErrorMessage,
  loadSession,
  registerAccount,
  saveSession,
  type AccountResponse,
} from "@/lib/api";

export type User = AccountResponse;

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isReady: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const session = loadSession();
      if (!session) {
        if (!cancelled) setIsReady(true);
        return;
      }
      try {
        const me = await fetchCurrentAccount(session.authorizationHeader);
        if (!cancelled) setUser(me);
        try {
          const admin = await fetchAdminMe();
          if (!cancelled) setIsAdmin(admin.admin);
        } catch {
          if (!cancelled) setIsAdmin(false);
        }
      } catch {
        clearSession();
        if (!cancelled) setUser(null);
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim();
    const authorizationHeader = buildBasicAuthorization(trimmed, password);
    try {
      const me = await fetchCurrentAccount(authorizationHeader);
      saveSession({ username: me.username, authorizationHeader });
      setUser(me);
      try {
        const admin = await fetchAdminMe();
        setIsAdmin(admin.admin);
      } catch {
        setIsAdmin(false);
      }
    } catch (e) {
      throw new Error(getDisplayErrorMessage(e, "Could not sign in."));
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim();
    const created = await registerAccount(trimmed, password);
    const authorizationHeader = buildBasicAuthorization(trimmed, password);
    saveSession({ username: created.username, authorizationHeader });
    setUser(created);
    try {
      const admin = await fetchAdminMe();
      setIsAdmin(admin.admin);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const session = loadSession();
    if (!session) return;
    try {
      const me = await fetchCurrentAccount(session.authorizationHeader);
      setUser(me);
      try {
        const admin = await fetchAdminMe();
        setIsAdmin(admin.admin);
      } catch {
        setIsAdmin(false);
      }
    } catch (e) {
      if (e instanceof ApiHttpError && e.status === 401) {
        clearSession();
        setUser(null);
        setIsAdmin(false);
      }
      throw e instanceof Error ? e : new Error("Could not refresh profile.");
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAdmin(false);
    clearSession();
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin, login, register, refreshUser, logout, isReady }),
    [user, isAdmin, login, register, refreshUser, logout, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
