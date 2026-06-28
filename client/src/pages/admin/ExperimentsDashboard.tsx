import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FlaskConical } from "lucide-react";

// READ-ONLY Phase-2 dashboard for the unified A/B experiment framework.
// Lists the experiment registry and shows DB-sourced per-arm results (conversion,
// rev/subject, ARPPU, SRM, significance) via /api/admin/experiments. No write
// paths — create/ramp/declare-winner arrive in Phase 3.

// Local view-model types. Deliberately NOT imported from @shared/schema — that
// module defines Drizzle pgTables (server-only) and would pull drizzle-orm/pg-core
// into the client bundle. These mirror the JSON shape the admin API returns.
interface Variant {
  key: string;
  weight: number;
  payload?: Record<string, unknown>;
}

interface ExperimentRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  subjectType: string;
  variants: Variant[];
  scope: { personaId?: string | null } | null;
  conversion: { type?: string; windowDays?: number } | null;
  startedAt: string | null;
  endedAt: string | null;
  winnerVariant: string | null;
  createdAt: string;
}

interface TallyVariantRow {
  variant: string;
  viewers: number;
  buyers: number;
  conversionPct: number;
  revenueUsd: number;
  revPerViewerUsd: number;
  arppuUsd: number;
}

interface ResultsResponse {
  experiment: {
    key: string;
    name: string;
    status: string;
    running: boolean;
    winnerVariant: string | null;
    variants: Variant[];
  };
  started: boolean;
  unsupported?: string;
  params: { startISO: string | null; windowDays: number; personaId: string | null };
  rows: TallyVariantRow[];
  srm?: {
    aViewers: number;
    bViewers: number;
    bSharePct: number;
    expectedBSharePct?: number;
    chiSquareP?: number;
    ok?: boolean;
  };
  significance?: { z: number; p: number; liftPct: number; significant: boolean };
}

// Small shared fetch helper for the admin GETs on this page.
async function getJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const STATUS_STYLES: Record<string, string> = {
  running: "text-emerald-400 border-emerald-800",
  draft: "text-gray-400 border-gray-700",
  paused: "text-amber-400 border-amber-800",
  done: "text-blue-400 border-blue-800",
};

function statusBadge(status: string) {
  return (
    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {status}
    </Badge>
  );
}

function variantSummary(variants: Variant[]): string {
  if (!Array.isArray(variants) || !variants.length) return "—";
  return variants.map((v) => `${v.key}·${v.weight}`).join(" / ");
}

export default function ExperimentsDashboard() {
  const [experiments, setExperiments] = useState<ExperimentRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Read-only window override (days) applied to the results query.
  const [windowInput, setWindowInput] = useState<string>("");
  const [appliedWindow, setAppliedWindow] = useState<string>("");

  // Load the registry once.
  useEffect(() => {
    let cancelled = false;
    getJson<{ experiments: ExperimentRow[] }>("/api/admin/experiments")
      .then((json) => !cancelled && setExperiments(json.experiments))
      .catch((e) => !cancelled && setListError(e?.message ?? "Failed to load experiments"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load results for the selected experiment (re-runs when the window override changes).
  useEffect(() => {
    if (!selectedKey) return;
    let cancelled = false;
    setResultsLoading(true);
    setResultsError(null);
    const qs = appliedWindow ? `?windowDays=${encodeURIComponent(appliedWindow)}` : "";
    getJson<ResultsResponse>(`/api/admin/experiments/${encodeURIComponent(selectedKey)}/results${qs}`)
      .then((json) => !cancelled && setResults(json))
      .catch((e) => !cancelled && setResultsError(e?.message ?? "Failed to load results"))
      .finally(() => !cancelled && setResultsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedKey, appliedWindow]);

  // Control = the experiment's first variant (framework convention), not literally "A".
  const controlKey = results?.experiment.variants?.[0]?.key ?? "A";
  const liftOf = (row: TallyVariantRow): string => {
    if (row.variant === controlKey) return "—";
    // Use the server's authoritative lift (raw, unrounded proportions) so the
    // table matches the significance line rather than recomputing from rounded %.
    if (results?.significance) {
      const l = results.significance.liftPct;
      return `${l >= 0 ? "+" : ""}${l.toFixed(1)}%`;
    }
    return "—";
  };

  return (
    <AdminLayout title="Experiments">
      <div className="space-y-6">
        <div className="rounded border border-gray-800 bg-gray-900/50 px-4 py-3 text-xs text-gray-400">
          Read-only view (Phase 2). Results are sourced from the app database (not
          PostHog). Creating, ramping, and declaring winners arrive in Phase 3 — for now
          start a test by setting its <code className="text-gray-300">status='running'</code> in the DB.
        </div>

        {/* Registry */}
        <Card>
          <CardHeader>
            <CardTitle>Experiment registry</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {listError && (
              <div className="rounded border border-red-700 bg-red-950/30 p-4 text-red-200">
                Error loading experiments: {listError}
              </div>
            )}
            {!listError && !experiments && <div className="text-gray-400">Loading…</div>}
            {experiments && experiments.length === 0 && (
              <div className="text-gray-400">No experiments yet.</div>
            )}
            {experiments && experiments.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="py-2 pr-4">Key</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Variants</th>
                    <th className="py-2 pr-4">Conversion</th>
                    <th className="py-2 pr-4">Started</th>
                    <th className="py-2 pr-4">Winner</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.map((exp) => {
                    const isSelected = exp.key === selectedKey;
                    return (
                      <tr
                        key={exp.key}
                        className={`border-b border-gray-800 ${isSelected ? "bg-purple-950/20" : ""}`}
                      >
                        <td className="py-2 pr-4 font-mono text-xs text-gray-300">{exp.key}</td>
                        <td className="py-2 pr-4">{exp.name}</td>
                        <td className="py-2 pr-4">{statusBadge(exp.status)}</td>
                        <td className="py-2 pr-4 text-gray-400">{exp.subjectType}</td>
                        <td className="py-2 pr-4 text-gray-400">{variantSummary(exp.variants)}</td>
                        <td className="py-2 pr-4 text-gray-400">
                          {exp.conversion?.type ?? "—"}
                          {exp.conversion?.windowDays ? ` · ${exp.conversion.windowDays}d` : ""}
                        </td>
                        <td className="py-2 pr-4 text-gray-400">
                          {exp.startedAt ? new Date(exp.startedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {exp.winnerVariant ? (
                            <Badge className="bg-emerald-600">{exp.winnerVariant}</Badge>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            disabled={isSelected}
                            onClick={() => {
                              if (exp.key === selectedKey) return; // already open — don't blank the panel
                              setSelectedKey(exp.key);
                              setResults(null);
                              setWindowInput("");
                              setAppliedWindow("");
                            }}
                            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 disabled:cursor-default disabled:opacity-60"
                          >
                            {isSelected ? "Selected" : "Results"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {selectedKey && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-400" />
                {selectedKey}
              </CardTitle>
              <div className="flex items-end gap-2">
                <div className="flex flex-col">
                  <label className="mb-1 text-[10px] text-gray-500">Window (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={windowInput}
                    onChange={(e) => setWindowInput(e.target.value)}
                    placeholder="default"
                    style={{ colorScheme: "dark" }}
                    className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                  />
                </div>
                <button
                  onClick={() => setAppliedWindow(windowInput)}
                  className="rounded bg-purple-600 px-3 py-1.5 text-sm font-medium hover:bg-purple-500"
                >
                  Apply
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              {resultsLoading && <div className="text-gray-400">Loading results…</div>}
              {resultsError && (
                <div className="rounded border border-red-700 bg-red-950/30 p-4 text-red-200">
                  Error loading results: {resultsError}
                </div>
              )}

              {results && !resultsLoading && (
                <>
                  {!results.started && (
                    <div className="rounded border border-gray-700 bg-gray-900/50 p-4 text-sm text-gray-300">
                      No cohort yet — this experiment isn&apos;t running, or no exposures have
                      been logged. Set <code className="mx-1 text-gray-200">status='running'</code>{" "}
                      to begin enrolling; results appear once the first exposure is recorded.
                      (The cohort start defaults to that first exposure unless{" "}
                      <code className="mx-1 text-gray-200">started_at</code> is set.)
                    </div>
                  )}
                  {results.started && results.unsupported && (
                    <div className="rounded border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-200">
                      {results.unsupported}
                    </div>
                  )}

                  {results.started && !results.unsupported && (
                    <>
                      <div className="text-xs text-gray-500">
                        Cohort since{" "}
                        {results.params.startISO
                          ? new Date(results.params.startISO).toLocaleString()
                          : "—"}{" "}
                        · {results.params.windowDays}-day attribution window
                        {results.params.personaId ? ` · persona ${results.params.personaId}` : ""}
                      </div>

                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700 text-left text-gray-400">
                            <th className="py-2 pr-4">Variant</th>
                            <th className="py-2 pr-4">Exposed</th>
                            <th className="py-2 pr-4">Buyers</th>
                            <th className="py-2 pr-4">Conv %</th>
                            <th className="py-2 pr-4">Lift vs A</th>
                            <th className="py-2 pr-4">$ / user</th>
                            <th className="py-2 pr-4">ARPPU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.rows.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-3 text-gray-500">
                                No exposures in this cohort yet.
                              </td>
                            </tr>
                          )}
                          {results.rows.map((r) => {
                            const isWinner = results.experiment.winnerVariant === r.variant;
                            return (
                              <tr key={r.variant} className="border-b border-gray-800">
                                <td className="py-2 pr-4 font-semibold">
                                  {r.variant}
                                  {isWinner && <Badge className="ml-2 bg-emerald-600">Winner</Badge>}
                                </td>
                                <td className="py-2 pr-4">{r.viewers}</td>
                                <td className="py-2 pr-4">{r.buyers}</td>
                                <td className="py-2 pr-4">{r.conversionPct}%</td>
                                <td className="py-2 pr-4">{liftOf(r)}</td>
                                <td className="py-2 pr-4">${r.revPerViewerUsd.toFixed(2)}</td>
                                <td className="py-2 pr-4">${r.arppuUsd.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* SRM + significance */}
                      <div className="space-y-1 text-xs text-gray-400">
                        {results.srm && (
                          <div className={results.srm.ok === false ? "text-red-300" : undefined}>
                            Split: A={results.srm.aViewers} · B={results.srm.bViewers} — B share{" "}
                            {results.srm.bSharePct.toFixed(1)}%
                            {typeof results.srm.expectedBSharePct === "number"
                              ? ` vs ${results.srm.expectedBSharePct.toFixed(1)}% configured`
                              : ""}
                            {results.srm.ok === false
                              ? " · ⚠ sample-ratio mismatch — results may be invalid"
                              : results.srm.ok === true
                                ? " · SRM ok"
                                : ""}
                          </div>
                        )}
                        {results.significance ? (
                          <div className="flex items-center gap-2">
                            {results.significance.significant && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                            B lift {results.significance.liftPct >= 0 ? "+" : ""}
                            {results.significance.liftPct.toFixed(1)}% · z=
                            {results.significance.z.toFixed(2)} · p≈
                            {results.significance.p.toFixed(4)}{" "}
                            {results.significance.significant ? (
                              <span className="text-emerald-400">significant at 0.05</span>
                            ) : (
                              <span className="text-amber-300">not yet significant</span>
                            )}
                          </div>
                        ) : (
                          <div>Need both A and B arms with exposures to compute significance.</div>
                        )}
                        <div className="text-gray-600">
                          Pre-register N before peeking — no early stopping.
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
