import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdmin, adminFetch } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";

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

interface NewV1Stats {
  totalNewV1: number;
  email1Sent: number;
  email2Sent: number;
  email3Sent: number;
  opened: number;
  clicked: number;
  loggedIn: number;
}

const statusColors: Record<string, string> = {
  sent: "text-green-400 bg-green-900/30",
  pending: "text-yellow-400 bg-yellow-900/30",
  failed: "text-red-400 bg-red-900/30",
};

export default function EmailDripNewV1() {
  const { isAuthenticated } = useAdmin();
  const [stats, setStats] = useState<NewV1Stats | null>(null);
  const [emails, setEmails] = useState<DripEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [seqFilter, setSeqFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchEmails(); }, [page, seqFilter, statusFilter]);

  async function fetchStats() {
    try {
      const res = await adminFetch("/api/admin/email-drip/new-v1-stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }

  async function fetchEmails() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      if (seqFilter !== "all") params.set("sequence", seqFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await adminFetch(`/api/admin/email-drip/new-v1-emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotal(data.total);
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
      const res = await adminFetch(`/api/admin/email-drip/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.email.bodyHtml);
        setPreviewId(id);
      }
    } catch {}
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout title="Email Drip — New V1 Funnel">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-7 gap-3 mb-6">
          <Card className="bg-gray-900 border-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalNewV1}</div>
            <div className="text-xs text-gray-500 mt-1">Total Emails</div>
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

      <p className="text-sm text-gray-500 mb-4">
        These emails are sent automatically when new FB traffic users reach DEEPENING_2 in the V1 funnel. Email 2 and 3 follow via cron if they don't log in.
      </p>

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
            Showing {emails.length} of {total} new V1 drip emails
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
                        No new V1 drip emails yet
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
