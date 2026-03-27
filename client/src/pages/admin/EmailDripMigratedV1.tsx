import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdmin, adminFetch } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Loader2, ChevronLeft, ChevronRight, Eye, X, Settings2 } from "lucide-react";

interface DripEmail {
  id: string;
  userId: string;
  recipientEmail: string;
  firstName: string;
  sequenceNumber: number;
  subject: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  resendEmailId: string | null;
  createdAt: string;
}

interface MigrationStats {
  totalEligible: number;
  email1Sent: number;
  email2Sent: number;
  email3Sent: number;
  opened: number;
  clicked: number;
  loggedIn: number;
}

interface BatchStatus {
  status: "idle" | "running" | "paused";
  batchSize: number;
  currentBatchNumber: number;
  startedAt: string | null;
  lastBatchAt: string | null;
  nextBatchAt: string | null;
  remaining: number;
  totalBatches: number;
  email1Sent: number;
  totalEligible: number;
}

const statusColors: Record<string, string> = {
  sent: "text-green-400 bg-green-900/30",
  pending: "text-yellow-400 bg-yellow-900/30",
  failed: "text-red-400 bg-red-900/30",
};

const campaignStatusColors: Record<string, string> = {
  idle: "text-gray-400 bg-gray-800",
  running: "text-emerald-400 bg-emerald-900/30",
  paused: "text-yellow-400 bg-yellow-900/30",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function EmailDripMigratedV1() {
  const { isAuthenticated } = useAdmin();
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [batch, setBatch] = useState<BatchStatus | null>(null);
  const [emails, setEmails] = useState<DripEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [seqFilter, setSeqFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [batchSizeInput, setBatchSizeInput] = useState("");
  const [showBatchSizeEdit, setShowBatchSizeEdit] = useState(false);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => { fetchStats(); fetchBatchStatus(); }, []);
  useEffect(() => { fetchEmails(); }, [page, seqFilter, statusFilter]);

  async function fetchStats() {
    try {
      const res = await adminFetch("/api/admin/email-drip/migrated-stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }

  async function fetchBatchStatus() {
    try {
      const res = await adminFetch("/api/admin/email-drip/batch-status");
      if (res.ok) {
        const data = await res.json();
        setBatch(data);
        setBatchSizeInput(String(data.batchSize));
      }
    } catch {}
  }

  async function fetchEmails() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      if (seqFilter !== "all") params.set("sequence", seqFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await adminFetch(`/api/admin/email-drip/migrated-emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotal(data.total);
      }
    } catch {} finally { setLoading(false); }
  }

  async function handleStartCampaign() {
    const size = parseInt(batchSizeInput) || 500;
    if (!confirm(`Start campaign with batch size ${size}?\n\nThis will send Email #1 to the first ${size} eligible users now, then automatically send the next batch every 24 hours.`)) return;

    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await adminFetch("/api/admin/email-drip/start-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: size }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResult(`Batch 1 sent: ${data.stats.sent} emails | Failed: ${data.stats.failed} | Skipped: ${data.stats.skipped}`);
        fetchStats();
        fetchBatchStatus();
        fetchEmails();
      } else {
        setActionResult("Failed to start campaign");
      }
    } catch {
      setActionResult("Error starting campaign");
    } finally { setActionLoading(false); }
  }

  async function handlePause() {
    setActionLoading(true);
    try {
      const res = await adminFetch("/api/admin/email-drip/pause-campaign", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionResult("Campaign paused. Email #2/#3 for already-sent users will still process.");
        fetchBatchStatus();
      }
    } catch {} finally { setActionLoading(false); }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      const res = await adminFetch("/api/admin/email-drip/resume-campaign", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionResult(`Campaign resumed. Next batch at ${formatDateTime(data.config.nextBatchAt)}`);
        fetchBatchStatus();
      }
    } catch {} finally { setActionLoading(false); }
  }

  async function handleUpdateBatchSize() {
    const size = Math.max(1, parseInt(batchSizeInput) || 500);
    setActionLoading(true);
    try {
      const res = await adminFetch("/api/admin/email-drip/batch-size", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: size }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResult(`Batch size updated to ${size}. Takes effect on next batch.`);
        setShowBatchSizeEdit(false);
        fetchBatchStatus();
      }
    } catch {} finally { setActionLoading(false); }
  }

  async function handlePreview(id: string) {
    if (previewId === id) {
      setPreviewId(null);
      setPreviewHtml(null);
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/email-drip/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.email.bodyHtml);
        setPreviewId(id);
      }
    } catch {}
  }

  if (!isAuthenticated) return null;

  const progressPercent = batch && batch.totalEligible > 0
    ? Math.round((batch.email1Sent / batch.totalEligible) * 100)
    : 0;

  return (
    <AdminLayout title="Email Drip — Migrated V1">
      {/* Batch Campaign Control */}
      {batch && (
        <Card className="bg-gray-900 border-gray-800 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-white text-sm font-medium">Batch Campaign</h3>
              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${campaignStatusColors[batch.status]}`}>
                {batch.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {batch.status === "idle" && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleStartCampaign}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                  Start Campaign
                </Button>
              )}
              {batch.status === "running" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/30"
                  onClick={handlePause}
                  disabled={actionLoading}
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </Button>
              )}
              {batch.status === "paused" && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleStartCampaign}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                    Send Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-400 border-emerald-700 hover:bg-emerald-900/30"
                    onClick={handleResume}
                    disabled={actionLoading}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Resume (24h)
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>
                Batch {batch.currentBatchNumber} of {batch.totalBatches}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Batch details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="text-gray-500 mb-0.5">Batch Size</div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-medium">{batch.batchSize}</span>
                <button
                  onClick={() => setShowBatchSizeEdit(!showBatchSizeEdit)}
                  className="text-gray-500 hover:text-purple-400 transition-colors"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="text-gray-500 mb-0.5">Email #1 Sent</div>
              <div className="text-emerald-400 font-medium">{batch.email1Sent}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="text-gray-500 mb-0.5">Remaining</div>
              <div className="text-orange-400 font-medium">{batch.remaining}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="text-gray-500 mb-0.5">Next Batch</div>
              <div className="text-purple-400 font-medium">
                {batch.status === "running" && batch.nextBatchAt
                  ? formatDateTime(batch.nextBatchAt)
                  : "—"}
              </div>
            </div>
          </div>

          {/* Batch size editor */}
          {showBatchSizeEdit && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
              <label className="text-xs text-gray-400">New batch size:</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={batchSizeInput}
                onChange={(e) => setBatchSizeInput(e.target.value)}
                className="w-24 bg-gray-800 text-white rounded px-2 py-1 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
              />
              <Button
                size="sm"
                variant="outline"
                className="text-purple-400 border-purple-700 hover:bg-purple-900/30 text-xs h-7"
                onClick={handleUpdateBatchSize}
                disabled={actionLoading}
              >
                Update
              </Button>
              <span className="text-[10px] text-gray-600">
                Increase gradually: 500 &rarr; 1000 &rarr; 2000
              </span>
            </div>
          )}

          {/* Timestamps */}
          {batch.startedAt && (
            <div className="mt-3 flex gap-4 text-[10px] text-gray-600">
              <span>Started: {formatDateTime(batch.startedAt)}</span>
              {batch.lastBatchAt && <span>Last batch: {formatDateTime(batch.lastBatchAt)}</span>}
            </div>
          )}
        </Card>
      )}

      {/* Action result message */}
      {actionResult && (
        <div className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300">
          {actionResult}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-7 gap-3 mb-6">
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalEligible}</div>
            <div className="text-xs text-gray-500 mt-1">Eligible</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.email1Sent}</div>
            <div className="text-xs text-gray-500 mt-1">Email 1 Sent</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.email2Sent}</div>
            <div className="text-xs text-gray-500 mt-1">Email 2 Sent</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.email3Sent}</div>
            <div className="text-xs text-gray-500 mt-1">Email 3 Sent</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{stats.opened}</div>
            <div className="text-xs text-gray-500 mt-1">Opened</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.clicked}</div>
            <div className="text-xs text-gray-500 mt-1">Clicked</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.loggedIn}</div>
            <div className="text-xs text-gray-500 mt-1">Logged In</div>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={seqFilter} onValueChange={(v) => { setSeqFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700 text-gray-300 text-sm">
            <SelectValue placeholder="Sequence" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Emails</SelectItem>
            <SelectItem value="1">Email 1</SelectItem>
            <SelectItem value="2">Email 2</SelectItem>
            <SelectItem value="3">Email 3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] bg-gray-900 border-gray-700 text-gray-300 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Email table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-3">
            Showing {emails.length} of {total} migration drip emails
          </div>

          <Card className="bg-gray-900 border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left p-3">Recipient</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-center p-3">Seq #</th>
                    <th className="text-left p-3">Subject</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-left p-3">Sent At</th>
                    <th className="text-center p-3">Opened</th>
                    <th className="text-center p-3">Clicked</th>
                    <th className="text-center p-3">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((e) => (
                    <>
                      <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-3 text-gray-300 text-xs">{e.recipientEmail}</td>
                        <td className="p-3 text-gray-300 text-xs">{e.firstName}</td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300">
                            {e.sequenceNumber}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-xs max-w-[200px] truncate">{e.subject}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[e.status] || "text-gray-400 bg-gray-800"}`}>
                            {e.status}
                          </span>
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
                          <td colSpan={9} className="p-0">
                            <div className="bg-gray-950 border-t border-b border-gray-700 p-4">
                              <div className="bg-white rounded-lg overflow-hidden max-w-[600px] mx-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <iframe
                                  srcDoc={previewHtml}
                                  className="w-full border-0"
                                  style={{ height: '480px' }}
                                  title="Email preview"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {emails.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-600 text-sm">
                        No migration drip emails yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" className="text-gray-400 border-gray-700" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" className="text-gray-400 border-gray-700" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
