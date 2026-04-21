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
  clearSession,
  exchangeGoogleCredential,
  fetchAdminMe,
  fetchCurrentAccount,
  getDisplayErrorMessage,
  loadSession,
  saveSession,
  type AccountResponse,
} from "@/lib/api";

export type User = AccountResponse;

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  signInWithGoogle: (credential: string) => Promise<void>;
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

  const applyAuthResponse = useCallback(
    async (data: {
      accessToken: string;
      tokenType: string;
      account: AccountResponse;
    }) => {
      const authorizationHeader = `${data.tokenType} ${data.accessToken}`;
      saveSession({
        username: data.account.username,
        authorizationHeader,
      });
      setUser(data.account);
      try {
        const admin = await fetchAdminMe();
        setIsAdmin(admin.admin);
      } catch {
        setIsAdmin(false);
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async (credential: string) => {
      try {
        const data = await exchangeGoogleCredential(credential);
        await applyAuthResponse(data);
      } catch (e) {
        throw new Error(getDisplayErrorMessage(e, "Could not sign in."));
      }
    },
    [applyAuthResponse],
  );

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
    () => ({
      user,
      isAdmin,
      signInWithGoogle,
      refreshUser,
      logout,
      isReady,
    }),
    [user, isAdmin, signInWithGoogle, refreshUser, logout, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
