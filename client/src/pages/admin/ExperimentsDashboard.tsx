import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FlaskConical, Plus, Play, Pause, Trophy, Pencil, X } from "lucide-react";
// The ONE constant that says which deck a clean ad URL (no &deck=) serves. Imported
// rather than copied: a second copy of it here is exactly the kind of duplicated
// roster that has broken this funnel before, and it would mislabel every lander
// pasted in as a clean URL. tarotReads.ts is pure client content (no drizzle), and
// everything else in it tree-shakes out of this bundle.
import { DEFAULT_DECK } from "@/content/tarotReads";

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
  scope: {
    personaId?: string | null;
    funnel?: string | null;
    sign?: string | null;
    landers?: Array<{ hook: string; deck: string }> | null;
    freezeAssignment?: boolean;
  } | null;
  conversion: { type?: string; windowDays?: number; targetN?: number } | null;
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
  // Per-fb-palm-sign split of the SAME rows (present only when the exposures
  // carry a sign). DIAGNOSTIC ONLY — the pooled `rows` above decide the test.
  bySign?: Array<{
    sign: string;
    rows: TallyVariantRow[];
    significance?: { z: number; p: number; liftPct: number; significant: boolean };
  }>;
  // Per-/fb-tarot-lander split of the SAME rows — facing x angle, the four landers
  // actually running. Present only when the exposures carry a facing, so a palm-only
  // test omits it entirely. DIAGNOSTIC ONLY, exactly as bySign is.
  byTarotLander?: Array<{
    facing: string;
    angle: string;
    rows: TallyVariantRow[];
    significance?: { z: number; p: number; liftPct: number; significant: boolean };
  }>;
  // Per-AD-URL split (hook x deck) for VISITOR-KEYED tests — the /fb-tarot version
  // split. Unlike bySign/byTarotLander this is NOT merely diagnostic: landers can be
  // appended to a running test, so the pooled row above may blend cohorts that have
  // been live for different lengths of time, and this table is the read that does not.
  byTarotHook?: Array<{
    hook: string;
    deck: string;
    rows: TallyVariantRow[];
    significance?: { z: number; p: number; liftPct: number; significant: boolean };
  }>;
  // How many distinct landers are in the test. >1 means the pooled row is a blend.
  landerCount?: number;
  // Subject is the anonymous visitor cookie, assigned at the LANDER, so the
  // denominator is landers rather than leads — not comparable arm-for-arm with the
  // email-keyed v1_main tests (price, commitment gate, order bump).
  visitorKeyed?: boolean;
  // Order-bump take rate per arm. Absent unless some arm was actually offered a
  // bump, so every non-bump experiment omits the block. This is the number the
  // pooled table above structurally cannot show: there, a bump order and a plain
  // order are both just "one buyer".
  bumpTakeRate?: Array<{
    variant: string;
    offered: number;
    saidYes: number;
    offeredAndPaid: number;
    paidWithBump: number;
    bumpRevenueUsd: number;
  }>;
  // What the superseded buyer definition would have counted, and why each row was
  // dropped. Present on v1_main_funnel tallies only.
  excluded?: Array<{
    variant: string;
    legacyBuyers: number;
    paidBeforeExposure: number;
    noPaidStamp: number;
  }>;
  srm?: {
    aViewers: number;
    bViewers: number;
    bSharePct: number;
    expectedBSharePct?: number;
    chiSquareP?: number;
    ok?: boolean;
    // Present ONLY when the weights were changed mid-flight. When set, ok/chiSquareP
    // describe the CURRENT-weights era alone (since*), because the earlier era was
    // assigned under a different ratio and can never match today's weights. The
    // aViewers/bViewers above stay lifetime totals.
    weightsChangedAt?: string;
    sinceA?: number;
    sinceB?: number;
    sinceBSharePct?: number;
    priorA?: number;
    priorB?: number;
    priorBSharePct?: number;
  };
  significance?: { z: number; p: number; liftPct: number; significant: boolean };
  // Pre-registered-N gate progress (present only when conversion.targetN is set).
  progress?: { targetN: number; minExposures: number; reached: boolean };
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
  // Funnel/sign scope for V1 price tests. These MUST round-trip through the form:
  // before they did, an edit rebuilt scope from personaId alone and silently wiped
  // scope.funnel / scope.sign — turning a one-lander price test into one that
  // applies to every visitor on the funnel.
  funnel: string;
  sign: string;
  // Enrolled /fb-tarot ad URLs, one per line. Free text in the form so the media
  // buyer can PASTE THE AD URLS straight in; parsed to (hook, deck) pairs on save.
  landersText: string;
  // Pin subjects to their first-exposure arm. Required before weights can be edited
  // on a running test — the server enforces the same pairing.
  freezeAssignment: boolean;
  conversionType: string;
  windowDays: string;
  targetN: string;
}

/**
 * Parse the landers box into (hook, deck) pairs. Accepts either a full ad URL or a
 * bare `hook deck` pair per line, because the ask is "here are some URLs, add these
 * hooks" — anything that makes the operator hand-extract a hook from a URL is a step
 * where the wrong hook silently enters a live money test.
 *
 * A URL with no `&deck=` means the DEFAULT deck (that is what a clean ad link is), so
 * it resolves the same way the lander itself does.
 */
export function parseLanderLines(text: string): Array<{ hook: string; deck: string }> {
  const out: Array<{ hook: string; deck: string }> = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let hook = "";
    let deck = "";
    if (s.includes("?")) {
      // Full ad URL. Read the query directly rather than via `new URL`, so a pasted
      // path-only link ("/fb-tarot/c?hook=…") parses the same as a full https one.
      const q = new URLSearchParams(s.slice(s.indexOf("?") + 1));
      hook = (q.get("hook") ?? "").trim();
      deck = (q.get("deck") ?? "").trim();
    } else {
      const parts = s.split(/[\s,]+/).filter(Boolean);
      hook = parts[0] ?? "";
      deck = parts[1] ?? "";
    }
    if (!hook) throw new Error(`could not find a hook in: ${s}`);
    if (!deck) deck = DEFAULT_DECK;
    const id = `${hook}|${deck}`;
    if (seen.has(id)) continue; // pasting the same URL twice is a slip, not an error
    seen.add(id);
    out.push({ hook, deck });
  }
  return out;
}

/** Render stored landers back into the textarea, one `hook deck` pair per line. */
function formatLanderLines(landers: Array<{ hook: string; deck: string }> | null | undefined): string {
  return (landers ?? []).map((l) => `${l.hook} ${l.deck}`).join("\n");
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
  funnel: "",
  sign: "",
  landersText: "",
  freezeAssignment: false,
  conversionType: "credit_purchase",
  windowDays: "7",
  targetN: "",
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
    funnel: (exp.scope?.funnel as string | undefined) ?? "",
    sign: (exp.scope?.sign as string | undefined) ?? "",
    landersText: formatLanderLines(exp.scope?.landers),
    freezeAssignment: exp.scope?.freezeAssignment === true,
    conversionType: exp.conversion?.type ?? "credit_purchase",
    windowDays: exp.conversion?.windowDays ? String(exp.conversion.windowDays) : "7",
    targetN: exp.conversion?.targetN ? String(exp.conversion.targetN) : "",
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
  // Use Number (not parseInt) so a scientific-notation entry like "1e7" isn't
  // silently truncated to 1 — which would gut the no-peeking gate. Validate integer.
  let targetN: number | undefined;
  const tn = form.targetN.trim();
  if (tn) {
    const n = Number(tn);
    if (!Number.isInteger(n) || n < 0) throw new Error("Pre-registered N must be a whole number ≥ 0");
    targetN = n;
  }
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    subjectType: form.subjectType,
    variants,
    // Preserve EVERY scope key the form knows about. Rebuilding scope from
    // personaId alone silently dropped funnel/sign on edit (see ExpForm) — landers
    // and freezeAssignment are in here for exactly that reason. Dropping `landers`
    // on a save would widen a four-URL test to every tarot lander; dropping
    // `freezeAssignment` would unpin every subject mid-flight.
    scope: (() => {
      const s: Record<string, unknown> = {};
      if (form.personaId.trim()) s.personaId = form.personaId.trim();
      if (form.funnel.trim()) s.funnel = form.funnel.trim();
      if (form.sign.trim()) s.sign = form.sign.trim();
      const landers = parseLanderLines(form.landersText);
      if (landers.length) s.landers = landers;
      if (form.freezeAssignment) s.freezeAssignment = true;
      return Object.keys(s).length ? s : null;
    })(),
    conversion: {
      type: form.conversionType,
      windowDays: form.windowDays ? parseInt(form.windowDays, 10) : undefined,
      targetN,
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
  // WEIGHTS are the one variant field that stays live-editable after start — but only
  // on a test that pins subjects to their first-exposure arm. Without that pin,
  // re-weighting reassigns visitors who have already seen the other arm (the bucket is
  // sticky, the bucket→variant map is not). The server enforces the same pairing; this
  // just stops the operator discovering it via a 409.
  const weightsLocked = structuralLocked && !form.freezeAssignment;
  // LANDERS stay editable after start because appending an ad URL is the whole point
  // of the field. The server refuses REMOVALS (they would orphan exposures and move
  // the denominator under a running test), so the box is open and the guard is there.
  const landersLocked = false;

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

  // /fb-tarot lander label, in the words the landers are actually briefed and
  // reported in ("Face Up — Trust / Honesty"), not the raw slugs. Falls through to
  // the raw values for anything unrecognised, so a newly added angle still shows up
  // as a row rather than silently rendering blank.
  const tarotLanderLabel = (facing: string, angle: string): string => {
    const f = facing === "up" ? "Face Up" : facing === "down" ? "Face Down" : facing;
    // Keyed off the raw angle slug; anything unmapped falls through to the slug itself
    // so a newly added angle is still a visible row. `commitment` was previously
    // unmapped and rendered lowercase next to title-cased siblings.
    const ANGLE_LABELS: Record<string, string> = {
      "decode-him": "Decode Him",
      trust: "Trust / Honesty",
      commitment: "Commitment",
      honesty: "Honesty / Lying",
      reunion: "Reunion / Return",
      healing: "Healing / Moving On",
      // pulling-away (2026-08-05) and reconciliation (2026-08-06) were both shipped
      // without a label and had been rendering as raw lowercase slugs — the same defect
      // the note above records for `commitment`. Added 2026-08-07.
      "pulling-away": "Pulling Away",
      reconciliation: "Reconciliation",
      "soulmate-after-loss": "Soulmate After Loss",
      "soulmate-where": "Soulmate — Where / Seeking",
      loneliness: "Loneliness",
      fidelity: "Fidelity",
      "missing-him": "Missing Him",
      "why-he-left": "Why He Left / Ghosting",
      // searching (2026-08-11) and twin-flame (2026-08-11) shipped without labels and had
      // been rendering as raw lowercase slugs — the third occurrence of the defect this
      // block already records twice above. Added 2026-08-12 with hidden-intuition.
      searching: "Searching",
      "twin-flame": "Twin Flame",
      "hidden-intuition": "Hidden / Intuition",
      "real-feelings": "Real Feelings",
      "still-feels": "Still Feels",
      "his-other-life": "His Other Life",
      "soulmate-label": "Soulmate / Twin Flame — The Label",
      "self-frame": "Self-Frame",
      // The money-block batch (2026-08-19) — the first non-love angles on the funnel.
      "money-retiring": "Money — Retiring (55-64)",
      "money-working": "Money — Still Working (65+)",
      "money-energy": "Money — Her Energy",
      "money-prayer": "Money — Prayer",
    };
    return `${f} — ${ANGLE_LABELS[angle] ?? angle}`;
  };

  // Pre-registered-N gate: when a target is set and not yet reached, hide the
  // verdict and disable declare-winner (fixed-horizon, no peeking).
  const progress = results?.progress;
  const nGated = !!progress && !progress.reached;

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
                <Field label="Scope — V1 funnel (optional)">
                  <input
                    value={form.funnel}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, funnel: e.target.value })}
                    placeholder="(all funnels) — e.g. v1-palm"
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </Field>
                <Field label="Scope — fb-palm sign (optional)">
                  <input
                    value={form.sign}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, sign: e.target.value })}
                    placeholder="(all signs) — e.g. thumb-angle"
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </Field>
                <Field label="Scope — /fb-tarot ad URLs (optional)">
                  <textarea
                    value={form.landersText}
                    disabled={landersLocked}
                    onChange={(e) => setForm({ ...form, landersText: e.target.value })}
                    rows={4}
                    placeholder={
                      "(all landers) — paste one ad URL per line, e.g.\n" +
                      "https://www.theseerwithin.com/fb-tarot/c?hook=cards-return\n" +
                      "or a bare pair:  cards-return return-mhf"
                    }
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white disabled:opacity-60"
                  />
                  <div className="mt-1 text-[11px] text-gray-500">
                    Enrols only these ad URLs. A URL with no <code className="text-gray-400">&amp;deck=</code>{" "}
                    means the default deck (<code className="text-gray-400">{DEFAULT_DECK}</code>) — the
                    face-up <code className="text-gray-400">&amp;deck=</code> version of the same hook is a
                    SEPARATE lander and is not enrolled unless you list it.
                    {structuralLocked && (
                      <>
                        {" "}
                        <span className="text-amber-300">
                          This test has started: you can ADD landers, not remove them.
                        </span>
                      </>
                    )}
                  </div>
                </Field>
                <Field label="Pin assignments (freeze to first exposure)">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={form.freezeAssignment}
                      disabled={structuralLocked && form.freezeAssignment}
                      onChange={(e) => setForm({ ...form, freezeAssignment: e.target.checked })}
                      className="h-4 w-4 accent-purple-600 disabled:opacity-60"
                    />
                    <span>Each subject keeps the arm they were first shown</span>
                  </label>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Required before weights can be changed on a running test. Can be switched on at
                    any time — never off, since unpinning would let a later re-weight move people
                    who have already seen the other arm.
                  </div>
                </Field>
                <Field label="Conversion type">
                  <select
                    value={form.conversionType}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, conversionType: e.target.value })}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <option value="credit_purchase">credit_purchase (V2 coin purchase)</option>
                    <option value="upsell1_funnel">upsell1_funnel (V1 upsell-1)</option>
                    {/* 🔴 v1_main_funnel was missing from this list even though four
                        experiments use it. Harmless while every field was frozen on a
                        started test — the form simply could not be saved. It stopped
                        being harmless when weights and landers became live-editable:
                        the select would fall back to its first option, the save would
                        send conversion.type='credit_purchase', and the server would
                        409 on `conversion` — blocking the weight edit for a reason
                        that had nothing to do with weights. */}
                    <option value="v1_main_funnel">v1_main_funnel (V1 main/downsell purchase)</option>
                    <option value="event">event (not measurable yet)</option>
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
                <Field label="Pre-registered N per arm (optional)">
                  <input
                    type="number"
                    min={0}
                    value={form.targetN}
                    disabled={structuralLocked}
                    onChange={(e) => setForm({ ...form, targetN: e.target.value })}
                    placeholder="no peeking gate"
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
                {structuralLocked && (
                  <div className="mb-2 text-[11px]">
                    {form.freezeAssignment ? (
                      <span className="text-emerald-300">
                        This test pins assignments, so weights can be changed while it runs. A new
                        split applies to NEW subjects only — everyone already exposed keeps the arm
                        they saw.
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        Weights are locked: this test does not pin assignments, so re-weighting it
                        would move visitors who have already seen the other arm. Tick “Pin
                        assignments” above and save, then the weights unlock.
                      </span>
                    )}
                  </div>
                )}
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
                        disabled={weightsLocked}
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

                      {/* SRM alert banner — sample-ratio mismatch invalidates results.
                          On a reweighted test this judges the CURRENT-weights era only;
                          say so, or the reader assumes it covers the whole run. */}
                      {results.srm?.ok === false && (
                        <div className="rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
                          ⚠ <strong>Sample-ratio mismatch</strong> — the observed split is off from the
                          configured weights, so randomization is suspect and these results may be
                          invalid. Investigate assignment before trusting any verdict.
                          {results.srm.weightsChangedAt
                            ? ` Measured over the ${(results.srm.sinceA ?? 0) + (results.srm.sinceB ?? 0)} exposures assigned since the weights changed on ${new Date(results.srm.weightsChangedAt).toLocaleString()} — earlier exposures used a different ratio and are excluded.`
                            : ""}
                        </div>
                      )}

                      {/* A reweight is not an error, but it DOES mean the pooled table
                          below blends two allocation ratios — which can distort the
                          comparison if conversion drifts over time. Say it once, here. */}
                      {results.srm?.weightsChangedAt && (
                        <div className="rounded border border-amber-700/60 bg-amber-950/30 p-3 text-xs text-amber-200">
                          <strong>Weights changed mid-test</strong> on{" "}
                          {new Date(results.srm.weightsChangedAt).toLocaleString()}. The
                          sample-ratio check above covers only the exposures assigned since then
                          ({results.srm.sinceA ?? 0} {controlKey} / {results.srm.sinceB ?? 0}{" "}
                          {treatmentKey}); the {results.srm.priorA ?? 0} {controlKey} /{" "}
                          {results.srm.priorB ?? 0} {treatmentKey} before it were assigned under
                          the previous ratio, so grading them against today's weights would flag a
                          mismatch that no amount of new traffic could ever clear.{" "}
                          <strong>The table below still pools both eras</strong> — read it split at
                          the change, or treat the combined figure as approximate.
                        </div>
                      )}

                      {/* Pre-registered-N progress (fixed-horizon, no peeking). */}
                      {progress && (
                        <div
                          className={`rounded border p-3 text-xs ${
                            progress.reached
                              ? "border-emerald-800 bg-emerald-950/20 text-emerald-200"
                              : "border-gray-700 bg-gray-900/50 text-gray-300"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span>
                              Pre-registered N: smallest arm {progress.minExposures.toLocaleString()} /{" "}
                              {progress.targetN.toLocaleString()} exposures
                            </span>
                            <span>
                              {progress.reached ? "N reached — verdict unlocked" : "collecting — no peeking"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded bg-gray-800">
                            <div
                              className={`h-full ${progress.reached ? "bg-emerald-500" : "bg-purple-500"}`}
                              style={{
                                width: `${Math.min(100, (progress.minExposures / progress.targetN) * 100).toFixed(1)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {results.visitorKeyed && (
                        <p className="text-xs text-gray-500">
                          <span className="text-gray-300">Denominator = chats started, not leads.</span>{" "}
                          This test is assigned at the first chat message, before any email, so
                          “Exposed” counts everyone who reached the chat — deliberately, because the
                          arms differ before the email step. Its conversion rate is therefore LOWER
                          by construction than the price / commitment-gate / order-bump tests, which
                          count leads. Compare arms within this test; never across.
                        </p>
                      )}
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
                            {/* On a reweighted test the LIFETIME share is not comparable
                                with the configured weights, so don't print them side by
                                side — that pairing is exactly what read as a mismatch. */}
                            {results.srm.weightsChangedAt ? (
                              <>
                                {" (lifetime, spans both ratios)"}
                                <br />
                                Since the weight change: {controlKey}={results.srm.sinceA ?? 0} ·{" "}
                                {treatmentKey}={results.srm.sinceB ?? 0} — {treatmentKey} share{" "}
                                {(results.srm.sinceBSharePct ?? 0).toFixed(1)}%
                                {typeof results.srm.expectedBSharePct === "number"
                                  ? ` vs ${results.srm.expectedBSharePct.toFixed(1)}% configured`
                                  : ""}
                                {results.srm.ok === false
                                  ? " · ⚠ sample-ratio mismatch — results may be invalid"
                                  : results.srm.ok === true
                                    ? " · SRM ok"
                                    : ""}
                                <br />
                                Before the change: {controlKey}={results.srm.priorA ?? 0} ·{" "}
                                {treatmentKey}={results.srm.priorB ?? 0} — {treatmentKey} share{" "}
                                {(results.srm.priorBSharePct ?? 0).toFixed(1)}% (previous ratio, not
                                checked)
                              </>
                            ) : (
                              <>
                                {typeof results.srm.expectedBSharePct === "number"
                                  ? ` vs ${results.srm.expectedBSharePct.toFixed(1)}% configured`
                                  : ""}
                                {results.srm.ok === false
                                  ? " · ⚠ sample-ratio mismatch — results may be invalid"
                                  : results.srm.ok === true
                                    ? " · SRM ok"
                                    : ""}
                              </>
                            )}
                          </div>
                        )}
                        {nGated ? (
                          <div className="text-gray-500">
                            Verdict hidden until the pre-registered N is reached — fixed-horizon, no
                            early peeking.
                          </div>
                        ) : results.significance ? (
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
                        {/* Standing caution for EVERY experiment (gated or not). */}
                        <div className="text-gray-600">
                          Fixed-horizon: pre-register N and don&apos;t stop early on a transient
                          verdict.
                        </div>
                      </div>

                      {/* Order-bump take rate. Deliberately ABOVE the per-lander
                          diagnostics: it is a headline number people actually ask
                          for, not a slice to browse. Absent for non-bump tests. */}
                      {results.bumpTakeRate && results.bumpTakeRate.length > 0 && (
                        <div className="space-y-2 border-t border-gray-800 pt-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-200">
                              Order-bump take rate
                            </span>
                            <span className="text-xs text-gray-500">
                              of the buyers who saw the offer, how many bought it
                            </span>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700 text-left text-gray-400">
                                <th className="py-2 pr-4">Arm</th>
                                <th className="py-2 pr-4">Offered</th>
                                <th className="py-2 pr-4">Said yes</th>
                                <th className="py-2 pr-4">Intent %</th>
                                <th className="py-2 pr-4">Offered &amp; paid</th>
                                <th className="py-2 pr-4">Paid w/ bump</th>
                                <th className="py-2 pr-4">Take rate</th>
                                <th className="py-2 pr-4">Bump revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.bumpTakeRate.map((b) => {
                                // An arm that was never offered the bump is the CONTROL. Its row
                                // of zeros is the headline evidence that no control buyer was
                                // shown or charged the offer — but bare zeros read as missing
                                // data, so the row says what it is rather than leaving anyone
                                // (or their boss) to guess.
                                const isControl = b.offered === 0;
                                return (
                                  <tr
                                    key={`bump-${b.variant}`}
                                    className="border-b border-gray-800/50"
                                  >
                                    <td className="py-2 pr-4 font-semibold">
                                      {b.variant}
                                      {isControl && (
                                        <span className="ml-2 rounded border border-gray-700 px-1.5 py-0.5 text-[10px] font-normal text-gray-400">
                                          control · never offered
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4">{b.offered}</td>
                                    <td className="py-2 pr-4">{b.saidYes}</td>
                                    <td className="py-2 pr-4 text-gray-400">
                                      {b.offered > 0
                                        ? `${((100 * b.saidYes) / b.offered).toFixed(1)}%`
                                        : "n/a"}
                                    </td>
                                    <td className="py-2 pr-4">{b.offeredAndPaid}</td>
                                    <td
                                      className={
                                        isControl
                                          ? "py-2 pr-4"
                                          : "py-2 pr-4 font-semibold text-emerald-300"
                                      }
                                    >
                                      {b.paidWithBump}
                                    </td>
                                    <td
                                      className={
                                        isControl
                                          ? "py-2 pr-4 text-gray-400"
                                          : "py-2 pr-4 font-semibold text-emerald-300"
                                      }
                                    >
                                      {b.offeredAndPaid > 0
                                        ? `${((100 * b.paidWithBump) / b.offeredAndPaid).toFixed(1)}%`
                                        : "n/a"}
                                    </td>
                                    <td className="py-2 pr-4">${b.bumpRevenueUsd.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="space-y-1 text-xs text-gray-500">
                            {/* FIRST, because a row of zeros reads as broken data at a glance
                                and this is the line that stops that misreading. */}
                            <div className="text-gray-300">
                              <span className="font-semibold">
                                A control arm reading all zeros is correct, not missing data.
                              </span>{" "}
                              The control is never shown the offer, so it can never accept or be
                              charged for one. Those zeros are the evidence the split is clean — a
                              control arm showing anything above zero would mean the bump had leaked
                              into it and the comparison was contaminated.
                            </div>
                            <div>
                              <span className="text-gray-400">Take rate</span> is the one to quote —
                              paid with the bump ÷ buyers who were offered it.{" "}
                              <span className="text-gray-400">Intent %</span> counts everyone who
                              clicked yes, including carts that were never paid, so it is always the
                              softer number.
                            </div>
                            <div className="text-amber-300/80">
                              &ldquo;Offered&rdquo; is only recorded once she reaches checkout, so
                              anyone who saw the offer and left the page entirely is missing from the
                              denominator — take rate therefore reads slightly high. Those visitors
                              do count in the pooled table above, which is what decides the test.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reconciliation against the superseded buyer definition. */}
                      {results.excluded && results.excluded.some((e) => e.legacyBuyers > 0) && (
                        <details className="border-t border-gray-800 pt-3 text-xs text-gray-500">
                          <summary className="cursor-pointer text-gray-400">
                            Why these buyer counts are lower than they used to be
                          </summary>
                          <p className="mt-2">
                            A buyer now means someone who <em>paid at or after</em> being exposed.
                            The old definition counted any row flagged as purchased — which, because
                            conversation rows are keyed by email and reused, included purchases made
                            weeks or months before the test, plus checkouts that were never paid.
                          </p>
                          <table className="mt-2 w-full">
                            <thead>
                              <tr className="border-b border-gray-800 text-left text-gray-500">
                                <th className="py-1 pr-4">Arm</th>
                                <th className="py-1 pr-4">Old count</th>
                                <th className="py-1 pr-4">Paid before exposure</th>
                                <th className="py-1 pr-4">Never confirmed paid</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.excluded.map((e) => (
                                <tr key={`excl-${e.variant}`}>
                                  <td className="py-1 pr-4 font-semibold text-gray-400">
                                    {e.variant}
                                  </td>
                                  <td className="py-1 pr-4">{e.legacyBuyers}</td>
                                  <td className="py-1 pr-4">{e.paidBeforeExposure}</td>
                                  <td className="py-1 pr-4">{e.noPaidStamp}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )}

                      {/* Per-fb-palm-sign breakdown — DIAGNOSTIC ONLY. */}
                      {results.bySign && results.bySign.length > 0 && (
                        <div className="space-y-2 border-t border-gray-800 pt-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-200">
                              By fb-palm lander
                            </span>
                            <span className="text-xs text-amber-300">diagnostic only</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            The same numbers split by ad sign. Decide the test on the pooled table
                            above — with this many landers, the best-looking one will show a large
                            lift by chance alone, and each lander is only a fraction of the
                            pre-registered N.
                          </p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700 text-left text-gray-400">
                                <th className="py-2 pr-4">Lander</th>
                                <th className="py-2 pr-4">Arm</th>
                                <th className="py-2 pr-4">Exposed</th>
                                <th className="py-2 pr-4">Buyers</th>
                                <th className="py-2 pr-4">Conv %</th>
                                <th className="py-2 pr-4">Lift vs {controlKey}</th>
                                <th className="py-2 pr-4">$ / user</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.bySign.map((g) =>
                                g.rows.map((r, i) => (
                                  <tr
                                    key={`${g.sign}-${r.variant}`}
                                    className={
                                      i === g.rows.length - 1
                                        ? "border-b border-gray-700"
                                        : "border-b border-gray-800/50"
                                    }
                                  >
                                    <td className="py-2 pr-4 font-mono text-xs text-gray-300">
                                      {i === 0 ? g.sign : ""}
                                    </td>
                                    <td className="py-2 pr-4 font-semibold">{r.variant}</td>
                                    <td className="py-2 pr-4">{r.viewers}</td>
                                    <td className="py-2 pr-4">{r.buyers}</td>
                                    <td className="py-2 pr-4">{r.conversionPct}%</td>
                                    <td className="py-2 pr-4">{liftOf(r)}</td>
                                    <td className="py-2 pr-4">${r.revPerViewerUsd.toFixed(2)}</td>
                                  </tr>
                                )),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Per-/fb-tarot-lander breakdown — DIAGNOSTIC ONLY. */}
                      {results.byTarotLander && results.byTarotLander.length > 0 && (
                        <div className="space-y-2 border-t border-gray-800 pt-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-200">
                              By fb-tarot lander
                            </span>
                            <span className="text-xs text-amber-300">diagnostic only</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            The same numbers split by tarot lander — card facing × ad angle. Decide
                            the test on the pooled table above; each lander is only a fraction of
                            the pre-registered N, and the best-looking one will show a large lift
                            by chance alone.
                          </p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700 text-left text-gray-400">
                                <th className="py-2 pr-4">Lander</th>
                                <th className="py-2 pr-4">Arm</th>
                                <th className="py-2 pr-4">Exposed</th>
                                <th className="py-2 pr-4">Buyers</th>
                                <th className="py-2 pr-4">Conv %</th>
                                <th className="py-2 pr-4">Lift vs {controlKey}</th>
                                <th className="py-2 pr-4">$ / user</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.byTarotLander.map((g) =>
                                g.rows.map((r, i) => (
                                  <tr
                                    key={`${g.facing}-${g.angle}-${r.variant}`}
                                    className={
                                      i === g.rows.length - 1
                                        ? "border-b border-gray-700"
                                        : "border-b border-gray-800/50"
                                    }
                                  >
                                    <td className="py-2 pr-4 text-xs text-gray-300">
                                      {i === 0 ? tarotLanderLabel(g.facing, g.angle) : ""}
                                    </td>
                                    <td className="py-2 pr-4 font-semibold">{r.variant}</td>
                                    <td className="py-2 pr-4">{r.viewers}</td>
                                    <td className="py-2 pr-4">{r.buyers}</td>
                                    <td className="py-2 pr-4">{r.conversionPct}%</td>
                                    <td className="py-2 pr-4">{liftOf(r)}</td>
                                    <td className="py-2 pr-4">${r.revPerViewerUsd.toFixed(2)}</td>
                                  </tr>
                                )),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Per-AD-URL breakdown (visitor-keyed tests) — the honest read
                          when landers have been added mid-flight. */}
                      {results.byTarotHook && results.byTarotHook.length > 0 && (
                        <div className="space-y-2 border-t border-gray-800 pt-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-200">By ad URL</span>
                            {(results.landerCount ?? 0) > 1 && (
                              <span className="text-xs text-emerald-300">read this one</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            The same numbers split by the ad URL she clicked — hook × deck.{" "}
                            {(results.landerCount ?? 0) > 1 ? (
                              <span className="text-amber-300">
                                Landers can be added to a running test, so the pooled table above
                                blends landers that have been live for different lengths of time. Where
                                the two disagree, trust this table.
                              </span>
                            ) : (
                              <>
                                With one lander in the test this is just the pooled table again. It
                                stops being redundant the moment a second ad URL is added.
                              </>
                            )}
                          </p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700 text-left text-gray-400">
                                <th className="py-2 pr-4">Ad URL</th>
                                <th className="py-2 pr-4">Arm</th>
                                <th className="py-2 pr-4">Chats</th>
                                <th className="py-2 pr-4">Buyers</th>
                                <th className="py-2 pr-4">Conv %</th>
                                <th className="py-2 pr-4">Lift vs {controlKey}</th>
                                <th className="py-2 pr-4">$ / visitor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.byTarotHook.map((g) =>
                                g.rows.map((r, i) => (
                                  <tr
                                    key={`${g.hook}-${g.deck}-${r.variant}`}
                                    className={
                                      i === g.rows.length - 1
                                        ? "border-b border-gray-700"
                                        : "border-b border-gray-800/50"
                                    }
                                  >
                                    <td className="py-2 pr-4 font-mono text-xs text-gray-300">
                                      {i === 0 ? `${g.hook} · ${g.deck}` : ""}
                                    </td>
                                    <td className="py-2 pr-4 font-semibold">{r.variant}</td>
                                    <td className="py-2 pr-4">{r.viewers}</td>
                                    <td className="py-2 pr-4">{r.buyers}</td>
                                    <td className="py-2 pr-4">{r.conversionPct}%</td>
                                    <td className="py-2 pr-4">{liftOf(r)}</td>
                                    <td className="py-2 pr-4">${r.revPerViewerUsd.toFixed(2)}</td>
                                  </tr>
                                )),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

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
                              disabled={!winnerPick || nGated}
                              onClick={() => declareWinner(selectedKey, winnerPick)}
                              className="rounded border border-amber-700 px-3 py-1 text-sm text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
                            >
                              Declare winner
                            </button>
                            {nGated && (
                              <span className="text-[11px] text-gray-500">
                                locked until N ({progress!.minExposures}/{progress!.targetN})
                              </span>
                            )}
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
