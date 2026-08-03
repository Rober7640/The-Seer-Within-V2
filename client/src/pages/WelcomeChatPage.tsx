import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, AlertCircle, LogIn } from "lucide-react";
import { coinsToClock } from "@shared/types";

type MigrationState =
  | "checking"
  | "eligible"
  | "already_migrated"
  | "not_eligible"
  | "migrating"
  | "success"
  | "error";

export default function WelcomeChatPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();

  const [state, setState] = useState<MigrationState>("checking");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [coinBalance, setCoinBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Extract email from URL params (passed from success page)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
      checkEligibility(emailParam);
    } else {
      setState("not_eligible");
    }
  }, [searchString]);

  async function checkEligibility(emailToCheck: string) {
    try {
      const res = await fetch("/api/migrate/check-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck }),
      });

      const data = await res.json();

      if (data.alreadyMigrated) {
        setState("already_migrated");
      } else if (data.eligible) {
        setFirstName(data.firstName || "");
        setState("eligible");
      } else {
        setState("not_eligible");
        setError(data.error || "Not eligible for migration");
      }
    } catch {
      setState("error");
      setError("Failed to check eligibility");
    }
  }

  async function handleMigrate() {
    setState("migrating");
    setError(null);

    try {
      const res = await fetch("/api/migrate/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        // Store the token so user is auto-logged-in
        localStorage.setItem("seer_auth_token", data.token);
        setCoinBalance(data.coinBalance);
        setState("success");
      } else {
        if (data.error?.includes("already exists")) {
          setState("already_migrated");
        } else {
          setState("error");
          setError(data.error || "Migration failed");
        }
      }
    } catch {
      setState("error");
      setError("Migration failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        {state === "checking" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-xl text-gray-900">
                Setting Up Your Account...
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </CardContent>
          </>
        )}

        {state === "eligible" && (
          <>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <CardTitle className="font-serif text-xl text-gray-900">
                  Welcome{firstName ? `, ${firstName}` : ""}!
                </CardTitle>
              </div>
              <p className="text-sm text-gray-500">
                As a valued customer, you get exclusive access to our personal
                chat service with bonus minutes.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-700 font-medium">
                  Your bonus includes 15+ minutes of personal guidance
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  An account will be created and credentials sent to {email}
                </p>
              </div>

              <Button
                onClick={handleMigrate}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Activate My Chat Service
              </Button>

              <Link
                href="/success"
                className="block text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Go back
              </Link>
            </CardContent>
          </>
        )}

        {state === "migrating" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-xl text-gray-900">
                Creating Your Account...
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                Setting up your personal guidance account with bonus minutes...
              </p>
            </CardContent>
          </>
        )}

        {state === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <CardTitle className="font-serif text-xl text-gray-900">
                  You're All Set!
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">
                  Account created with {coinsToClock(coinBalance)} of bonus reading time!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Login credentials sent to {email}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Please change your password after your first login.
              </p>

              <Button
                onClick={() => navigate("/reading")}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                Start Your Reading
              </Button>
            </CardContent>
          </>
        )}

        {state === "already_migrated" && (
          <>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <LogIn className="w-5 h-5 text-purple-600" />
                <CardTitle className="font-serif text-xl text-gray-900">
                  Account Already Exists
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                An account for {email} already exists. Please sign in to
                continue.
              </p>
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </CardContent>
          </>
        )}

        {(state === "not_eligible" || state === "error") && (
          <>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <CardTitle className="font-serif text-xl text-gray-900">
                  Unable to Create Account
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                {error || "We couldn't automatically create your account."}
              </p>
              <p className="text-xs text-gray-400">
                You can create a new account manually to get started.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="flex-1"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                >
                  Create Account
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
