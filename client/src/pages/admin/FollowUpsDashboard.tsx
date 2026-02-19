import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Send,
  Eye,
  MousePointerClick,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface FollowUpEmail {
  id: string;
  userId: string;
  personaId: string;
  recipientEmail: string;
  subject: string;
  status: string;
  sentAt: string | null;
  opened: boolean;
  clicked: boolean;
  openedAt: string | null;
  clickedAt: string | null;
  generatedBy: string;
  daysSinceLastSession: number | null;
  createdAt: string;
}

interface FollowUpStats {
  total: number;
  byStatus: Record<string, number>;
  engagement: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: string;
    clickRate: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-800",
  sent: "text-green-400 border-green-800",
  failed: "text-red-400 border-red-800",
  bounced: "text-orange-400 border-orange-800",
};

export default function FollowUpsDashboard() {
  const [emails, setEmails] = useState<FollowUpEmail[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const [emailsRes, statsRes] = await Promise.all([
        adminFetch(`/api/admin/follow-ups?${params}`),
        adminFetch("/api/admin/follow-ups/stats"),
      ]);

      if (emailsRes.ok) {
        const data = await emailsRes.json();
        setEmails(data.emails);
        setTotal(data.total);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch follow-up data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview(id: string) {
    if (previewId === id) {
      setPreviewId(null);
      setPreviewContent(null);
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/follow-ups/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewContent(data.email);
        setPreviewId(id);
      }
    } catch (err) {
      console.error("Failed to fetch email preview:", err);
    }
  }

  async function handleExport() {
    try {
      const res = await adminFetch("/api/admin/follow-ups/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "follow_up_emails.csv";
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  return (
    <AdminLayout title="Follow-Up Emails">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard
            icon={Mail}
            iconColor="text-blue-400"
            iconBg="bg-blue-600/20"
            label="Total"
            value={stats.total}
          />
          <StatCard
            icon={Send}
            iconColor="text-green-400"
            iconBg="bg-green-600/20"
            label="Sent"
            value={stats.engagement.sent}
          />
          <StatCard
            icon={Eye}
            iconColor="text-purple-400"
            iconBg="bg-purple-600/20"
            label="Open Rate"
            value={`${stats.engagement.openRate}%`}
            sub={`${stats.engagement.opened} opened`}
          />
          <StatCard
            icon={MousePointerClick}
            iconColor="text-amber-400"
            iconBg="bg-amber-600/20"
            label="Click Rate"
            value={`${stats.engagement.clickRate}%`}
            sub={`${stats.engagement.clicked} clicked`}
          />
          <StatCard
            icon={AlertCircle}
            iconColor="text-red-400"
            iconBg="bg-red-600/20"
            label="Failed"
            value={
              (stats.byStatus["failed"] || 0) +
              (stats.byStatus["bounced"] || 0)
            }
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          size="sm"
          variant="outline"
          className="text-gray-400 border-gray-700"
          onClick={handleExport}
        >
          <Download className="w-3 h-3 mr-1" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-3">
            Showing {emails.length} of {total} follow-up emails
          </div>

          {/* Email list */}
          <Card className="bg-gray-900 border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">
                      Recipient
                    </th>
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">
                      Subject
                    </th>
                    <th className="text-center text-xs text-gray-500 px-4 py-3 font-medium">
                      Status
                    </th>
                    <th className="text-center text-xs text-gray-500 px-4 py-3 font-medium">
                      Opened
                    </th>
                    <th className="text-center text-xs text-gray-500 px-4 py-3 font-medium">
                      Clicked
                    </th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">
                      Days Inactive
                    </th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">
                      Sent
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <>
                      <tr
                        key={email.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">
                            {email.recipientEmail}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-300 truncate max-w-[200px]">
                            {email.subject}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              STATUS_COLORS[email.status] ||
                              "text-gray-400 border-gray-700"
                            }`}
                          >
                            {email.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.opened ? (
                            <Eye className="w-3 h-3 text-green-400 mx-auto" />
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.clicked ? (
                            <MousePointerClick className="w-3 h-3 text-green-400 mx-auto" />
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-400">
                          {email.daysSinceLastSession ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {email.sentAt
                            ? new Date(email.sentAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handlePreview(email.id)}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {/* Preview row */}
                      {previewId === email.id && previewContent && (
                        <tr key={`${email.id}-preview`}>
                          <td colSpan={8} className="px-4 py-4 bg-gray-800/50">
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase mb-1">
                                  Subject
                                </p>
                                <p className="text-sm text-white">
                                  {previewContent.subject}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase mb-1">
                                  Body (Text)
                                </p>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900 rounded p-3">
                                  {previewContent.bodyText}
                                </p>
                              </div>
                              {previewContent.openedAt && (
                                <p className="text-xs text-gray-500">
                                  Opened:{" "}
                                  {new Date(
                                    previewContent.openedAt
                                  ).toLocaleString()}
                                </p>
                              )}
                              {previewContent.clickedAt && (
                                <p className="text-xs text-gray-500">
                                  Clicked:{" "}
                                  {new Date(
                                    previewContent.clickedAt
                                  ).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {emails.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No follow-up emails found.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                size="sm"
                variant="outline"
                className="text-gray-400 border-gray-700"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-gray-400 border-gray-700"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

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
  sub?: string;
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
            {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
