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
  ApiNetworkError,
  clearSession,
  exchangeGoogleCredential,
  exchangePasswordLogin,
  exchangeRegister,
  fetchAdminMe,
  fetchCurrentAccount,
  getConnectionIssueLocaleKey,
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
  signInWithPassword: (username: string, password: string) => Promise<void>;
  signUpWithPassword: (username: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isReady: boolean;
  /** When set, session exists but `/me` failed (e.g. backend down). Use with `retryConnection`. */
  connectionIssueKey: string | null;
  connectionRetryBusy: boolean;
  retryConnection: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [connectionIssueKey, setConnectionIssueKey] = useState<string | null>(null);
  const [connectionRetryBusy, setConnectionRetryBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const session = loadSession();
      if (!session) {
        if (!cancelled) {
          setConnectionIssueKey(null);
          setIsReady(true);
        }
        return;
      }
      try {
        const me = await fetchCurrentAccount(session.authorizationHeader);
        if (!cancelled) {
          setUser(me);
          setConnectionIssueKey(null);
        }
        try {
          const admin = await fetchAdminMe();
          if (!cancelled) setIsAdmin(admin.admin);
        } catch {
          if (!cancelled) setIsAdmin(false);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiHttpError && e.status === 401) {
          clearSession();
          setUser(null);
          setIsAdmin(false);
          setConnectionIssueKey(null);
        } else {
          // Keep session: backend may be down; user can retry when it's back.
          setUser(null);
          setIsAdmin(false);
          const key =
            getConnectionIssueLocaleKey(e) ??
            (e instanceof ApiNetworkError ? "errors.backendUnreachable" : "errors.accountLoadFailed");
          setConnectionIssueKey(key);
        }
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
      setConnectionIssueKey(null);
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

  const signInWithPassword = useCallback(
    async (username: string, password: string) => {
      try {
        const data = await exchangePasswordLogin(username, password);
        await applyAuthResponse(data);
      } catch (e) {
        throw new Error(getDisplayErrorMessage(e, "Could not sign in."));
      }
    },
    [applyAuthResponse],
  );

  const signUpWithPassword = useCallback(
    async (username: string, password: string) => {
      try {
        const data = await exchangeRegister(username, password);
        await applyAuthResponse(data);
      } catch (e) {
        throw new Error(getDisplayErrorMessage(e, "Could not create account."));
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
      setConnectionIssueKey(null);
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
        setConnectionIssueKey(null);
      } else {
        const key =
          getConnectionIssueLocaleKey(e) ??
          (e instanceof ApiNetworkError ? "errors.backendUnreachable" : "errors.accountLoadFailed");
        setConnectionIssueKey(key);
      }
      throw e instanceof Error ? e : new Error("Could not refresh profile.");
    }
  }, []);

  const retryConnection = useCallback(async () => {
    const session = loadSession();
    if (!session) {
      setConnectionIssueKey(null);
      return;
    }
    setConnectionRetryBusy(true);
    try {
      const me = await fetchCurrentAccount(session.authorizationHeader);
      setUser(me);
      setConnectionIssueKey(null);
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
        setConnectionIssueKey(null);
      } else {
        const key =
          getConnectionIssueLocaleKey(e) ??
          (e instanceof ApiNetworkError ? "errors.backendUnreachable" : "errors.accountLoadFailed");
        setConnectionIssueKey(key);
      }
    } finally {
      setConnectionRetryBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAdmin(false);
    setConnectionIssueKey(null);
    clearSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      refreshUser,
      logout,
      isReady,
      connectionIssueKey,
      connectionRetryBusy,
      retryConnection,
    }),
    [
      user,
      isAdmin,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      refreshUser,
      logout,
      isReady,
      connectionIssueKey,
      connectionRetryBusy,
      retryConnection,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
