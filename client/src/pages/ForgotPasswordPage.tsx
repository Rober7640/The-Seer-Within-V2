import { useState } from "react";
import { Link } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("email") || "";
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else if (res.status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <CosmicBackground />

        <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <CardTitle className="font-serif text-xl text-gray-900">
                Check Your Email
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              If an account exists for <strong>{email}</strong>, we sent a
              password reset link. Please check your email.
            </p>
            <p className="text-xs text-gray-400">
              The link expires in 1 hour.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full text-sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-purple-600" />
            <CardTitle className="font-serif text-xl text-gray-900">
              Reset Password
            </CardTitle>
          </div>
          <p className="text-xs text-gray-500">
            Enter your email to receive a password reset link
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
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                placeholder="you@example.com"
                autoFocus
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
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-xs text-purple-600 hover:underline"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
