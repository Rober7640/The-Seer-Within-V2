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
- "note": one short line on any choice a reviewer should know about (empty if none).
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

export function sceneMessage(scene: string, segs: Segment[], context: { before?: string; after?: string }): string {
  const rows = segs.map((s) => ({ id: s.id, kind: s.kind, en: s.en }));
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

export async function translateScene(client: Anthropic, system: string, scene: string, segs: Segment[]) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: sceneMessage(scene, segs, {}) }],
    output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
  } as any);
  const msg = await stream.finalMessage();
  const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  if (msg.stop_reason !== "end_turn") throw new Error(`${scene}: stop_reason ${msg.stop_reason}`);
  const items: Out[] = JSON.parse(text).items;
  const got = new Set(items.map((i) => i.id));
  const missing = segs.filter((s) => !got.has(s.id)).map((s) => s.id);
  if (missing.length) throw new Error(`${scene}: missing ${missing.join(", ")}`);
  return { items, usage: msg.usage };
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain && process.argv.includes("--pilot")) await pilot();
