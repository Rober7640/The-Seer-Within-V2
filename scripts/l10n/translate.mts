// Stage 2/3 of funnel-localize: translate segments scene by scene with Claude.
//
//   Pilot (stage 2, calibration): several arms on the same segments, same model
//     npx tsx scripts/l10n/translate.mts --pilot [--set pilot|holdout] --locale fr-FR \
//       --env <path/to/.env> [--key-var NAME] [--arm A=localize/locales/fr-FR] [--arm C=control]
//   --arm NAME=<pack dir> = translate with that locale pack (style, glossary, banned, legal, market)
//   --arm NAME=control    = a plain "translate into French", with only the technical
//                           rules every arm needs (placeholders, tags, line breaks, JSON)
//   Default arms: A = the current pack, C = control.
//   Writes localize/runs/<locale>/<set>-<stamp>/{segments.jsonl,arm<NAME>.json,usage.json}
//
// The API key is read from --env (only the ANTHROPIC_API_KEY line) or the
// environment; it is never copied or printed.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Segment } from "./extract.mts";

const arg = (k: string, d?: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const LOCALE = arg("--locale", "fr-FR")!;
const MODEL = arg("--model", "claude-opus-5-5")!;
const EFFORT = arg("--effort", "high")!;
const ENV = arg("--env");

// --key-var picks which variable in the env file (e.g. ANTHROPIC_API_KEY_BACKUP_1).
const KEY_VAR = arg("--key-var", "ANTHROPIC_API_KEY")!;
export function apiKey(): string {
  if (process.env[KEY_VAR]) return process.env[KEY_VAR]!;
  if (!ENV) throw new Error(`no ${KEY_VAR}: pass --env <file>`);
  const line = fs.readFileSync(ENV, "utf8").split("\n").find((l) => l.startsWith(`${KEY_VAR}=`));
  if (!line) throw new Error(`no ${KEY_VAR} in ${ENV}`);
  return line.slice(KEY_VAR.length + 1).trim().replace(/^["']|["']$/g, "");
}

export function packSystem(dir = path.join("localize/locales", LOCALE)): string {
  const read = (f: string) => fs.readFileSync(path.join(dir, f), "utf8");
  const pack = JSON.parse(read("pack.json"));
  const glossary = JSON.parse(read("glossary.json"));
  const banned = JSON.parse(read("banned.json"));
  const gl = glossary.terms.map((t: any) => `- ${t.en} → ${t.fr}${t.note ? ` (${t.note})` : ""}${t.avoid ? `; not: ${t.avoid.join(", ")}` : ""}`).join("\n");
  const cards = Object.entries(glossary.tarot).map(([en, fr]) => en === "_doc" ? String(fr) : `${en} → ${fr}`).join("; ");
  // banned.json v1 = { group: [rules] }; v2 = { rules: [{group, level, fix, …}] }
  const ruleList: any[] = Array.isArray(banned.rules) ? banned.rules
    : Object.entries(banned).filter(([k]) => !k.startsWith("_")).flatMap(([g, rules]: any) => rules.map((r: any) => ({ group: g, level: "fail", ...r })));
  const bans = ruleList.map((r) => `- [${r.group}${r.level === "review" ? ", check the meaning" : ""}] ${r.fix}`).join("\n");
  const riskNote = /`risk`/.test(read("legal.md")) ? `\n\nSet "risk" on each segment as legal.md describes ("none" when it carries none).` : "";
  return [
    `You translate the copy of a spiritual-reading sales funnel from English into ${pack.language}, for buyers in ${pack.market.country}. You write it as a native French copywriter would write it from scratch: natural, spoken, warm French that does not read as translated.`,
    `## Market facts\n- Register: "${pack.register}" always.\n- The buyer is a woman: ${pack.buyerGender.value} agreement.\n- Prices: ${pack.priceRule}\n- Never translate: ${pack.doNotTranslate.join(", ")}.`,
    `## Evelyn's voice\n${read("style.md")}`,
    `## Glossary (required renderings)\n${gl}\nTarot cards (French Rider-Waite names): ${cards}`,
    `## Never write\n${bans}`,
    `## Legal limits in ${pack.market.country}\n${read("legal.md")}${riskNote}`,
    TECH_RULES,
  ].join("\n\n");
}

const TECH_RULES = `## Format (both mandatory)
- Return every segment you are given, by id, exactly once.
- Keep every {placeholder} exactly as written (same name, same braces); its position may move.
- Keep every <tag>…</tag> pair, around the words that carry the same emphasis.
- Keep the same number of line breaks (\\n): each line is shown on its own.
- "note": one short line, in English, on any choice a reviewer should know about (empty if none).
- "uncertain": true when you are unsure the French is right (meaning, tone or a term).
- "risk": "none" unless the instructions above tell you to tag one.`;

const CONTROL_SYSTEM = `You translate English text from a website and chat into French.\n\n${TECH_RULES}`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" }, fr: { type: "string" }, note: { type: "string" }, uncertain: { type: "boolean" },
          risk: { type: "string", enum: ["none", "urgency", "danger", "claim", "ai-identity", "consent"] },
        },
        required: ["id", "fr", "note", "uncertain", "risk"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

export function sceneMessage(scene: string, segs: Segment[], context: { before?: string; after?: string; perRowScene?: boolean }): string {
  // A call that pools several short moments names each row's own scene.
  // A short label (a status word, a button) is often half of a sentence the UI assembles:
  // it carries the English shown next to it, so "Online" after "Evelyn Cross is" agrees.
  const near = (s: Segment) => (s.en.length < 30 && (s as any).near ? { shownNextTo: (s as any).near } : {});
  const rows = segs.map((s) => (context.perRowScene ? { id: s.id, kind: s.kind, scene: s.scene, en: s.en, ...near(s) } : { id: s.id, kind: s.kind, en: s.en, ...near(s) }));
  return [
    `Scene: ${scene}`,
    context.before ? `(Just before this scene the buyer saw: "${context.before}")` : "",
    `The segments below are in the order the buyer sees them. Translate each one.`,
    "```json",
    JSON.stringify(rows, null, 1),
    "```",
    context.after ? `(Just after this scene comes: "${context.after}")` : "",
  ].filter(Boolean).join("\n");
}

type Out = { id: string; fr: string; note: string; uncertain: boolean; risk: string };

export function requestParams(system: string, scene: string, segs: Segment[], context: { before?: string; after?: string; perRowScene?: boolean } = {}) {
  return {
    model: MODEL,
    max_tokens: 32000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: sceneMessage(scene, segs, context) }],
    output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
  } as any;
}

/** Parse one translation reply; throws unless it ended cleanly and holds every id. */
export function parseReply(msg: any, scene: string, segs: Segment[]): Out[] {
  const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  if (msg.stop_reason !== "end_turn") throw new Error(`${scene}: stop_reason ${msg.stop_reason}`);
  const want = new Set(segs.map((s) => s.id));
  const items: Out[] = JSON.parse(text).items.filter((i: Out) => want.has(i.id));
  const got = new Set(items.map((i) => i.id));
  const missing = segs.filter((s) => !got.has(s.id)).map((s) => s.id);
  if (missing.length) throw new Error(`${scene}: missing ${missing.join(", ")}`);
  return items;
}

export async function translateScene(client: Anthropic, system: string, scene: string, segs: Segment[], context: { before?: string; after?: string; perRowScene?: boolean } = {}) {
  const msg = await client.messages.stream(requestParams(system, scene, segs, context)).finalMessage();
  return { items: parseReply(msg, scene, segs), usage: msg.usage };
}

// ── pilot ────────────────────────────────────────────────────────────────────
export function pilotSegments(all: Segment[]): Segment[] {
  const take = (f: (s: Segment) => boolean, n = 99) => all.filter(f).slice(0, n);
  return [
    ...take((s) => s.twin === "landing.variants" && s.path?.[0] === "default"),
    ...take((s) => /handleNameCapture/.test(s.scene)),
    ...take((s) => /handlePermission/.test(s.scene), 18),
    ...take((s) => /shared\/orderBump\.ts › (bumpOfferCopy|BUMP_ACCEPT_LABEL|BUMP_DECLINE_LABEL)/.test(s.scene) || (s.file === "shared/orderBump.ts" && /^(Yes, double it|No, just my reading)$/.test(s.en))),
    ...take((s) => /UPSELL_RITUAL$/.test(s.scene)),
    ...take((s) => (s.twin === "tarot.headlines" || s.twin === "tarot.questions") && s.path?.[0] === "cards-love-again"),
    ...take((s) => s.scene === "tarot.decks › arcana-mfh › cards-love-again"),
  ];
}

// Holdout: scenes the pack was NOT tuned on (the v2 pack took fixes from the pilot grade),
// so a v1-vs-v2 comparison here is not teaching to the test.
export function holdoutSegments(all: Segment[]): Segment[] {
  const take = (f: (s: Segment) => boolean, n = 99) => all.filter(f).slice(0, n);
  const hook = "cards-expecting-too-much";
  return [
    ...take((s) => /ClearingChoiceCard/.test(s.scene)),
    ...take((s) => /handlePitchResponse/.test(s.scene)),
    ...take((s) => /UPSELL2_PATH_A_OPEN$/.test(s.scene)),
    ...take((s) => (s.twin === "tarot.headlines" || s.twin === "tarot.questions") && s.path?.[0] === hook),
    ...take((s) => s.twin === "tarot.shadow" && s.path?.[1] === hook),
  ];
}

function armsFromArgs(): [string, string][] {
  const arms: [string, string][] = [];
  process.argv.forEach((a, i) => { if (a === "--arm") { const [n, v] = process.argv[i + 1].split("="); arms.push([n, v]); } });
  return arms.length ? arms : [["A", path.join("localize/locales", LOCALE)], ["C", "control"]];
}

async function pilot() {
  const all: Segment[] = fs.readFileSync("localize/runs/extract/segments.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const set = arg("--set", "pilot")!;
  const segs = set === "holdout" ? holdoutSegments(all) : pilotSegments(all);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const out = path.join("localize/runs", LOCALE, `${set}-${stamp}`);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "segments.jsonl"), segs.map((s) => JSON.stringify(s)).join("\n") + "\n");
  // One call per buyer-facing moment: tiny scenes that belong together share a call.
  const callGroup = (s: Segment) =>
    s.file === "shared/orderBump.ts" ? "order bump (offer + its two buttons)"
    : s.twin?.startsWith("tarot.") ? `tarot lander + reads › ${s.twin === "tarot.headlines" || s.twin === "tarot.questions" ? s.path?.[0] : s.path?.[1]} (headline, question, then the three card reads a/b/c)`
    : s.scene.replace(/ › inputPlaceholder$/, "");
  const byScene = new Map<string, Segment[]>();
  for (const s of segs) (byScene.get(callGroup(s)) ?? byScene.set(callGroup(s), []).get(callGroup(s))!).push(s);
  console.log(`pilot: ${segs.length} segments in ${byScene.size} scenes → ${out}`);
  const client = new Anthropic({ apiKey: apiKey() });
  const arms: Record<string, string> = Object.fromEntries(armsFromArgs().map(([n, v]) => [n, v === "control" ? CONTROL_SYSTEM : packSystem(v)]));
  fs.writeFileSync(path.join(out, "arms.json"), JSON.stringify(armsFromArgs(), null, 1));
  const usage: Record<string, any[]> = Object.fromEntries(Object.keys(arms).map((a) => [a, []]));
  for (const [arm, system] of Object.entries(arms)) {
    const result: Record<string, Out> = {};
    // two scenes at a time
    const scenes = [...byScene];
    for (let i = 0; i < scenes.length; i += 2) {
      const batch = scenes.slice(i, i + 2);
      const done = await Promise.all(batch.map(([scene, list]) => translateScene(client, system, scene, list)));
      done.forEach((d, k) => { for (const it of d.items) result[it.id] = it; usage[arm].push({ scene: batch[k][0], ...d.usage }); });
      console.log(`  arm ${arm}: ${Math.min(i + 2, scenes.length)}/${scenes.length} scenes`);
    }
    fs.writeFileSync(path.join(out, `arm${arm}.json`), JSON.stringify(result, null, 1));
  }
  fs.writeFileSync(path.join(out, "usage.json"), JSON.stringify(usage, null, 1));
  const tok = (a: string, k: string) => usage[a].reduce((n, u) => n + (u[k] ?? 0), 0);
  for (const a of Object.keys(arms)) console.log(`  arm ${a}: in ${tok(a, "input_tokens")} (+cache w ${tok(a, "cache_creation_input_tokens")} r ${tok(a, "cache_read_input_tokens")}), out ${tok(a, "output_tokens")}`);
  console.log(out);
}

// ── run (stage 3): the bulk translation, through Message Batches ─────────────
//   npx tsx scripts/l10n/translate.mts --run localize/runs/fr-FR/<name> --scope fb,tarot \
//     --hooks <hooks.json> --locale fr-FR --env <.env> --key-var NAME [--wait 120]
// Idempotent: the first call freezes the scope (segments.jsonl, groups.json) and submits
// one batch; every later call on the same folder only polls and collects. Requests the
// batch could not answer are retried one by one (streaming, full price).

/** Which tarot lander a segment belongs to; "__deck" = a deck's shared labels; null = not tarot. */
export function hookOf(s: Segment): string | null {
  const p = s.path ?? [];
  if (s.twin === "tarot.headlines" || s.twin === "tarot.questions") return String(p[0]);
  if (s.twin === "tarot.shadow") return String(p[1]);
  if (s.twin === "tarot.decks") return p[1] === "reads" || p[1] === "hookInstruction" ? String(p[2]) : "__deck";
  return null;
}

export function scopeSegments(all: Segment[], scopes: string[], hooks: Set<string>): Segment[] {
  return all.filter((s) => {
    const h = hookOf(s);
    if (h !== null) return scopes.includes("tarot") && (h === "__deck" || hooks.has(h));
    if (s.source === "legal") return scopes.includes("legal");
    if (s.source === "jsx") return scopes.includes("fb") || scopes.includes("jsx");
    return scopes.includes("fb");
  });
}

const MAX_PER_CALL = 60;
export interface Group { custom_id: string; label: string; ids: string[]; before?: string; perRowScene?: boolean }

/** One call per buyer-facing moment, so the translator sees the flow; long scenes split in order. */
export function callGroups(segs: Segment[]): Group[] {
  const keyOf = (s: Segment) => {
    const h = hookOf(s);
    if (h === "__deck") return `tarot deck labels › ${s.path?.[0]} (shared by every lander on this deck: the card names, what each card stands for, the buttons)`;
    if (h) return `tarot lander › ${h}: the ad question (headline, question), then for each deck the three card reads a/b/c (the buyer turns one face-down card; each read is a run of chat bubbles), then any "shadow" reads, a second wording of the same reads tested against the first`;
    if (s.file === "shared/orderBump.ts") return "order bump (offer + its two buttons)";
    return s.scene.replace(/ › inputPlaceholder$/, "");
  };
  const byKey = new Map<string, Segment[]>();
  for (const s of segs) (byKey.get(keyOf(s)) ?? byKey.set(keyOf(s), []).get(keyOf(s))!).push(s);
  const out: Group[] = [];
  // Moments under 5 lines are pooled per area (file or twin), up to 40 lines a call, so a
  // lone button does not pay for a whole system prompt and still sees its neighbours.
  const pooled = new Map<string, Segment[]>();
  for (const [label, list] of [...byKey]) {
    if (list.length >= 5 || label.startsWith("tarot")) continue;
    const area = label.split(" › ")[0];
    pooled.set(area, [...(pooled.get(area) ?? []), ...list]);
    byKey.delete(label);
  }
  const POOL = 40;
  for (const [area, list] of pooled) {
    for (let p = 0; p * POOL < list.length; p++) {
      const chunk = list.slice(p * POOL, (p + 1) * POOL);
      out.push({ custom_id: `g${String(out.length + 1).padStart(3, "0")}`, label: `${area}: several short moments (each segment names its own scene)`, ids: chunk.map((s) => s.id), perRowScene: true });
    }
  }
  for (const [label, list] of byKey) {
    const parts = Math.ceil(list.length / MAX_PER_CALL);
    for (let p = 0; p < parts; p++) {
      const chunk = list.slice(p * MAX_PER_CALL, (p + 1) * MAX_PER_CALL);
      out.push({
        custom_id: `g${String(out.length + 1).padStart(3, "0")}`,
        label: parts > 1 ? `${label} (part ${p + 1} of ${parts})` : label,
        ids: chunk.map((s) => s.id),
        ...(p > 0 ? { before: list[p * MAX_PER_CALL - 1].en.slice(0, 300) } : {}),
      });
    }
  }
  return out;
}

export const readJsonl = <T,>(f: string): T[] => fs.readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));

async function run() {
  const dir = arg("--run")!;
  fs.mkdirSync(dir, { recursive: true });
  const f = (n: string) => path.join(dir, n);
  if (!fs.existsSync(f("groups.json"))) {
    const all = readJsonl<Segment>("localize/runs/extract/segments.jsonl");
    const hooks = new Set<string>(arg("--hooks") ? JSON.parse(fs.readFileSync(arg("--hooks")!, "utf8")) : []);
    const segs = scopeSegments(all, arg("--scope", "fb,tarot")!.split(","), hooks);
    fs.writeFileSync(f("segments.jsonl"), segs.map((s) => JSON.stringify(s)).join("\n") + "\n");
    const groups = callGroups(segs);
    fs.writeFileSync(f("groups.json"), JSON.stringify(groups, null, 1));
    fs.writeFileSync(f("run.json"), JSON.stringify({ locale: LOCALE, model: MODEL, effort: EFFORT, keyVar: KEY_VAR, scope: arg("--scope", "fb,tarot"), hooks: [...hooks], at: new Date().toISOString() }, null, 1));
    console.log(`scope frozen: ${segs.length} segments in ${groups.length} calls`);
  }
  if (process.argv.includes("--dry")) return;
  const segs = new Map(readJsonl<Segment>(f("segments.jsonl")).map((s) => [s.id, s]));
  const allById = new Map(readJsonl<Segment>("localize/runs/extract/segments.jsonl").map((s) => [s.id, s]));
  for (const s of segs.values()) {
    const n = [s.prev, s.next].map((id) => (id ? allById.get(id)?.en : undefined)).filter(Boolean) as string[];
    if (n.length) (s as any).near = n.map((x) => x.slice(0, 80));
  }
  const groups: Group[] = JSON.parse(fs.readFileSync(f("groups.json"), "utf8"));
  const system = packSystem();
  fs.writeFileSync(f("system.txt"), system);
  const client = new Anthropic({ apiKey: apiKey() });
  const segsOf = (g: Group) => g.ids.map((id) => segs.get(id)!);

  if (!fs.existsSync(f("batch.json"))) {
    const batch = await client.messages.batches.create({
      requests: groups.map((g) => ({ custom_id: g.custom_id, params: requestParams(system, g.label, segsOf(g), { before: g.before, perRowScene: g.perRowScene }) })),
    } as any);
    fs.writeFileSync(f("batch.json"), JSON.stringify({ id: batch.id, created_at: batch.created_at, requests: groups.length }, null, 1));
    console.log(`submitted batch ${batch.id} (${groups.length} requests)`);
  }
  const { id } = JSON.parse(fs.readFileSync(f("batch.json"), "utf8"));
  const deadline = Date.now() + Number(arg("--wait", "120")) * 60_000;
  let b = await client.messages.batches.retrieve(id);
  while (b.processing_status !== "ended" && Date.now() < deadline) {
    console.log(`${new Date().toISOString().slice(11, 19)} ${b.processing_status}: ${JSON.stringify(b.request_counts)}`);
    await new Promise((r) => setTimeout(r, 60_000));
    b = await client.messages.batches.retrieve(id);
  }
  if (b.processing_status !== "ended") { console.log(`still ${b.processing_status}; run again to keep waiting`); return; }
  console.log(`ended: ${JSON.stringify(b.request_counts)}`);

  const result: Record<string, Out> = fs.existsSync(f("translations.json")) ? JSON.parse(fs.readFileSync(f("translations.json"), "utf8")) : {};
  const usage: any[] = [];
  const retry: Group[] = [];
  const byCid = new Map(groups.map((g) => [g.custom_id, g]));
  for await (const r of await client.messages.batches.results(id)) {
    const g = byCid.get(r.custom_id)!;
    if (r.result.type !== "succeeded") { console.log(`  ${g.custom_id} ${r.result.type}: ${g.label.slice(0, 60)}`); retry.push(g); continue; }
    try {
      for (const it of parseReply(r.result.message, g.label, segsOf(g))) result[it.id] = it;
      usage.push({ custom_id: g.custom_id, batch: true, ...r.result.message.usage });
    } catch (e: any) { console.log(`  ${g.custom_id} unusable: ${String(e.message).slice(0, 120)}`); retry.push(g); }
  }
  for (const g of retry.filter((g) => g.ids.some((i) => !result[i]))) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const d = await translateScene(client, system, g.label, segsOf(g), { before: g.before, perRowScene: g.perRowScene });
        for (const it of d.items) result[it.id] = it;
        usage.push({ custom_id: g.custom_id, batch: false, ...d.usage });
        console.log(`  ${g.custom_id} retried OK`);
        break;
      } catch (e: any) { console.log(`  ${g.custom_id} retry ${attempt} failed: ${String(e.message).slice(0, 120)}`); }
    }
  }
  fs.writeFileSync(f("translations.json"), JSON.stringify(result, null, 1));
  fs.writeFileSync(f("translations.flat.json"), JSON.stringify(Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.fr])), null, 1));
  fs.writeFileSync(f("usage.json"), JSON.stringify(usage, null, 1));
  const tok = (k: string, batch: boolean) => usage.filter((u) => u.batch === batch).reduce((n, u) => n + (u[k] ?? 0), 0);
  // Opus 5.5: $4 in / $20 out per M, cache write 1.25×, read 0.1×; batch = half of everything
  const cost = (batch: boolean) => (tok("input_tokens", batch) * 4 + tok("cache_creation_input_tokens", batch) * 5 + tok("cache_read_input_tokens", batch) * 0.4 + tok("output_tokens", batch) * 20) / 1e6 * (batch ? 0.5 : 1);
  const missing = [...segs.keys()].filter((k) => !result[k]);
  console.log(`translated ${Object.keys(result).length}/${segs.size}${missing.length ? `, MISSING ${missing.length}` : ""} · cost ≈ $${(cost(true) + cost(false)).toFixed(2)} (batch $${cost(true).toFixed(2)}, retries $${cost(false).toFixed(2)})`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain && process.argv.includes("--pilot")) await pilot();
if (isMain && process.argv.includes("--run")) await run();
