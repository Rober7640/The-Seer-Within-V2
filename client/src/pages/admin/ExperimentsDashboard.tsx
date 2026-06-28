import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FlaskConical, Plus, Play, Pause, Trophy, Pencil, X } from "lucide-react";

// Admin dashboard for the unified A/B experiment framework.
// Phase 2 = read-only results; Phase 3 = self-serve create/edit/start/pause/
// declare-winner for config experiments (no DB editing). Results are sourced
// from the app database via /api/admin/experiments (never PostHog).

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
  liftPct: number | null; // server-computed conversion lift vs control (null = control / no data)
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

async function getJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Send a write and surface the server's validation message on failure.
async function writeJson(url: string, method: string, body?: unknown): Promise<any> {
  const res = await adminFetch(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      json?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ") || json?.error;
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return json;
}

// ── Create/edit form model ────────────────────────────────────────────────────

interface VariantForm {
  key: string;
  weight: string;
  payloadJson: string;
}
interface ExpForm {
  key: string;
  name: string;
  description: string;
  subjectType: string;
  variants: VariantForm[];
  personaId: string;
  conversionType: string;
  windowDays: string;
}

const BLANK_FORM: ExpForm = {
  key: "",
  name: "",
  description: "",
  subjectType: "user",
  variants: [
    { key: "A", weight: "50", payloadJson: "{}" },
    { key: "B", weight: "50", payloadJson: "{}" },
  ],
  personaId: "",
  conversionType: "credit_purchase",
  windowDays: "7",
};

function toForm(exp: ExperimentRow): ExpForm {
  return {
    key: exp.key,
    name: exp.name,
    description: exp.description ?? "",
    subjectType: exp.subjectType,
    variants: (exp.variants ?? []).map((v) => ({
      key: v.key,
      weight: String(v.weight),
      payloadJson: JSON.stringify(v.payload ?? {}, null, 0),
    })),
    personaId: exp.scope?.personaId ?? "",
    conversionType: exp.conversion?.type ?? "credit_purchase",
    windowDays: exp.conversion?.windowDays ? String(exp.conversion.windowDays) : "7",
  };
}

// Build the API body from the form, throwing a readable error on bad input.
function formToBody(form: ExpForm, includeKey: boolean) {
  const variants = form.variants.map((v) => {
    const weight = parseInt(v.weight, 10);
    if (!v.key.trim()) throw new Error("every variant needs a key");
    if (!Number.isFinite(weight) || weight < 0) throw new Error(`variant ${v.key}: weight must be ≥ 0`);
    let payload: Record<string, unknown> = {};
    const raw = v.payloadJson.trim();
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error(`variant ${v.key}: payload is not valid JSON`);
      }
    }
    return { key: v.key.trim(), weight, payload };
  });
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    subjectType: form.subjectType,
    variants,
    scope: form.personaId.trim() ? { personaId: form.personaId.trim() } : null,
    conversion: {
      type: form.conversionType,
      windowDays: form.windowDays ? parseInt(form.windowDays, 10) : undefined,
    },
  };
  if (includeKey) body.key = form.key.trim();
  return body;
}

export default function ExperimentsDashboard() {
  const [experiments, setExperiments] = useState<ExperimentRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  // Separate from reloadTick so an unrelated create/edit doesn't re-run the heavy
  // tally for the open panel — only the selected test's own writes refresh it.
  const [resultsTick, setResultsTick] = useState(0);

  const [windowInput, setWindowInput] = useState<string>("");
  const [appliedWindow, setAppliedWindow] = useState<string>("");

  // Write state.
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<ExpForm>(BLANK_FORM);
  const [editingStatus, setEditingStatus] = useState<string>("draft");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [winnerPick, setWinnerPick] = useState<string>("");

  // Structural fields (variants/scope/subjectType/conversion) are frozen server-side
  // once a test has started — reflect that in the form.
  const structuralLocked = formMode === "edit" && editingStatus !== "draft";

  useEffect(() => {
    let cancelled = false;
    getJson<{ experiments: ExperimentRow[] }>("/api/admin/experiments")
      .then((json) => !cancelled && (setExperiments(json.experiments), setListError(null)))
      .catch((e) => !cancelled && setListError(e?.message ?? "Failed to load experiments"));
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

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
  }, [selectedKey, appliedWindow, resultsTick]);

  // Refresh the registry after any write; refresh the open results panel only if
  // the write targeted the selected experiment.
  const afterWrite = useCallback(
    (key?: string) => {
      reload();
      if (key && key === selectedKey) setResultsTick((t) => t + 1);
    },
    [reload, selectedKey],
  );

  const controlKey = results?.experiment.variants?.[0]?.key ?? "A";
  const treatmentKey = results?.experiment.variants?.[1]?.key ?? "B";
  // Per-row lift comes from the server (raw conversion vs control), so it is correct
  // for renamed arms and every arm of a 3+ arm test.
  const liftOf = (row: TallyVariantRow): string =>
    row.liftPct === null || row.liftPct === undefined
      ? "—"
      : `${row.liftPct >= 0 ? "+" : ""}${row.liftPct.toFixed(1)}%`;

  // ── Write actions ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingStatus("draft");
    setFormError(null);
    setFormMode("create");
  };
  const openEdit = (exp: ExperimentRow) => {
    setForm(toForm(exp));
    setEditingStatus(exp.status);
    setFormError(null);
    setFormMode("edit");
  };

  const submitForm = async () => {
    setFormError(null);
    let body: Record<string, unknown>;
    try {
      body = formToBody(form, formMode === "create");
    } catch (e: any) {
      setFormError(e?.message ?? "Invalid form");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "create") {
        await writeJson("/api/admin/experiments", "POST", body);
        setFormMode(null);
        afterWrite();
      } else {
        await writeJson(`/api/admin/experiments/${encodeURIComponent(form.key)}`, "PATCH", body);
        setFormMode(null);
        afterWrite(form.key);
      }
    } catch (e: any) {
      setFormError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (key: string, action: "start" | "pause") => {
    setActionError(null);
    try {
      await writeJson(`/api/admin/experiments/${encodeURIComponent(key)}/${action}`, "POST");
      afterWrite(key);
    } catch (e: any) {
      setActionError(`${action} failed: ${e?.message ?? "error"}`);
    }
  };

  const declareWinner = async (key: string, variant: string) => {
    setActionError(null);
    if (!variant) return;
    if (!window.confirm(`Declare "${variant}" the winner and conclude this test?`)) return;
    try {
      await writeJson(`/api/admin/experiments/${encodeURIComponent(key)}/declare-winner`, "POST", {
        variant,
      });
      setWinnerPick("");
      afterWrite(key);
    } catch (e: any) {
      setActionError(`declare winner failed: ${e?.message ?? "error"}`);
    }
  };

  const updateVariant = (i: number, patch: Partial<VariantForm>) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    }));

  return (
    <AdminLayout title="Experiments">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Results are sourced from the app database (not PostHog). New tests start as drafts (off);
            nothing affects live users until you press <span className="text-gray-300">Start</span>.
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-2 text-sm font-medium hover:bg-purple-500"
          >
            <Plus className="h-4 w-4" /> New test
          </button>
        </div>

        {actionError && (
          <div className="rounded border border-red-700 bg-red-950/30 p-3 text-sm text-red-200">
            {actionError}
          </div>
        )}

        {/* Create / edit form */}
        {formMode && (
          <Card className="border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{formMode === "create" ? "New experiment" : `Edit ${form.key}`}</CardTitle>
              <button onClick={() => setFormMode(null)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {structuralLocked && (
                <div className="rounded border border-amber-800 bg-amber-950/20 p-3 text-xs text-amber-200">
                  This test has started — variants, scope, subject type, and conversion are frozen
                  (changing them would re-bucket enrolled users). Only name &amp; description are
                  editable; create a new test to change the rest.
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Key (unique slug)">
                  <input
                    value={form.key}
                    disabled={formMode === "edit"}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="evelyn_price_q3"
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </Field>
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                  />
                </Field>
                <Field label="Subject type">
                  <select
                    value={form.subjectType}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, subjectType: e.target.value })}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="user">user</option>
                    <option value="visitor">visitor</option>
                    <option value="email">email</option>
                  </select>
                </Field>
                <Field label="Scope — persona id (optional)">
                  <input
                    value={form.personaId}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, personaId: e.target.value })}
                    placeholder="(all personas)"
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </Field>
                <Field label="Conversion type">
                  <select
                    value={form.conversionType}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, conversionType: e.target.value })}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="credit_purchase">credit_purchase</option>
                    <option value="event">event</option>
                  </select>
                </Field>
                <Field label="Attribution window (days)">
                  <input
                    type="number"
                    min={1}
                    value={form.windowDays}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, windowDays: e.target.value })}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </Field>
              </div>

              {/* Variants editor */}
              <div>
                <div className="mb-1 text-xs text-gray-400">
                  Variants — the first is the control. Payload is JSON the code reads (e.g.{" "}
                  <code className="text-gray-300">{`{"mainCents":3700}`}</code>).
                </div>
                <div className="space-y-2">
                  {form.variants.map((v, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        value={v.key}
                        disabled={structuralLocked}
                        onChange={(e) => updateVariant(i, { key: e.target.value })}
                        placeholder="key"
                        className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white disabled:opacity-60"
                      />
                      <input
                        type="number"
                        min={0}
                        value={v.weight}
                        disabled={structuralLocked}
                        onChange={(e) => updateVariant(i, { weight: e.target.value })}
                        placeholder="weight"
                        className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white disabled:opacity-60"
                      />
                      <input
                        value={v.payloadJson}
                        disabled={structuralLocked}
                        onChange={(e) => updateVariant(i, { payloadJson: e.target.value })}
                        placeholder="{}"
                        className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 font-mono text-xs text-white disabled:opacity-60"
                      />
                      {i === 0 ? (
                        <span className="px-2 py-1.5 text-[10px] text-gray-500">control</span>
                      ) : (
                        <button
                          disabled={structuralLocked}
                          onClick={() =>
                            setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }))
                          }
                          className="px-2 py-1.5 text-gray-500 hover:text-red-300 disabled:opacity-40"
                          title="Remove arm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!structuralLocked && (
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        variants: [...f.variants, { key: "", weight: "0", payloadJson: "{}" }],
                      }))
                    }
                    className="mt-2 rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800"
                  >
                    + Add arm
                  </button>
                )}
              </div>

              {formError && (
                <div className="rounded border border-red-700 bg-red-950/30 p-3 text-sm text-red-200">
                  {formError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={submitForm}
                  disabled={saving}
                  className="rounded bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500 disabled:opacity-60"
                >
                  {saving ? "Saving…" : formMode === "create" ? "Create draft" : "Save changes"}
                </button>
                <button
                  onClick={() => setFormMode(null)}
                  className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="text-gray-400">No experiments yet — create one with “New test”.</div>
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
                    <th className="py-2 pr-4">Winner</th>
                    <th className="py-2 pr-4">Actions</th>
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
                        <td className="py-2 pr-4">
                          {exp.winnerVariant ? (
                            <Badge className="bg-emerald-600">{exp.winnerVariant}</Badge>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              disabled={isSelected}
                              onClick={() => {
                                if (exp.key === selectedKey) return;
                                setSelectedKey(exp.key);
                                setResults(null);
                                setWindowInput("");
                                setAppliedWindow("");
                                setWinnerPick("");
                              }}
                              className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-60"
                            >
                              {isSelected ? "Selected" : "Results"}
                            </button>
                            {exp.status === "running" ? (
                              <button
                                onClick={() => runAction(exp.key, "pause")}
                                className="flex items-center gap-1 rounded border border-amber-800 px-2 py-1 text-xs text-amber-300 hover:bg-amber-950/40"
                              >
                                <Pause className="h-3 w-3" /> Pause
                              </button>
                            ) : exp.status !== "done" ? (
                              <button
                                onClick={() => runAction(exp.key, "start")}
                                className="flex items-center gap-1 rounded border border-emerald-800 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950/40"
                              >
                                <Play className="h-3 w-3" /> {exp.status === "paused" ? "Resume" : "Start"}
                              </button>
                            ) : null}
                            {exp.status !== "done" && (
                              <button
                                onClick={() => openEdit(exp)}
                                className="flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </div>
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
                      No cohort yet — this experiment isn&apos;t running, or no exposures have been
                      logged. Press <span className="text-emerald-300">Start</span> to begin enrolling;
                      results appear once the first exposure is recorded.
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
                            <th className="py-2 pr-4">Lift vs {controlKey}</th>
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

                      <div className="space-y-1 text-xs text-gray-400">
                        {results.srm && (
                          <div className={results.srm.ok === false ? "text-red-300" : undefined}>
                            Split: {controlKey}={results.srm.aViewers} · {treatmentKey}=
                            {results.srm.bViewers} — {treatmentKey} share{" "}
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
                            {treatmentKey} lift {results.significance.liftPct >= 0 ? "+" : ""}
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
                          <div>
                            Need both {controlKey} and {treatmentKey} arms with exposures to compute
                            significance.
                          </div>
                        )}
                        <div className="text-gray-600">Pre-register N before peeking — no early stopping.</div>
                      </div>

                      {/* Declare winner (running/paused, no winner yet) */}
                      {(results.experiment.status === "running" ||
                        results.experiment.status === "paused") &&
                        !results.experiment.winnerVariant && (
                          <div className="flex items-center gap-2 border-t border-gray-800 pt-3">
                            <Trophy className="h-4 w-4 text-amber-400" />
                            <select
                              value={winnerPick}
                              onChange={(e) => setWinnerPick(e.target.value)}
                              style={{ colorScheme: "dark" }}
                              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                            >
                              <option value="">Pick winner…</option>
                              {results.experiment.variants.map((v) => (
                                <option key={v.key} value={v.key}>
                                  {v.key}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={!winnerPick}
                              onClick={() => declareWinner(selectedKey, winnerPick)}
                              className="rounded border border-amber-700 px-3 py-1 text-sm text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
                            >
                              Declare winner
                            </button>
                          </div>
                        )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-xs text-gray-400">{label}</label>
      {children}
    </div>
  );
}
