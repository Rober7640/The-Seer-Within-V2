import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  DollarSign,
  MessageSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShoppingCart,
  Eye,
  CheckCircle,
  Percent,
  UserX,
} from "lucide-react";

interface OverviewStats {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalMinutesUsed: number;
  averageSessionDuration: number;
  totalRevenue: number;
  totalPurchases: number;
  activePersonas: number;
}

interface PersonaBreakdown {
  id: string;
  name: string;
  isActive: boolean;
  totalSessions: number;
  totalMinutes: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  totalMessages: number;
}

interface RecentActivity {
  id: string;
  type: "session_start" | "session_end" | "purchase" | "signup";
  description: string;
  personaName: string | null;
  timestamp: string;
}

interface LowCreditUser {
  id: string;
  email: string;
  firstName: string;
  coinBalance: number;
  totalCoinsUsed: number;
  lastLoginAt: string | null;
  accountStatus: string;
}

interface CheckoutSourceBreakdown {
  source: string;
  views: number;
  uniqueUsers: number;
  completed: number;
  conversionRate: number;
}

interface CheckoutDropOffUser {
  id: string;
  email: string;
  firstName: string;
  lastViewedAt: string;
  viewCount: number;
}

interface CheckoutConversion {
  totalViews: number;
  uniqueViewers: number;
  totalCompleted: number;
  conversionRate: number;
  bySource: CheckoutSourceBreakdown[];
  dropOffUsers: CheckoutDropOffUser[];
}

type DateRange = "today" | "7d" | "30d" | "all";

export default function AnalyticsDashboard() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const urlPersonaId = params.get("persona");

  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [personaBreakdown, setPersonaBreakdown] = useState<
    PersonaBreakdown[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lowCreditUsers, setLowCreditUsers] = useState<LowCreditUser[]>([]);
  const [checkoutData, setCheckoutData] = useState<CheckoutConversion>({
    totalViews: 0,
    uniqueViewers: 0,
    totalCompleted: 0,
    conversionRate: 0,
    bySource: [],
    dropOffUsers: [],
  });
  const [checkoutOpen, setCheckoutOpen] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(30);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      // Convert date range to startDate/endDate params
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(2020, 0, 1); // "all" time
      }

      const query = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      });
      if (urlPersonaId) query.set("personaId", urlPersonaId);

      const [overviewRes, breakdownRes, alertsRes, checkoutRes] = await Promise.all([
        adminFetch(`/api/admin/analytics/overview?${query}`),
        adminFetch(`/api/admin/analytics/personas?${query}`),
        adminFetch(`/api/admin/analytics/alerts?threshold=${alertThreshold}`),
        adminFetch(`/api/admin/analytics/checkout-conversion?${query}`),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        // Backend returns { overview: {...}, dateRange }
        setOverview(data.overview || data);
      }
      if (breakdownRes.ok) {
        const data = await breakdownRes.json();
        // Backend returns { personas: [...] }
        setPersonaBreakdown(data.personas || data || []);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setLowCreditUsers(data.alerts || []);
      }
      if (checkoutRes.ok) {
        const data = await checkoutRes.json();
        if (data.checkout) setCheckoutData(data.checkout);
      } else {
        console.error("Checkout conversion API error:", checkoutRes.status);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (cents: number) => `$${((cents ?? 0) / 100).toFixed(2)}`;
  const formatDuration = (minutes: number) => {
    const m = minutes ?? 0;
    if (m < 60) return `${Math.round(m)}m`;
    return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  };

  return (
    <AdminLayout title="Analytics">
      {/* Date range selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(
            [
              { value: "today", label: "Today" },
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "all", label: "All Time" },
            ] as const
          ).map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateRange === range.value
                  ? "bg-purple-600/20 text-purple-300"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        {urlPersonaId && (
          <Badge
            variant="outline"
            className="text-purple-400 border-purple-800"
          >
            Filtered by persona
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              iconColor="text-blue-400"
              iconBg="bg-blue-600/20"
              label="Total Users"
              value={overview?.totalUsers ?? 0}
              sub={`+${overview?.newUsers ?? 0} new in period`}
            />
            <StatCard
              icon={DollarSign}
              iconColor="text-green-400"
              iconBg="bg-green-600/20"
              label="Revenue"
              value={formatCurrency(overview?.totalRevenue ?? 0)}
              sub={`${overview?.totalPurchases ?? 0} purchases`}
            />
            <StatCard
              icon={MessageSquare}
              iconColor="text-amber-400"
              iconBg="bg-amber-600/20"
              label="Sessions"
              value={overview?.totalSessions ?? 0}
              sub={`${overview?.activeUsers ?? 0} active users`}
            />
            <StatCard
              icon={Clock}
              iconColor="text-purple-400"
              iconBg="bg-purple-600/20"
              label="Avg Session"
              value={formatDuration((overview?.averageSessionDuration ?? 0) / 60)}
              sub={`${overview?.totalMinutesUsed ?? 0} min total`}
            />
          </div>

          {/* Active personas indicator */}
          {(overview?.activePersonas ?? 0) > 0 && (
            <Card className="bg-green-900/20 border-green-800 mb-6">
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                <span className="text-green-300 text-sm">
                  {overview?.activePersonas ?? 0} active persona
                  {(overview?.activePersonas ?? 0) !== 1 ? "s" : ""}
                </span>
              </CardContent>
            </Card>
          )}

          {/* Low Credit Alerts */}
          <LowCreditAlerts
            users={lowCreditUsers}
            threshold={alertThreshold}
            open={alertsOpen}
            onToggle={() => setAlertsOpen(!alertsOpen)}
            onThresholdChange={(t) => {
              setAlertThreshold(t);
              fetchAnalytics();
            }}
          />

          {/* Checkout Conversion Funnel */}
          <CheckoutConversionSection
            data={checkoutData}
            open={checkoutOpen}
            onToggle={() => setCheckoutOpen(!checkoutOpen)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Persona breakdown */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Persona Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {personaBreakdown.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">
                      No data available for this period.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {personaBreakdown.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-white">
                              {p.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                p.isActive
                                  ? "text-green-400 border-green-800"
                                  : "text-gray-500 border-gray-700"
                              }`}
                            >
                              {p.isActive ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-lg font-bold text-white">
                                {p.uniqueUsers}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Users
                              </p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white">
                                {p.totalSessions}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Sessions
                              </p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white">
                                {p.totalMinutes}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Minutes
                              </p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white">
                                {formatDuration((p.avgSessionDuration ?? 0) / 60)}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Avg Duration
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent activity */}
            <div>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">
                      No recent activity.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3"
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              activity.type === "purchase"
                                ? "bg-green-400"
                                : activity.type === "signup"
                                  ? "bg-blue-400"
                                  : activity.type === "session_start"
                                    ? "bg-amber-400"
                                    : "bg-gray-500"
                            }`}
                          />
                          <div>
                            <p className="text-xs text-gray-300">
                              {activity.description}
                            </p>
                            <p className="text-[10px] text-gray-600">
                              {new Date(activity.timestamp).toLocaleString()}
                              {activity.personaName &&
                                ` - ${activity.personaName}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

// Source label mapping
const SOURCE_LABELS: Record<string, string> = {
  buy_credits_modal: "Refill (Mid-Session)",
  out_of_credits: "Out of Credits",
  teaser: "Welcome Offer",
  credits_page: "Credits Page",
};

// Checkout Conversion Section
function CheckoutConversionSection({
  data,
  open,
  onToggle,
}: {
  data: CheckoutConversion;
  open: boolean;
  onToggle: () => void;
}) {
  const hasData = data.totalViews > 0;

  return (
    <Card className={`border mb-6 ${hasData ? "bg-teal-950/20 border-teal-800/50" : "bg-gray-900 border-gray-800"}`}>
      <CardHeader className="cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className={`w-4 h-4 ${hasData ? "text-teal-400" : "text-gray-500"}`} />
            <span className={hasData ? "text-teal-300" : "text-gray-400"}>
              Checkout Conversion
            </span>
            {hasData && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal-600/30 text-teal-300 text-[10px] font-bold">
                {data.conversionRate}% rate
              </span>
            )}
          </CardTitle>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          {!hasData ? (
            <p className="text-gray-600 text-sm text-center py-4">
              No checkout data yet. Data will appear as users open payment modals.
            </p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                  <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{data.totalViews}</p>
                  <p className="text-[10px] text-gray-500">Modal Opens</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                  <Users className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{data.uniqueViewers}</p>
                  <p className="text-[10px] text-gray-500">Unique Users</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{data.totalCompleted}</p>
                  <p className="text-[10px] text-gray-500">Users Purchased</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                  <Percent className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{data.conversionRate}%</p>
                  <p className="text-[10px] text-gray-500">Conversion Rate</p>
                </div>
              </div>

              {/* Source breakdown */}
              {data.bySource.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Conversion by Source
                  </h4>
                  <div className="space-y-2">
                    {data.bySource.map((s) => (
                      <div key={s.source} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-white font-medium">
                            {SOURCE_LABELS[s.source] || s.source}
                          </span>
                          <span className={`text-xs font-bold ${s.conversionRate >= 20 ? "text-green-400" : s.conversionRate >= 10 ? "text-amber-400" : "text-red-400"}`}>
                            {s.conversionRate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-gray-500">
                          <span>{s.views} views</span>
                          <span>{s.uniqueUsers} users</span>
                          <span>{s.completed} purchased</span>
                          <span className="text-gray-600">({s.uniqueUsers > 0 ? Math.round((s.completed / s.uniqueUsers) * 100) : 0}% of users)</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-green-500 transition-all"
                            style={{ width: `${Math.min(s.conversionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drop-off users */}
              {data.dropOffUsers.length > 0 && (
                <div>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5" />
                    Users Who Viewed But Didn't Purchase ({data.dropOffUsers.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.dropOffUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {u.firstName}
                            <span className="text-gray-500 font-normal ml-1 text-xs">
                              {u.email}
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-600">
                            {u.viewCount} modal open{u.viewCount !== 1 ? "s" : ""} · Last: {new Date(u.lastViewedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={`/admin/users/${u.id}`}
                          className="text-gray-500 hover:text-purple-400 transition-colors shrink-0"
                          title="View user"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Low Credit Alerts component
function LowCreditAlerts({
  users,
  threshold,
  open,
  onToggle,
  onThresholdChange,
}: {
  users: LowCreditUser[];
  threshold: number;
  open: boolean;
  onToggle: () => void;
  onThresholdChange: (t: number) => void;
}) {
  const THRESHOLD_OPTIONS = [
    { label: "< 1 min (5 coins)", value: 5 },
    { label: "< 3 min (15 coins)", value: 15 },
    { label: "< 5 min (30 coins)", value: 30 },
  ];

  const urgencyColor = (coins: number) => {
    if (coins === 0) return "text-red-400";
    if (coins <= 5) return "text-orange-400";
    return "text-yellow-400";
  };

  const formatCoins = (coins: number) => {
    const c = coins ?? 0;
    if (c === 0) return "Empty";
    const secs = Math.round(c);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const formatLastSeen = (ts: string | null) => {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  return (
    <Card className={`border mb-6 ${users.length > 0 ? "bg-amber-950/20 border-amber-800/50" : "bg-gray-900 border-gray-800"}`}>
      {/* Header — always visible */}
      <CardHeader
        className="cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${users.length > 0 ? "text-amber-400" : "text-gray-500"}`} />
            <span className={users.length > 0 ? "text-amber-300" : "text-gray-400"}>
              Low Credit Alerts
            </span>
            {users.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-600/30 text-amber-300 text-[10px] font-bold">
                {users.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={String(threshold)}
              onValueChange={(v) => onThresholdChange(Number(v))}
            >
              <SelectTrigger
                className="h-7 text-xs w-36 bg-gray-800 border-gray-700 text-gray-300"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {THRESHOLD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} className="text-xs text-gray-300">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {open ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Body — collapsible */}
      {open && (
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">
              No users below threshold — all clear.
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${u.coinBalance === 0 ? "bg-red-400" : u.coinBalance <= 5 ? "bg-orange-400" : "bg-yellow-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {u.firstName}
                        <span className="text-gray-500 font-normal ml-1 text-xs">
                          {u.email}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-600">
                        Last seen: {formatLastSeen(u.lastLoginAt)}
                        {(u.totalCoinsUsed ?? 0) > 0 && ` · ${Math.floor((u.totalCoinsUsed ?? 0) / 60)}m used total`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold ${urgencyColor(u.coinBalance)}`}>
                      {formatCoins(u.coinBalance)}
                    </span>
                    <a
                      href={`/admin/users/${u.id}`}
                      className="text-gray-500 hover:text-purple-400 transition-colors"
                      title="View user"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-gray-600">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
