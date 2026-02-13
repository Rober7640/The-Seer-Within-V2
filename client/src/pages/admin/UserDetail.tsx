import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  MessageSquare,
  Brain,
  Ban,
  Gift,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  creditMinutes: number;
  totalMinutesUsed: number;
  accountStatus: string;
  defaultPersonaId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserSession {
  id: string;
  personaId: string;
  personaName: string;
  personaAvatar: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  minutesCharged: number;
  status: string;
  messageCount: number;
}

interface UserPurchase {
  id: string;
  packageType: string;
  minutesPurchased: number;
  priceUsd: number;
  status: string;
  createdAt: string;
}

interface UserMemoryItem {
  id: string;
  personaId: string;
  personaName: string;
  memoryType: string;
  summary: string;
  importance: number;
  category: string | null;
  createdAt: string;
  lastAccessedAt: string | null;
}

export default function UserDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [memories, setMemories] = useState<UserMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "sessions" | "purchases" | "memories"
  >("sessions");

  useEffect(() => {
    if (!userId) return;
    fetchUserData();
  }, [userId]);

  async function fetchUserData() {
    setLoading(true);
    try {
      const [userRes, sessionsRes, memoriesRes] =
        await Promise.all([
          adminFetch(`/api/admin/users/${userId}`),
          adminFetch(`/api/admin/users/${userId}/sessions`),
          adminFetch(`/api/admin/users/${userId}/memory`),
        ]);

      if (userRes.ok) {
        const data = await userRes.json();
        // Backend returns { user, personaBreakdown, recentPurchases, memoryCount }
        setUser(data.user || data);
        setPurchases(data.recentPurchases || []);
      }
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
      if (memoriesRes.ok) {
        const data = await memoriesRes.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleGrantCredits = async () => {
    const minutesStr = window.prompt("Minutes to grant:");
    if (!minutesStr) return;
    const minutes = parseInt(minutesStr);
    if (isNaN(minutes) || minutes <= 0) return;

    try {
      const res = await adminFetch(`/api/admin/users/${userId}/credits`, {
        method: "PATCH",
        body: JSON.stringify({ minutes, reason: "Admin grant" }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) =>
          prev ? { ...prev, creditMinutes: data.user?.newBalance ?? prev.creditMinutes } : prev,
        );
      }
    } catch (err) {
      console.error("Failed to grant credits:", err);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus =
      user.accountStatus === "active" ? "suspended" : "active";
    if (
      !window.confirm(
        `${newStatus === "suspended" ? "Suspend" : "Reactivate"} this user?`,
      )
    )
      return;

    try {
      // Use credits endpoint with 0 adjustment to trigger a status-like update
      // TODO: Backend needs a dedicated user status endpoint
      const res = await adminFetch(`/api/admin/users/${userId}/credits`, {
        method: "PATCH",
        body: JSON.stringify({
          minutes: 0,
          reason: `Account ${newStatus} by admin`,
        }),
      });
      if (res.ok) {
        setUser((prev) =>
          prev ? { ...prev, accountStatus: newStatus } : prev,
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  // Group sessions by persona
  const sessionsByPersona = sessions.reduce(
    (acc, s) => {
      if (!acc[s.personaName]) acc[s.personaName] = [];
      acc[s.personaName].push(s);
      return acc;
    },
    {} as Record<string, UserSession[]>,
  );

  return (
    <AdminLayout title={user ? `${user.firstName} (${user.email})` : "User"}>
      <button
        onClick={() => navigate("/admin/users")}
        className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* User overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">
                  {user.creditMinutes}
                </p>
                <p className="text-xs text-gray-500">Credits (min)</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">
                  {sessions.length}
                </p>
                <p className="text-xs text-gray-500">Sessions</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">
                  $
                  {(
                    purchases.reduce((sum, p) => sum + p.priceUsd, 0) / 100
                  ).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Total Spent</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <Brain className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">
                  {memories.length}
                </p>
                <p className="text-xs text-gray-500">Memories</p>
              </CardContent>
            </Card>
          </div>

          {/* User info bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>
              Joined:{" "}
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
            <span>
              Last login:{" "}
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : "Never"}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                user.accountStatus === "active"
                  ? "text-green-400 border-green-800"
                  : "text-red-400 border-red-800"
              }`}
            >
              {user.accountStatus}
            </Badge>
          </div>

          {/* Admin actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-gray-400 border-gray-700"
              onClick={handleGrantCredits}
            >
              <Gift className="w-4 h-4 mr-1" />
              Grant Credits
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`${
                user.accountStatus === "active"
                  ? "text-red-400 border-red-800"
                  : "text-green-400 border-green-800"
              }`}
              onClick={handleToggleStatus}
            >
              <Ban className="w-4 h-4 mr-1" />
              {user.accountStatus === "active" ? "Suspend" : "Reactivate"}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-800">
            {(["sessions", "purchases", "memories"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 pb-3 text-sm transition-colors border-b-2 ${
                  activeTab === tab
                    ? "text-purple-300 border-purple-500"
                    : "text-gray-500 border-transparent hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Sessions tab */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              {Object.entries(sessionsByPersona).map(
                ([personaName, personaSessions]) => (
                  <Card
                    key={personaName}
                    className="bg-gray-900 border-gray-800"
                  >
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage
                            src={
                              personaSessions[0]?.personaAvatar ||
                              "/evelyn-avatar.png"
                            }
                          />
                          <AvatarFallback>
                            {personaName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {personaName}
                        <Badge
                          variant="outline"
                          className="text-[10px] text-gray-500 border-gray-700"
                        >
                          {personaSessions.length} sessions
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {personaSessions.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg text-sm"
                          >
                            <div>
                              <span className="text-white">
                                {new Date(s.startedAt).toLocaleDateString()}
                              </span>
                              <span className="text-gray-500 ml-2">
                                {formatDuration(s.durationSeconds)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {s.messageCount} messages
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  s.status === "active"
                                    ? "text-green-400 border-green-800"
                                    : "text-gray-500 border-gray-700"
                                }`}
                              >
                                {s.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
              {sessions.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-8">
                  No sessions yet.
                </p>
              )}
            </div>
          )}

          {/* Purchases tab */}
          {activeTab === "purchases" && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                {purchases.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">
                    No purchases yet.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {purchases.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <p className="text-sm text-white">
                            {p.minutesPurchased} minutes ({p.packageType})
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(p.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">
                            ${(p.priceUsd / 100).toFixed(2)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              p.status === "completed"
                                ? "text-green-400 border-green-800"
                                : "text-gray-500 border-gray-700"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Memories tab */}
          {activeTab === "memories" && (
            <div className="space-y-3">
              {memories.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">
                  No memories stored yet.
                </p>
              ) : (
                memories.map((m) => (
                  <Card
                    key={m.id}
                    className="bg-gray-900 border-gray-800"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] text-purple-400 border-purple-800"
                          >
                            {m.personaName}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-gray-500 border-gray-700"
                          >
                            {m.memoryType}
                          </Badge>
                          {m.category && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-gray-500 border-gray-700"
                            >
                              {m.category}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600">
                          Importance: {m.importance}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{m.summary}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                        <span>
                          Created: {new Date(m.createdAt).toLocaleString()}
                        </span>
                        {m.lastAccessedAt && (
                          <span>
                            Last accessed:{" "}
                            {new Date(m.lastAccessedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-12">
          User not found.
        </p>
      )}
    </AdminLayout>
  );
}
