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
  Shield,
  AlertTriangle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
} from "lucide-react";

interface SafetyViolation {
  id: string;
  sessionId: string | null;
  userId: string | null;
  personaId: string | null;
  violationType: string;
  userMessage: string;
  systemResponse: string;
  ipAddress: string | null;
  flaggedForReview: boolean;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

interface SafetyStats {
  total: number;
  flaggedForReview: number;
  byType: Record<string, number>;
}

const VIOLATION_COLORS: Record<string, string> = {
  crisis: "text-red-400 border-red-800 bg-red-900/20",
  inappropriate: "text-orange-400 border-orange-800 bg-orange-900/20",
  prompt_injection: "text-yellow-400 border-yellow-800 bg-yellow-900/20",
  harassment: "text-pink-400 border-pink-800 bg-pink-900/20",
  gibberish: "text-gray-400 border-gray-600 bg-gray-800/20",
};

export default function SafetyDashboard() {
  const [violations, setViolations] = useState<SafetyViolation[]>([]);
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    fetchData();
  }, [page, typeFilter, flaggedOnly]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (typeFilter !== "all") params.set("violationType", typeFilter);
      if (flaggedOnly) params.set("flaggedOnly", "true");

      const [violationsRes, statsRes] = await Promise.all([
        adminFetch(`/api/admin/safety/violations?${params}`),
        adminFetch("/api/admin/safety/stats"),
      ]);

      if (violationsRes.ok) {
        const data = await violationsRes.json();
        setViolations(data.violations);
        setTotal(data.total);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch safety data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id: string, flagged: boolean) {
    try {
      const res = await adminFetch(`/api/admin/safety/violations/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          flaggedForReview: flagged,
          reviewNotes: reviewNote || undefined,
        }),
      });
      if (res.ok) {
        setReviewNote("");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to review violation:", err);
    }
  }

  async function handleExport() {
    try {
      const res = await adminFetch("/api/admin/safety/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "safety_violations.csv";
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  return (
    <AdminLayout title="Safety Violations">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatMini label="Total" value={stats.total} color="text-white" />
          <StatMini
            label="Flagged"
            value={stats.flaggedForReview}
            color="text-yellow-400"
          />
          {Object.entries(stats.byType).map(([type, cnt]) => (
            <StatMini
              key={type}
              label={type.replace("_", " ")}
              value={cnt}
              color={
                type === "crisis"
                  ? "text-red-400"
                  : type === "inappropriate"
                    ? "text-orange-400"
                    : "text-gray-400"
              }
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="crisis">Crisis</SelectItem>
            <SelectItem value="inappropriate">Inappropriate</SelectItem>
            <SelectItem value="prompt_injection">Prompt Injection</SelectItem>
            <SelectItem value="harassment">Harassment</SelectItem>
            <SelectItem value="gibberish">Gibberish</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => {
            setFlaggedOnly(!flaggedOnly);
            setPage(1);
          }}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            flaggedOnly
              ? "bg-yellow-600/20 text-yellow-300 border border-yellow-800"
              : "text-gray-500 hover:text-white border border-gray-700"
          }`}
        >
          <Flag className="w-3 h-3 inline mr-1" />
          Flagged only
        </button>

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
            Showing {violations.length} of {total} violations
          </div>

          {/* Violations list */}
          <div className="space-y-2">
            {violations.map((v) => (
              <Card
                key={v.id}
                className={`bg-gray-900 border-gray-800 ${
                  v.flaggedForReview ? "border-l-2 border-l-yellow-500" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            VIOLATION_COLORS[v.violationType] ||
                            "text-gray-400 border-gray-600"
                          }`}
                        >
                          {v.violationType.replace("_", " ")}
                        </Badge>
                        {v.flaggedForReview && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-yellow-400 border-yellow-800"
                          >
                            Flagged
                          </Badge>
                        )}
                        {v.reviewedAt && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-green-400 border-green-800"
                          >
                            Reviewed
                          </Badge>
                        )}
                        <span className="text-[10px] text-gray-600">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm text-white truncate">
                        {v.userMessage}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setExpandedId(expandedId === v.id ? null : v.id)
                      }
                      className="text-gray-500 hover:text-white transition-colors shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded details */}
                  {expandedId === v.id && (
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">
                          User Message
                        </p>
                        <p className="text-sm text-gray-300 bg-gray-800 rounded p-2">
                          {v.userMessage}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">
                          System Response
                        </p>
                        <p className="text-sm text-gray-300 bg-gray-800 rounded p-2">
                          {v.systemResponse}
                        </p>
                      </div>
                      {v.ipAddress && (
                        <p className="text-xs text-gray-600">
                          IP: {v.ipAddress}
                        </p>
                      )}
                      {v.reviewNotes && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-1">
                            Review Notes
                          </p>
                          <p className="text-sm text-gray-400">{v.reviewNotes}</p>
                        </div>
                      )}

                      {/* Review actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Review notes (optional)..."
                          className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-purple-500 focus:outline-none"
                        />
                        {!v.reviewedAt && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-400 border-yellow-800"
                              onClick={() => handleReview(v.id, true)}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              Flag
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-800"
                              onClick={() => handleReview(v.id, false)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {violations.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No violations found.
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

function StatMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-3 text-center">
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-gray-500 capitalize">{label}</p>
      </CardContent>
    </Card>
  );
}
