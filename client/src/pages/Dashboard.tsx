import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsageChart } from "@/components/UsageChart";
import {
  Clock,
  Coins,
  Download,
  BarChart3,
  User,
  Calendar,
  MessageSquare,
  Settings,
  CreditCard,
  Activity,
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

interface UsagePoint {
  month: string;
  sessions: number;
  minutesUsed: number;
}

interface CreditPoint {
  month: string;
  totalMinutes: number;
  totalSpent: number;
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
  creditHistory: CreditPoint[];
  usageHistory: UsagePoint[];
}

type TabId = "overview" | "sessions" | "purchases" | "account";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

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
        a.download = `transcript-${sessionId.slice(0, 8)}.txt`;
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

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Layout handles auth - just show loading if still fetching data
  if (authLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/80 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { user: userInfo, summary, recentSessions, purchaseHistory, creditHistory, usageHistory } = stats;

  // Credit gauge calculation
  const maxCredits = Math.max(userInfo.coinBalance, 3600);
  const gaugePercent = Math.min(100, (userInfo.coinBalance / maxCredits) * 100);
  const gaugeColor =
    userInfo.coinBalance <= 180
      ? "from-red-500 to-red-600"
      : userInfo.coinBalance <= 600
        ? "from-amber-500 to-orange-500"
        : "from-purple-500 to-purple-600";

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "sessions", label: "Sessions", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "purchases", label: "Purchases", icon: <CreditCard className="w-4 h-4" /> },
    { id: "account", label: "Account", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="py-6 pb-20 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-white font-serif text-2xl">
          Welcome, {userInfo.firstName}
        </p>
        <p className="text-white/50 text-xs">
          Member since {formatDate(userInfo.memberSince)}
        </p>
      </div>

        {/* Credit Gauge Card */}
        <Card className="bg-gradient-to-br from-purple-900/80 to-purple-800/60 border-purple-700/30 backdrop-blur-md mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-purple-200 text-xs uppercase tracking-wider">Credit Balance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold text-white font-serif">
                    {userInfo.coinBalance}
                  </span>
                  <span className="text-purple-200 text-sm">coins</span>
                </div>
              </div>
              <Link href="/credits">
                <Button
                  size="sm"
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
                >
                  <Coins className="w-3.5 h-3.5 mr-1.5" />
                  Add Credits
                </Button>
              </Link>
            </div>
            {/* Visual gauge bar */}
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${gaugeColor} rounded-full transition-all duration-700`}
                style={{ width: `${gaugePercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-purple-300">
              <span>{userInfo.totalCoinsUsed} coins used all-time</span>
              <span>{summary.totalSessions} sessions total</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-white/90 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <Activity className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{summary.totalSessions}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Sessions</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">
                {formatDuration(summary.totalDurationSeconds)}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Time</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <Coins className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(
                  purchaseHistory
                    .filter((p) => p.status === "completed")
                    .reduce((sum, p) => sum + p.priceUsd, 0)
                )}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white/10 backdrop-blur-md rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <Card className="bg-white/90 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Usage Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UsageChart usageData={usageHistory} creditData={creditHistory} />
            </CardContent>
          </Card>
        )}

        {activeTab === "sessions" && (
          <Card className="bg-white/90 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentSessions.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No sessions yet. Start a reading to see your history here.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {session.personaName || "Unknown Guide"}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${
                                session.status === "active"
                                  ? "border-green-300 text-green-700 bg-green-50"
                                  : "border-gray-200 text-gray-500"
                              }`}
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(session.startedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(session.durationSeconds)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              {session.coinsCharged} coins
                            </span>
                          </div>
                          {session.lastTopic && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              Topic: {session.lastTopic}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownloadTranscript(session.id)}
                          disabled={downloadingId === session.id}
                          className="shrink-0 p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Download transcript"
                        >
                          {downloadingId === session.id ? (
                            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "purchases" && (
          <Card className="bg-white/90 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Purchase History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {purchaseHistory.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No purchases yet.{" "}
                  <Link href="/credits" className="text-purple-600 underline">
                    Get credits
                  </Link>{" "}
                  to start.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {purchaseHistory.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {purchase.coinsPurchased} coins
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(purchase.createdAt)} - {purchase.packageType}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatPrice(purchase.priceUsd)}
                        </span>
                        <Badge
                          variant={purchase.status === "completed" ? "default" : "outline"}
                          className={
                            purchase.status === "completed"
                              ? "bg-green-100 text-green-700 border-0 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "account" && (
          <div className="space-y-4">
            {/* Account Info */}
            <Card className="bg-white/90 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-900 font-medium">{userInfo.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="text-gray-900 font-medium">{userInfo.firstName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <Badge
                      className={
                        userInfo.accountStatus === "active"
                          ? "bg-green-100 text-green-700 border-0"
                          : "bg-red-100 text-red-700 border-0"
                      }
                    >
                      {userInfo.accountStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Member Since</span>
                    <span className="text-gray-900">{formatDate(userInfo.memberSince)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="bg-white/90 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                      minLength={8}
                    />
                  </div>
                  {passwordMessage && (
                    <p
                      className={`text-xs ${
                        passwordMessage.type === "success" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {passwordMessage.text}
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {changingPassword ? "Changing..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Logout */}
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
  );
}
