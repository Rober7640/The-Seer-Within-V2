// SetPasswordPage: Shown to migrated V1 users on their first magic link login.
// They are already authenticated (JWT in localStorage) — this page just lets
// them choose a password so they can log in normally in the future.

import { useState } from "react";
import { useLocation } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, CheckCircle } from "lucide-react";

const AUTH_TOKEN_KEY = "seer_auth_token";

export default function SetPasswordPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Capture the post-password destination once on mount (handleContinue clears it).
  // A /7-7 destination means the user arrived through the 7/7 promo lander, so the
  // success screen advertises the promo's "7 free minutes" instead of the default
  // 3-minute migration trial. Any other flow keeps the 3-minute copy.
  const [postRedirect] = useState(() => sessionStorage.getItem("post_password_redirect") || "");
  const isPromo7 = postRedirect.startsWith("/7-7");
  const freeMinutes = isPromo7 ? 7 : 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setError("Session expired. Please use your email link again.");
        return;
      }

      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // Replace the old JWT with the fresh one (old one is invalidated by password change)
        if (data.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        }
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to set password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Use the destination captured on mount (7/7 promo lands on /7-7 so the claim fires).
    sessionStorage.removeItem("post_password_redirect");
    navigate(postRedirect || "/reading", { replace: true });
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <CosmicBackground />

        <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CardTitle className="font-serif text-xl text-gray-900">
                You're All Set
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Your password has been saved. You can now sign in anytime with your email and password.
            </p>
            <p className="text-sm text-gray-600">
              You have <strong>{freeMinutes} free minutes</strong> waiting for you. Let's begin your reading.
            </p>
            <div className="pt-2">
              <Button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                Start Your Reading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Set password form
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-purple-600" />
            <CardTitle className="font-serif text-xl text-gray-900">
              Welcome Back
            </CardTitle>
          </div>
          <p className="text-sm text-gray-500">
            Set a password so you can sign in anytime
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-red-600 text-xs p-2 bg-red-50 rounded-lg text-center">
                {error}
              </p>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                placeholder="Min 8 characters"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                placeholder="Repeat your password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Set Password"
              )}
            </Button>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1"
            >
              Skip for now
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
