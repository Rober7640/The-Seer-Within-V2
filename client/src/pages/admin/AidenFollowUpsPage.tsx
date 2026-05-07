import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdmin, adminFetch } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Eye, X, PlayCircle } from "lucide-react";

type SequenceType = "unverified" | "verified_nopurchase";

interface AidenFollowupRow {
  id: string;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  emailVerified: boolean | null;
  sequenceNumber: number;
  scheduledFor: string;
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  errorMessage: string | null;
  subject: string;
  createdAt: string;
}

interface AidenFollowupStats {
  sequenceType?: SequenceType;
  flagEnabled: boolean;
  breakdown: Array<{ status: string; sequenceNumber: number; total: number }>;
  openedTotal: number;
  clickedTotal: number;
}

const statusColors: Record<string, string> = {
  sent: "text-green-400 bg-green-900/30",
  pending: "text-yellow-400 bg-yellow-900/30",
  failed: "text-red-400 bg-red-900/30",
  skipped: "text-gray-400 bg-gray-800/50",
};

// Cadence labels per drip type — shown in the sequence stat cards and filter options.
const sequenceLabel: Record<SequenceType, Record<number, string>> = {
  unverified: { 1: "+10m", 2: "+24h", 3: "+48h" },
  verified_nopurchase: {
    1: "+1h", 2: "+25h", 3: "+49h",
    4: "+4d", 5: "+6d", 6: "+8d", 7: "+10d",
    8: "+12d", 9: "+14d", 10: "+16d", 11: "+18d",
    12: "+20d", 13: "+22d",
  },
};

// Per-tab sequence numbers. Unverified drip stays at 3; verified_nopurchase
// extends to 13 (emails 4–13 added at 48h spacing for a longer nurture window).
const sequenceNumbers: Record<SequenceType, number[]> = {
  unverified: [1, 2, 3],
  verified_nopurchase: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
};

const TAB_META: Record<SequenceType, { title: string; description: string; envFlag: string; flagOnNote: string; flagOffNote: string }> = {
  unverified: {
    title: "Unverified",
    description:
      "Nurture sequence for users who sign up via /aiden but do not verify their email. Rows are scheduled at signup (+10m / +24h / +48h). Cron runs every 5 min. Skips if the user verifies, unsubscribes, changes email, suspends, or the window passes stale.",
    envFlag: "ENABLE_AIDEN_FOLLOWUPS",
    flagOnNote:
      "ENABLE_AIDEN_FOLLOWUPS = true — cron WILL send unverified-drip emails to ripe pending rows.",
    flagOffNote:
      "ENABLE_AIDEN_FOLLOWUPS is OFF — cron and manual trigger will not send any unverified-drip emails. Set the env var to 'true' on Railway to enable.",
  },
  verified_nopurchase: {
    title: "Verified — Not Purchased",
    description:
      "Post-verification nurture for /aiden users who verified and received their free minutes but haven't purchased credits. Rows are scheduled at verification (+1h / +25h / +49h). Cron runs every 5 min. Emails are Haiku-personalized at send time using the user's quiz topic and, if available, their last chat messages with Aiden. Skips on purchase, unsubscribe, email change, suspension, or staleness.",
    envFlag: "ENABLE_AIDEN_VERIFIED_DRIP",
    flagOnNote:
      "ENABLE_AIDEN_VERIFIED_DRIP = true — cron WILL send verified-drip emails to ripe pending rows.",
    flagOffNote:
      "ENABLE_AIDEN_VERIFIED_DRIP is OFF — cron and manual trigger will not send any verified-drip emails. Set the env var to 'true' on Railway to enable.",
  },
};

function sumStatus(breakdown: AidenFollowupStats["breakdown"] | undefined, status: string): number {
  if (!breakdown) return 0;
  return breakdown.filter((r) => r.status === status).reduce((acc, r) => acc + Number(r.total), 0);
}

function sumSeq(breakdown: AidenFollowupStats["breakdown"] | undefined, seq: number, status?: string): number {
  if (!breakdown) return 0;
  return breakdown
    .filter((r) => r.sequenceNumber === seq && (!status || r.status === status))
    .reduce((acc, r) => acc + Number(r.total), 0);
}

export default function AidenFollowUpsPage() {
  const { isAuthenticated } = useAdmin();
  const [activeTab, setActiveTab] = useState<SequenceType>("unverified");
  const [stats, setStats] = useState<AidenFollowupStats | null>(null);
  const [rows, setRows] = useState<AidenFollowupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [seqFilter, setSeqFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);
  const tabMeta = TAB_META[activeTab];

  // Refetch whenever active tab changes OR any filter/page changes.
  useEffect(() => {
    fetchStats();
    // Reset table state when tab changes so filters don't leak across tabs.
    setPage(1);
    setSeqFilter("all");
    setStatusFilter("all");
    setPreviewId(null);
    setPreviewHtml(null);
    setTriggerMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => { fetchRows(); }, [activeTab, page, seqFilter, statusFilter]);

  async function fetchStats() {
    try {
      const params = new URLSearchParams({ sequenceType: activeTab });
      const res = await adminFetch(`/api/admin/aiden-follow-ups/stats?${params}`);
      if (res.ok) setStats(await res.json());
    } catch {}
  }

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sequenceType: activeTab,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (seqFilter !== "all") params.set("sequence", seqFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await adminFetch(`/api/admin/aiden-follow-ups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setTotal(data.pagination?.total ?? 0);
      }
    } catch {} finally { setLoading(false); }
  }

  async function handlePreview(id: string) {
    if (previewId === id) {
      setPreviewId(null);
      setPreviewHtml(null);
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/aiden-follow-ups/preview/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.bodyHtml);
        setPreviewId(id);
      }
    } catch {}
  }

  async function handleTrigger() {
    setTriggering(true);
    setTriggerMessage(null);
    try {
      const params = new URLSearchParams({ sequenceType: activeTab });
      const res = await adminFetch(`/api/admin/aiden-follow-ups/trigger?${params}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const s = data.stats;
        setTriggerMessage(
          s.flagEnabled
            ? `Processed ${s.processed} — sent ${s.sent}, skipped ${s.skipped}, failed ${s.failed}`
            : data.note || "Flag is OFF — no emails sent.",
        );
        await Promise.all([fetchStats(), fetchRows()]);
      } else {
        setTriggerMessage("Trigger failed.");
      }
    } catch {
      setTriggerMessage("Trigger failed.");
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerMessage(null), 8000);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout title="Aiden Follow-Ups">
      {/* Tab switcher */}
      <div className="flex gap-2 mb-4 border-b border-gray-800">
        {(Object.keys(TAB_META) as SequenceType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-white border-b-2 border-purple-500 -mb-px"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {TAB_META[tab].title}
          </button>
        ))}
      </div>

      {/* Flag banner */}
      {stats && (
        <div
          className={`mb-4 px-4 py-2 rounded border text-sm ${
            stats.flagEnabled
              ? "bg-green-900/20 border-green-800 text-green-300"
              : "bg-amber-900/20 border-amber-800 text-amber-300"
          }`}
        >
          {stats.flagEnabled ? tabMeta.flagOnNote : tabMeta.flagOffNote}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-6 gap-3">
            <Card className="bg-gray-900 border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-white">{sumStatus(stats.breakdown, "pending")}</div>
              <div className="text-xs text-gray-500 mt-1">Pending</div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{sumStatus(stats.breakdown, "sent")}</div>
              <div className="text-xs text-gray-500 mt-1">Sent</div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{sumStatus(stats.breakdown, "failed")}</div>
              <div className="text-xs text-gray-500 mt-1">Failed</div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-gray-400">{sumStatus(stats.breakdown, "skipped")}</div>
              <div className="text-xs text-gray-500 mt-1">Skipped</div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats.openedTotal}</div>
              <div className="text-xs text-gray-500 mt-1">Opened</div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.clickedTotal}</div>
              <div className="text-xs text-gray-500 mt-1">Clicked</div>
            </Card>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {sequenceNumbers[activeTab].map((seq) => (
              <Card key={seq} className="bg-gray-900 border-gray-800 p-3 text-center">
                <div className="text-sm text-gray-400 mb-1">Email {seq} ({sequenceLabel[activeTab][seq]})</div>
                <div className="flex items-center justify-center gap-2 text-[11px] flex-wrap">
                  <span className="text-emerald-400">sent {sumSeq(stats.breakdown, seq, "sent")}</span>
                  <span className="text-yellow-400">pending {sumSeq(stats.breakdown, seq, "pending")}</span>
                  <span className="text-gray-500">skipped {sumSeq(stats.breakdown, seq, "skipped")}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">{tabMeta.description}</p>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={seqFilter} onValueChange={(v) => { setSeqFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-gray-900 border-gray-700 text-gray-300 text-sm">
            <SelectValue placeholder="Sequence" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Emails</SelectItem>
            {sequenceNumbers[activeTab].map((seq) => (
              <SelectItem key={seq} value={String(seq)}>Email {seq} ({sequenceLabel[activeTab][seq]})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] bg-gray-900 border-gray-700 text-gray-300 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          {triggerMessage && (
            <span className="text-xs text-gray-400">{triggerMessage}</span>
          )}
          <Button
            size="sm"
            onClick={handleTrigger}
            disabled={triggering}
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            <PlayCircle className="w-4 h-4 mr-1" />
            {triggering ? "Running..." : `Run ${tabMeta.title}`}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-3">
            Showing {rows.length} of {total}
          </div>

          <Card className="bg-gray-900 border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left p-3">Recipient</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-center p-3">Seq</th>
                    <th className="text-left p-3">Subject</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-left p-3">Scheduled</th>
                    <th className="text-left p-3">Sent</th>
                    <th className="text-center p-3">Opened</th>
                    <th className="text-center p-3">Clicked</th>
                    <th className="text-center p-3">Verified</th>
                    <th className="text-left p-3">Reason</th>
                    <th className="text-center p-3">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <>
                      <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-3 text-gray-300 text-xs">{e.userEmail || "—"}</td>
                        <td className="p-3 text-gray-300 text-xs">{e.userFirstName || "—"}</td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300">
                            {e.sequenceNumber}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-xs max-w-[220px] truncate">{e.subject}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[e.status] || "text-gray-400 bg-gray-800"}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {e.scheduledFor ? new Date(e.scheduledFor).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {e.sentAt ? new Date(e.sentAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {e.openedAt ? <span className="text-cyan-400">Yes</span> : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {e.clickedAt ? <span className="text-orange-400">Yes</span> : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {e.emailVerified ? <span className="text-emerald-400">Yes</span> : <span className="text-gray-600">No</span>}
                        </td>
                        <td className="p-3 text-gray-500 text-xs max-w-[140px] truncate">
                          {e.errorMessage || "—"}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePreview(e.id)}
                            className="text-gray-500 hover:text-purple-400 transition-colors"
                          >
                            {previewId === e.id ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {previewId === e.id && previewHtml && (
                        <tr key={`${e.id}-preview`}>
                          <td colSpan={12} className="p-0">
                            <div className="bg-gray-950 border-t border-b border-gray-700 p-4">
                              <div className="bg-white rounded-lg overflow-hidden max-w-[600px] mx-auto" style={{ maxHeight: "500px", overflowY: "auto" }}>
                                <iframe
                                  srcDoc={previewHtml}
                                  className="w-full border-0"
                                  style={{ height: "480px" }}
                                  title="Email preview"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-gray-600 text-sm">
                        {activeTab === "unverified"
                          ? "No unverified follow-ups yet. Rows are created when a user signs up via /aiden."
                          : "No verified-drip rows yet. Rows are created when an Aiden user verifies their email."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" className="text-gray-400 border-gray-700" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" className="text-gray-400 border-gray-700" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
