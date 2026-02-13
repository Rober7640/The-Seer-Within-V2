import { useState, useCallback, useEffect } from "react";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

interface AdminAuthState {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const ADMIN_TOKEN_KEY = "seer_admin_token";

function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function adminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...adminHeaders(),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers, credentials: "include" });
}

export function useAdmin() {
  const [state, setState] = useState<AdminAuthState>({
    admin: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchAdmin = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setState({ admin: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await fetch("/api/admin/me", {
        headers: adminHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setState({ admin: data.admin, isLoading: false, isAuthenticated: true });
      } else {
        clearAdminToken();
        setState({ admin: null, isLoading: false, isAuthenticated: false });
      }
    } catch {
      setState({ admin: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      setAdminToken(data.token);
      await fetchAdmin();
      return data;
    },
    [fetchAdmin],
  );

  const logout = useCallback(() => {
    clearAdminToken();
    setState({ admin: null, isLoading: false, isAuthenticated: false });
  }, []);

  return { ...state, login, logout };
}
