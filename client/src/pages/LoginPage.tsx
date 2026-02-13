import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login, register } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await register(email, password, firstName);
      } else {
        await login(email, password);
      }
      navigate("/reading");
    } catch (err: any) {
      setError(
        err?.message?.includes("401")
          ? "Invalid email or password"
          : err?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle className="font-serif text-xl text-gray-900">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
          </div>
          <p className="text-xs text-gray-500">
            {isSignUp
              ? "Start your journey with a personal guide"
              : "Sign in to continue your reading"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-red-600 text-xs p-2 bg-red-50 rounded-lg text-center">
                {error}
              </p>
            )}

            {isSignUp && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={isSignUp}
                  className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                  placeholder="Your first name"
                />
              </div>
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
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                placeholder={isSignUp ? "Min 6 characters" : "Your password"}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-purple-600 hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
