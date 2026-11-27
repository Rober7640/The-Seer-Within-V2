// Stages 4–7 of funnel-localize, on a run folder that stage 3 (translate.mts --run) filled.
//
//   npx tsx scripts/l10n/review.mts <stage> <run dir> --locale <code> --env <.env> --key-var NAME
//
//   checks      stage 4: deterministic checks (check.mts) on translations.json → checks.json
//   bt          stage 5: back-translation, French → English, by a call that never sees the
//               English source (Message Batches, effort low) → bt.json
//   codex       stage 6: one `codex exec` per packet of ~70 segments, max 2 at a time, read-only,
//               no repo access (it runs in the packet folder) → codex/<packet>.json
//   adjudicate  stage 7: Claude reads EN, FR, the back-translation, the check issues and the
//               Codex flags for each call group and keeps or rewrites each flagged segment, with
//               a reason (Message Batches) → adjudication.json, final.json; then the checks
//               run again on what changed, and anything still failing → disputed.json.
//               overrides.json ({ id: { fr, reason } }) is applied last, as logged editor calls.
//
// Each stage is idempotent on its own output file (delete it to redo the stage).
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import type { Segment } from "./extract.mts";
import { apiKey, packSystem, readJsonl, type Group } from "./translate.mts";
import { checkSegment, loadPack, type Issue } from "./check.mts";
import { adjudicateTask, btSystem, codexPrompt as buildCodexPrompt, textKey } from "./prompts.mts";
import type { LocaleCode } from "../../shared/locales";

const args = process.argv.slice(2);
const arg = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [STAGE, DIR] = args.filter((a, i) => !a.startsWith("--") && !(args[i - 1] ?? "").startsWith("--"));
if (!arg("--locale")) throw new Error("--locale <code> is required (fr-FR, es-US, …)");
const LOCALE = arg("--locale")! as LocaleCode;
/** The model's JSON field for the translated text ("fr", "es"); run files keep `fr` (see prompts.mts). */
const K = textKey(LOCALE);
const MODEL = arg("--model", "claude-opus-5-5")!;
const f = (n: string) => path.join(DIR, n);
const readJson = (n: string, d?: any) => (fs.existsSync(f(n)) ? JSON.parse(fs.readFileSync(f(n), "utf8")) : d);
const writeJson = (n: string, v: unknown) => fs.writeFileSync(f(n), JSON.stringify(v, null, 1));

type Tr = { id: string; fr: string; note: string; uncertain: boolean; risk: string };
const segs = new Map(readJsonl<Segment>(f("segments.jsonl")).map((s) => [s.id, s]));
const groups: Group[] = readJson("groups.json");
const tr: Record<string, Tr> = readJson("translations.json", {});

// ── Message Batches: submit once, poll, collect (state in <name>.batch.json) ──────────────
async function runBatch<T>(name: string, requests: { custom_id: string; params: any }[], parse: (cid: string, msg: any) => T) {
  const client = new Anthropic({ apiKey: apiKey() });
  const state = readJson(`${name}.batch.json`);
  let id = state?.id;
  if (!id) {
    const b = await client.messages.batches.create({ requests } as any);
    id = b.id;
    writeJson(`${name}.batch.json`, { id, created_at: b.created_at, requests: requests.length });
    console.log(`${name}: submitted ${id} (${requests.length} requests)`);
  }
  const deadline = Date.now() + Number(arg("--wait", "150")) * 60_000;
  let b = await client.messages.batches.retrieve(id);
  while (b.processing_status !== "ended" && Date.now() < deadline) {
    console.log(`${new Date().toISOString().slice(11, 19)} ${name} ${b.processing_status}: ${JSON.stringify(b.request_counts)}`);
    await new Promise((r) => setTimeout(r, 60_000));
    b = await client.messages.batches.retrieve(id);
  }
  if (b.processing_status !== "ended") throw new Error(`${name}: still ${b.processing_status}; run again to keep waiting`);
  const out = new Map<string, T>();
  const failed: string[] = [];
  const usage: any[] = [];
  for await (const r of await client.messages.batches.results(id)) {
    if (r.result.type !== "succeeded") { failed.push(r.custom_id); continue; }
    try { out.set(r.custom_id, parse(r.custom_id, r.result.message)); usage.push({ custom_id: r.custom_id, ...r.result.message.usage }); }
    catch (e: any) { console.log(`  ${r.custom_id}: ${String(e.message).slice(0, 120)}`); failed.push(r.custom_id); }
  }
  // the few a batch could not answer: once more, directly (full price)
  for (const cid of failed) {
    const req = requests.find((q) => q.custom_id === cid)!;
    try {
      const msg = await client.messages.stream(req.params).finalMessage();
      out.set(cid, parse(cid, msg));
      usage.push({ custom_id: cid, direct: true, ...msg.usage });
      console.log(`  ${cid}: retried OK`);
    } catch (e: any) { console.log(`  ${cid}: retry failed ${String(e.message).slice(0, 120)}`); }
  }
  writeJson(`${name}.usage.json`, usage);
  const sum = (k: string) => usage.reduce((n, u) => n + (u[k] ?? 0), 0);
  const cost = (sum("input_tokens") * 4 + sum("cache_creation_input_tokens") * 5 + sum("cache_read_input_tokens") * 0.4 + sum("output_tokens") * 20) / 1e6 * 0.5;
  console.log(`${name}: ${out.size}/${requests.length} answered · ≈ $${cost.toFixed(2)}`);
  return out;
}

const textOf = (msg: any) => {
  if (msg.stop_reason !== "end_turn") throw new Error(`stop_reason ${msg.stop_reason}`);
  return msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
};
const schema = (props: Record<string, any>) => ({
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: Object.keys(props), properties: props } } },
});

// ── stage 4: checks ──────────────────────────────────────────────────────────────────────
function runChecks(texts: Record<string, string>): Record<string, Issue[]> {
  const { pack, banned } = loadPack(LOCALE);
  const out: Record<string, Issue[]> = {};
  for (const [id, fr] of Object.entries(texts)) {
    const seg = segs.get(id);
    if (!seg) continue;
    const issues = checkSegment(seg, fr, pack, banned, LOCALE).filter((i) => i.severity !== "info");
    if (issues.length) out[id] = issues;
  }
  return out;
}

// ── stage 5: back-translation ────────────────────────────────────────────────────────────
const BT_SYSTEM = btSystem(LOCALE);
async function backTranslate() {
  const requests = groups.map((g) => ({
    custom_id: g.custom_id,
    params: {
      model: MODEL, max_tokens: 16000,
      system: [{ type: "text", text: BT_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "```json\n" + JSON.stringify(g.ids.map((id) => ({ id, [K]: tr[id]?.fr ?? "" })), null, 1) + "\n```" }],
      output_config: { effort: "low", format: { type: "json_schema", schema: schema({ id: { type: "string" }, en: { type: "string" } }) } },
    },
  }));
  const res = await runBatch("bt", requests, (_cid, msg) => JSON.parse(textOf(msg)).items as { id: string; en: string }[]);
  const bt: Record<string, string> = {};
  for (const items of res.values()) for (const it of items) bt[it.id] = it.en;
  writeJson("bt.json", bt);
  console.log(`bt.json: ${Object.keys(bt).length}/${segs.size}`);
}

// ── stage 6: Codex second opinion ────────────────────────────────────────────────────────
const CODEX_SCHEMA = {
  type: "object", additionalProperties: false, required: ["flags", "soundsTranslated", "overall"],
  properties: {
    flags: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id", "category", "severity", "issue", "fix"],
        properties: {
          id: { type: "string" },
          category: { type: "string", enum: ["accuracy", "fluency", "register", "terminology", "locale", "naturalness", "voice", "legal"] },
          severity: { type: "string", enum: ["minor", "major", "critical"] },
          issue: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
    soundsTranslated: { type: "integer", minimum: 1, maximum: 5 },
    overall: { type: "string" },
  },
};

const codexPrompt = (rows: unknown[]) => buildCodexPrompt(LOCALE, rows);

function codexRun(packetDir: string): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn("sh", ["-c", `perl -e 'alarm shift; exec @ARGV' 1200 codex exec --skip-git-repo-check -s read-only --ephemeral -C . --output-schema schema.json -o out.json - < prompt.txt > codex.log 2>&1`], { cwd: packetDir });
    p.on("exit", (code) => resolve(code ?? 1));
  });
}

// --fr final.json --out codex2: a later review round of the edited French, blind to earlier flags
const CODEX_OUT = arg("--out", "codex")!;
const CODEX_FR: Record<string, string> | null = arg("--fr") ? readJson(arg("--fr")!) : null;
async function codex() {
  fs.mkdirSync(f(CODEX_OUT), { recursive: true });
  // packets of whole call groups, ~70 segments each
  const packets: string[][] = [];
  let cur: string[] = [];
  for (const g of groups) {
    if (cur.length && cur.length + g.ids.length > 70) { packets.push(cur); cur = []; }
    cur.push(...g.ids);
  }
  if (cur.length) packets.push(cur);
  const todo = packets.map((ids, i) => ({ name: `p${String(i + 1).padStart(2, "0")}`, ids })).filter((p) => !fs.existsSync(f(`${CODEX_OUT}/${p.name}.json`)));
  console.log(`codex: ${packets.length} packets, ${todo.length} to run, 2 at a time`);
  const one = async (p: { name: string; ids: string[] }) => {
    const pd = path.resolve(f(`${CODEX_OUT}/${p.name}`));
    fs.mkdirSync(pd, { recursive: true });
    const rows = p.ids.map((id) => { const s = segs.get(id)!; return { id, kind: s.kind, scene: s.scene, en: s.en, [K]: (CODEX_FR ? CODEX_FR[id] : tr[id]?.fr) ?? "" }; });
    fs.writeFileSync(path.join(pd, "prompt.txt"), codexPrompt(rows));
    fs.writeFileSync(path.join(pd, "schema.json"), JSON.stringify(CODEX_SCHEMA));
    const t0 = Date.now();
    for (let attempt = 1; attempt <= 2; attempt++) {
      const code = await codexRun(pd);
      try {
        const out = JSON.parse(fs.readFileSync(path.join(pd, "out.json"), "utf8"));
        const known = new Set(p.ids);
        out.flags = out.flags.filter((x: any) => known.has(x.id));
        fs.writeFileSync(f(`${CODEX_OUT}/${p.name}.json`), JSON.stringify({ ...out, ids: p.ids, seconds: Math.round((Date.now() - t0) / 1000) }, null, 1));
        console.log(`  ${p.name}: ${out.flags.length} flags, sounds translated ${out.soundsTranslated}/5 (${Math.round((Date.now() - t0) / 1000)}s)`);
        return;
      } catch { console.log(`  ${p.name}: attempt ${attempt} gave no usable out.json (exit ${code})`); }
    }
  };
  const queue = [...todo];
  await Promise.all([0, 1].map(async () => { for (let p = queue.shift(); p; p = queue.shift()) await one(p); }));
}

// ── stage 7: adjudication ────────────────────────────────────────────────────────────────
const ADJ_TASK = adjudicateTask(LOCALE);

async function adjudicate() {
  const bt: Record<string, string> = readJson("bt.json", {});
  const checks: Record<string, Issue[]> = readJson("checks.json") ?? runChecks(Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, v.fr])));
  const flags: Record<string, any[]> = {};
  for (const file of fs.existsSync(f("codex")) ? fs.readdirSync(f("codex")).filter((n) => n.endsWith(".json")) : []) {
    for (const x of JSON.parse(fs.readFileSync(f(`codex/${file}`), "utf8")).flags) (flags[x.id] ??= []).push({ category: x.category, severity: x.severity, issue: x.issue, fix: x.fix });
  }
  const system = packSystem() + "\n\n" + ADJ_TASK;
  const requests = groups.map((g) => ({
    custom_id: g.custom_id,
    params: {
      model: MODEL, max_tokens: 32000,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Scene: ${g.label}\n\`\`\`json\n` + JSON.stringify(g.ids.map((id) => ({
          id, kind: segs.get(id)!.kind, en: segs.get(id)!.en, [K]: tr[id]?.fr ?? "", backTranslation: bt[id] ?? "",
          translatorNote: tr[id]?.note || undefined, uncertain: tr[id]?.uncertain || undefined,
          checks: checks[id]?.map((i) => `${i.severity}: ${i.kind} — ${i.detail}`), reviewer: flags[id],
        })), null, 1) + "\n```",
      }],
      output_config: { effort: "high", format: { type: "json_schema", schema: schema({ id: { type: "string" }, decision: { type: "string", enum: ["keep", "rewrite"] }, [K]: { type: "string" }, reason: { type: "string" } }) } },
    },
  }));
  const res = await runBatch("adjudicate", requests, (cid, msg) => {
    const want = new Set(groups.find((g) => g.custom_id === cid)!.ids);
    return (JSON.parse(textOf(msg)).items as any[]).filter((it) => want.has(it.id));
  });
  const decisions: Record<string, { decision: string; fr: string; reason: string; was: string }> = {};
  for (const items of res.values()) for (const it of items) decisions[it.id] = { decision: it.decision, fr: it[K], reason: it.reason, was: tr[it.id]?.fr };
  // Editor overrides (overrides.json: { id: { fr, reason } }): a human or main-thread call made
  // after reading the run, applied last and logged like any other decision.
  const overrides: Record<string, { fr: string; reason: string }> = readJson("overrides.json", {});
  for (const [id, o] of Object.entries(overrides)) if (segs.has(id)) decisions[id] = { decision: "rewrite", fr: o.fr, reason: `editor: ${o.reason}`, was: tr[id]?.fr };
  const final: Record<string, string> = {};
  for (const id of segs.keys()) final[id] = decisions[id]?.decision === "rewrite" ? decisions[id].fr : tr[id]?.fr;
  writeJson("adjudication.json", decisions);
  // the checks again, on what changed; a rewrite that fails falls back to the translation if that passes
  const changed = Object.fromEntries(Object.entries(decisions).filter(([, d]) => d.decision === "rewrite").map(([id, d]) => [id, d.fr]));
  const after = runChecks(changed);
  const disputed: Record<string, unknown> = {};
  for (const [id, issues] of Object.entries(after)) {
    if (!issues.some((i) => i.severity === "fail")) continue;
    const before = runChecks({ [id]: tr[id].fr })[id];
    if (!before?.some((i) => i.severity === "fail")) { final[id] = tr[id].fr; disputed[id] = { kept: "translation", rewriteFailed: issues, rewrite: changed[id] }; }
    else disputed[id] = { kept: "rewrite", issues, rewrite: changed[id], translation: tr[id].fr };
  }
  const missingFinal = [...segs.keys()].filter((id) => typeof final[id] !== "string");
  for (const id of missingFinal) disputed[id] = { kept: "nothing", why: "no translation" };
  writeJson("final.json", final);
  writeJson("disputed.json", disputed);
  const n = Object.values(decisions);
  console.log(`adjudication: ${n.length} looked at, ${n.filter((d) => d.decision === "rewrite").length} rewritten, ${n.filter((d) => d.decision === "keep").length} kept · disputed ${Object.keys(disputed).length}`);
}

if (STAGE === "checks") {
  const c = runChecks(Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, v.fr])));
  writeJson("checks.json", c);
  const all = Object.values(c).flat();
  console.log(`checks: ${Object.keys(c).length} segments with issues · ${all.filter((i) => i.severity === "fail").length} fail, ${all.filter((i) => i.severity === "review").length} review`);
  const byKind: Record<string, number> = {};
  for (const i of all) byKind[`${i.severity} ${i.kind}`] = (byKind[`${i.severity} ${i.kind}`] ?? 0) + 1;
  console.log(Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${v} ${k}`).join("\n"));
} else if (STAGE === "bt") await backTranslate();
else if (STAGE === "codex") await codex();
else if (STAGE === "adjudicate") await adjudicate();
else console.error("stage: checks | bt | codex | adjudicate");
