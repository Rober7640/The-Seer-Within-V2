import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, CheckCircle, XCircle } from "lucide-react";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const token = params.token;

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/auth/reset-password/${token}/validate`);
        const data = await res.json();
        setTokenValid(data.valid === true);
      } catch {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    }
    if (token) {
      validate();
    } else {
      setValidating(false);
      setTokenValid(false);
    }
  }, [token]);

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
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Auto-login if server returned a JWT
        if (data.token) {
          localStorage.setItem("seer_auth_token", data.token);
          // Redirect to pending persona chat or default reading page
          const pendingPersona = localStorage.getItem("seer-pending-persona");
          if (pendingPersona) {
            localStorage.removeItem("seer-pending-persona");
            navigate(`/chat/${pendingPersona}`);
            return;
          }
          navigate("/reading");
          return;
        }
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Invalid or expired token
  if (!tokenValid && !success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <CosmicBackground />

        <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <CardTitle className="font-serif text-xl text-gray-900">
                Link Expired
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <div className="pt-2 space-y-2">
              <Link href="/forgot-password">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm">
                  Request New Reset Link
                </Button>
              </Link>
              <Link
                href="/login"
                className="text-xs text-purple-600 hover:underline block"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Password Reset
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-purple-600" />
            <CardTitle className="font-serif text-xl text-gray-900">
              Set New Password
            </CardTitle>
          </div>
          <p className="text-xs text-gray-500">
            Choose a new password for your account
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
                New Password
              </label>
              <input
                type="password"
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
                "Reset Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
