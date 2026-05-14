import { useState, useCallback, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  coinBalance: number;
  totalCoinsUsed: number;
  defaultPersonaId: string | null;
  accountStatus: string;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AUTH_TOKEN_KEY = "seer_auth_token";

function getToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...authHeaders(),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers, credentials: "include" });
}

// Custom event name for cross-instance auth sync
const AUTH_SYNC_EVENT = 'seer-auth-updated';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: authHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const newState = {
          user: data,
          isLoading: false,
          isAuthenticated: true,
        };
        setState(newState);
        // Broadcast to other useAuth instances so nav/header stay in sync
        window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT, { detail: newState }));
      } else {
        clearToken();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for auth updates from other useAuth instances (e.g. CreditsPage → Nav header)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AuthState>).detail;
      if (detail) setState(detail);
    };
    window.addEventListener(AUTH_SYNC_EVENT, handler);
    return () => window.removeEventListener(AUTH_SYNC_EVENT, handler);
  }, []);

  // Set Sentry user context when auth state changes
  useEffect(() => {
    if (state.user) {
      Sentry.setUser({ id: state.user.id, email: state.user.email });
    } else if (!state.isLoading) {
      Sentry.setUser(null);
    }
  }, [state.user, state.isLoading]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });
      const data = await res.json();
      setToken(data.token);
      await fetchUser();
      return data;
    },
    [fetchUser],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      persona?: string,
      // /evelyn lander handoff fields. All optional — non-lander signups omit them.
      extras?: { source?: string; bucket?: string; landerSessionToken?: string },
    ) => {
      const res = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        firstName,
        ...(persona ? { persona } : {}),
        ...(extras?.source ? { source: extras.source } : {}),
        ...(extras?.bucket ? { bucket: extras.bucket } : {}),
        ...(extras?.landerSessionToken ? { landerSessionToken: extras.landerSessionToken } : {}),
      });
      const data = await res.json();
      setToken(data.token);
      await fetchUser();
      return data;
    },
    [fetchUser],
  );

  const logout = useCallback(async () => {
    // End active chat sessions on the server before clearing the token
    try {
      const token = getToken();
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Best-effort — don't block logout if the call fails
    }
    clearToken();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };
}
