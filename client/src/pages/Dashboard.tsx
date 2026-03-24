import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Download,
  User,
  Settings,
  Sparkles,
  Plus,
  Bookmark,
} from "lucide-react";

interface SessionInfo {
  id: string;
  personaId: string;
  personaName: string | null;
  personaAvatar: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  coinsCharged: number;
  status: string;
  lastTopic: string | null;
}

interface PurchaseInfo {
  id: string;
  packageType: string;
  coinsPurchased: number;
  priceUsd: number;
  status: string;
  createdAt: string;
}

interface SavedMessageInfo {
  messageId: string;
  sessionId: string;
  content: string;
  role: string;
  savedAt: string;
}

interface UserStats {
  user: {
    id: string;
    email: string;
    firstName: string;
    coinBalance: number;
    totalCoinsUsed: number;
    accountStatus: string;
    memberSince: string;
  };
  summary: {
    totalSessions: number;
    totalDurationSeconds: number;
    totalMinutesCharged: number;
  };
  recentSessions: SessionInfo[];
  purchaseHistory: PurchaseInfo[];
  savedMessages: SavedMessageInfo[];
}

interface PersonaGroup {
  personaId: string;
  personaName: string;
  personaAvatar: string | null;
  sessions: SessionInfo[];
}

export default function Dashboard() {
  const { isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Scroll to #account section when navigated with hash
  useEffect(() => {
    if (statsLoading || !stats) return;

    const scrollToHash = () => {
      if (window.location.hash === "#account") {
        const el = document.getElementById("account");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    };

    // Check on load
    scrollToHash();

    // Also listen for hash changes (Wouter sets hash after navigation)
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [statsLoading, stats]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchStats() {
      try {
        const res = await authFetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, [isAuthenticated]);

  const handleDownloadTranscript = async (sessionId: string) => {
    setDownloadingId(sessionId);
    try {
      const res = await authFetch(`/api/user/session/${sessionId}/transcript`);
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reading-${sessionId.slice(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download transcript:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (res.ok) {
        setPasswordMessage({ type: "success", text: "Password changed successfully" });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        setPasswordMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Failed to change password" });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });

  const formatFullDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const coinsToMinutes = (coins: number) => Math.floor(coins / 60);

  if (authLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm">The spirits are gathering…</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { user: userInfo, recentSessions, purchaseHistory, savedMessages } = stats;
  const minutesRemaining = coinsToMinutes(userInfo.coinBalance);
  const isLowOnTime = minutesRemaining < 3;

  // Index saved messages by sessionId for quick lookup
  const savedBySession = new Map<string, SavedMessageInfo[]>();
  for (const sm of savedMessages ?? []) {
    if (!savedBySession.has(sm.sessionId)) savedBySession.set(sm.sessionId, []);
    savedBySession.get(sm.sessionId)!.push(sm);
  }

  // Group sessions by persona
  const personaMap = new Map<string, PersonaGroup>();
  for (const session of recentSessions) {
    const key = session.personaId;
    if (!personaMap.has(key)) {
      personaMap.set(key, {
        personaId: session.personaId,
        personaName: session.personaName || "Your Guide",
        personaAvatar: session.personaAvatar,
        sessions: [],
      });
    }
    personaMap.get(key)!.sessions.push(session);
  }
  const personaGroups = Array.from(personaMap.values());

  return (
    <div className="py-10 pb-24 space-y-12 max-w-lg mx-auto px-4">

      {/* Welcome */}
      <div>
        <h1 className="text-white font-serif text-3xl font-medium leading-snug">
          Welcome back,<br />{userInfo.firstName}
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Your guides are ready for you
        </p>
      </div>

      {/* Time + CTA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-2 text-sm ${isLowOnTime ? "text-amber-300" : "text-white/60"}`}>
            <Sparkles className={`w-3.5 h-3.5 ${isLowOnTime ? "text-amber-400" : "text-purple-400"}`} />
            {minutesRemaining === 0
              ? "No time remaining"
              : `${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""} remaining`}
          </span>
          <Link href="/credits">
            <button className="flex items-center gap-1 text-xs text-purple-300/70 hover:text-purple-200 transition-colors">
              <Plus className="w-3 h-3" />
              Add time
            </button>
          </Link>
        </div>
        <Link href="/reading">
          <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-medium">
            Begin a New Reading
          </Button>
        </Link>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Your Journey */}
      <section className="space-y-10">
        <h2 className="text-white/50 text-xs uppercase tracking-widest">
          Your Journey
        </h2>

        {personaGroups.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-white/30 text-sm">
              Your readings will appear here after your first session.
            </p>
            <Link href="/reading">
              <button className="text-purple-300/70 text-sm hover:text-purple-200 transition-colors">
                Begin your journey →
              </button>
            </Link>
          </div>
        ) : (
          personaGroups.map((group, groupIndex) => (
            <div key={group.personaId}>
              {/* Guide header */}
              <div className="mb-5">
                <p className="text-white font-serif text-lg">
                  {group.personaName}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  {group.sessions.length} {group.sessions.length === 1 ? "reading" : "readings"}
                </p>
              </div>

              {/* Session entries */}
              <div className="space-y-0 border-l border-white/10 ml-2">
                {group.sessions.map((session, i) => (
                  <div
                    key={session.id}
                    className="relative pl-6 pb-6 last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1.5 w-[5px] h-[5px] rounded-full bg-purple-400/60 -translate-x-[2.5px]" />

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white/50 text-xs">
                          {formatShortDate(session.startedAt)}
                        </p>
                        {session.lastTopic && (
                          <p className="text-white/80 text-sm mt-1 italic leading-snug">
                            {session.lastTopic}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownloadTranscript(session.id)}
                        disabled={downloadingId === session.id}
                        className="shrink-0 mt-0.5 text-white/20 hover:text-purple-300 transition-colors disabled:opacity-50"
                        title="Save this reading"
                      >
                        {downloadingId === session.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Saved messages from this session */}
                    {(savedBySession.get(session.id) ?? []).map((sm) => (
                      <div
                        key={sm.messageId}
                        className="mt-2 flex items-start gap-2"
                      >
                        <Bookmark className="w-3 h-3 mt-0.5 shrink-0 fill-purple-400 text-purple-400" />
                        <p className="text-white/60 text-xs italic leading-snug">
                          {sm.content.length > 160
                            ? sm.content.slice(0, 160) + "…"
                            : sm.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Separator between guides */}
              {groupIndex < personaGroups.length - 1 && (
                <div className="mt-10 border-t border-white/10" />
              )}
            </div>
          ))
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Account */}
      <section id="account" className="space-y-5 scroll-mt-8">
        <h2 className="text-white/50 text-xs uppercase tracking-widest">
          Account
        </h2>

        <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10 text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="text-white/40">Email</span>
            <span className="text-white/70">{userInfo.email}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-white/40">Name</span>
            <span className="text-white/70">{userInfo.firstName}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-white/40">Member since</span>
            <span className="text-white/70">{formatFullDate(userInfo.memberSince)}</span>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
          <p className="text-white/30 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-3 h-3" />
            Change Password
          </p>
          <form onSubmit={handleChangePassword} className="space-y-2.5">
            {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
              <input
                key={field}
                type="password"
                placeholder={
                  field === "currentPassword"
                    ? "Current password"
                    : field === "newPassword"
                    ? "New password"
                    : "Confirm new password"
                }
                value={passwordForm[field]}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                required
                minLength={field !== "currentPassword" ? 8 : undefined}
              />
            ))}
            {passwordMessage && (
              <p className={`text-xs ${passwordMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {passwordMessage.text}
              </p>
            )}
            <Button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm"
            >
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </div>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full text-sm text-red-400/50 hover:text-red-400 py-2 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
