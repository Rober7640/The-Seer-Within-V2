// MagicAuthPage: exchanges a one-click email token for a session JWT
// and redirects the user straight into their persona chat.
//
// URL: /magic-auth?t=<token>

import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const AUTH_TOKEN_KEY = "seer_auth_token";

export default function MagicAuthPage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t");

    if (!token) {
      setError("No magic link token found. Please use the link from your email.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/magic-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "This link has expired or is invalid.");
          return;
        }

        const data = await res.json();

        // Store the JWT exactly as the normal login flow does
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);

        // Navigate to the persona chat, replacing history so Back doesn't re-verify
        const target = data.personaSlug
          ? `/chat/${data.personaSlug}`
          : "/reading";

        navigate(target, { replace: true });
      } catch {
        setError("Something went wrong. Please try logging in normally.");
      }
    })();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ff] px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-3xl mb-4">🔗</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link unavailable</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block w-full py-3 rounded-lg bg-[#6d28d9] text-white text-sm font-medium hover:bg-[#5b21b6] transition-colors"
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ff]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#6d28d9] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Opening your reading…</p>
      </div>
    </div>
  );
}
