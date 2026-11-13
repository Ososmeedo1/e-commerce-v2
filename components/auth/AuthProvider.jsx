"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, apiFetch } from "../../lib/api";
import { clearToken, getToken, setToken } from "../../lib/auth";
import { OTP_TOKEN_KEY, RESET_TOKEN_KEY } from "../../lib/config";
import { getProfile, loginUser, registerUser } from "../../lib/endpoints";

// Value shape is FROZEN (docs/CONVENTIONS.md §8): Phase 3 replaced stub
// bodies only. `refresh` is the one prompt-authorized addition (Phase 7 use).
const AuthContext = createContext({
  user: null,
  token: null,
  status: "guest",
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  // 'loading' first: server and hydration render identically (no mismatch),
  // then the mount effect below resolves guest vs user.
  const [state, setState] = useState({
    user: null,
    token: null,
    status: "loading",
  });
  // Monotonic session generation. Bumped by logout/login so in-flight
  // profile requests started under an older session cannot restore a stale
  // user after the session has been cleared or replaced.
  const sessionRef = useRef(0);

  // Mount-time session restore: sync external system (localStorage) into
  // state exactly once. Suppression is intentional — this is the sanctioned
  // "sync external store on mount" case, not derived state.
  useEffect(() => {
    const session = sessionRef.current;
    const stored = getToken();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ user: null, token: null, status: "guest" });
      return;
    }
    let cancelled = false;
    apiFetch(getProfile(), { auth: true })
      .then((res) => {
        if (cancelled || sessionRef.current !== session) return;
        const restored = (res && res.data && res.data.user) || null;
        // Re-mirror the role: a refreshed tab must fence /admin like a login.
        setToken(stored, restored?.userType);
        setState({
          user: restored,
          token: stored,
          status: "user",
        });
      })
      .catch(() => {
        if (cancelled || sessionRef.current !== session) return;
        clearToken();
        setState({ user: null, token: null, status: "guest" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const session = ++sessionRef.current;
    const res = await apiFetch(loginUser(), {
      method: "POST",
      body: { email, password },
    });
    const jwt = res && res.data;
    if (!jwt || typeof jwt !== "string") {
      // TODO Q15: confirm backend error shape for non-string `data`.
      throw new ApiError(500, "Login did not return a token.", res);
    }
    setToken(jwt);
    const me = await apiFetch(getProfile(), { auth: true });
    if (sessionRef.current !== session) {
      // Logout (or a newer login) started while this profile was in flight.
      throw new ApiError(409, "Login was superseded by a session change.");
    }
    const user = (me && me.data && me.data.user) || null;
    // Role cookie only after the profile proves who this token belongs to.
    // Profile failure throws above → no role cookie is written.
    setToken(jwt, user?.userType);
    setState({ user, token: jwt, status: "user" });
    return { ok: true, user };
  }, []);

  const register = useCallback(
    async (payload) => {
      await apiFetch(registerUser(), { method: "POST", body: payload });
      // Register returns NO token (docs/API_REFERENCE.md §4.1) → auto-login.
      try {
        const done = await login(payload.email, payload.password);
        return { ok: true, user: done.user };
      } catch {
        return { ok: true, needsLogin: true };
      }
    },
    [login]
  );

  const logout = useCallback(() => {
    // Client-side only — no backend logout endpoint (docs/AUTH_FLOW.md §2.6).
    // Invalidate any in-flight profile/refresh request before clearing so a
    // late response cannot restore the user we are logging out.
    sessionRef.current += 1;
    clearToken();
    try {
      window.sessionStorage.removeItem(OTP_TOKEN_KEY);
      window.sessionStorage.removeItem(RESET_TOKEN_KEY);
    } catch {
      // Storage unavailable — nothing to wipe.
    }
    setState({ user: null, token: null, status: "guest" });
  }, []);

  const refresh = useCallback(async () => {
    const session = sessionRef.current;
    const stored = getToken();
    if (!stored) {
      setState({ user: null, token: null, status: "guest" });
      return null;
    }
    const me = await apiFetch(getProfile(), { auth: true });
    if (sessionRef.current !== session) return null;
    const user = (me && me.data && me.data.user) || null;
    setState({ user, token: stored, status: "user" });
    return user;
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      status: state.status,
      login,
      register,
      logout,
      refresh,
    }),
    [state, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
