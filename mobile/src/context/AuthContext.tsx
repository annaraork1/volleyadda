import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  authDeleteAccount,
  authLogin,
  authLogout,
  authMe,
  authSignup,
  getToken,
  setToken,
  setUnauthorizedHandler,
  type PublicUser,
} from "../api/client";
import { joinApiUrl } from "../api/absoluteUrl";

WebBrowser.maybeCompleteAuthSession();

interface AuthCtx {
  /** True once the stored token has been checked. */
  ready: boolean;
  user: PublicUser | null;
  superadmin: boolean;
  isSignedIn: boolean;
  /** Signed in but email not verified yet (cannot create tournaments / score). */
  needsVerify: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [superadmin, setSuperadmin] = useState(false);

  const clear = useCallback(() => {
    setUser(null);
    setSuperadmin(false);
  }, []);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      clear();
      return;
    }
    try {
      const me = await authMe();
      setUser(me.user);
      setSuperadmin(!!me.superadmin);
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        await setToken(null);
        clear();
      }
      // network error: keep whatever we had
    }
  }, [clear]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void setToken(null);
      clear();
    });
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refresh();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await authLogin({ email: email.trim(), password });
    setUser(r.user);
    setSuperadmin(!!r.superadmin);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const r = await authSignup({ name: name.trim(), email: email.trim(), password });
    setUser(r.user);
    setSuperadmin(!!r.superadmin);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const returnTo = Linking.createURL("auth/google");
    const startUrl = joinApiUrl(`/api/auth/google/start?return=${encodeURIComponent(returnTo)}`);
    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnTo);
    if (result.type !== "success" || !("url" in result) || !result.url) {
      throw new Error("Google sign-in cancelled");
    }
    const parsed = Linking.parse(result.url);
    const q = (parsed.queryParams || {}) as Record<string, string | undefined>;
    if (q.error) throw new Error(String(q.error));
    const token = q.token ? String(q.token) : "";
    if (!token) throw new Error("Google sign-in did not return a session");
    await setToken(token);
    const me = await authMe();
    setUser(me.user);
    setSuperadmin(!!me.superadmin);
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    clear();
  }, [clear]);

  const deleteAccount = useCallback(async () => {
    await authDeleteAccount();
    clear();
  }, [clear]);

  const value = useMemo<AuthCtx>(
    () => ({
      ready,
      user,
      superadmin,
      isSignedIn: !!user,
      needsVerify: !!user && !user.emailVerified,
      login,
      signup,
      loginWithGoogle,
      logout,
      deleteAccount,
      refresh,
    }),
    [ready, user, superadmin, login, signup, loginWithGoogle, logout, deleteAccount, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
