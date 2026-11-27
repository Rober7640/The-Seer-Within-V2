// Stage 10 of funnel-localize: the operator's review page, rendered from run data only
// (never hand-edited), so a re-run regenerates it.
//
//   npx tsx scripts/l10n/review-page.mts --out <page.html> <run dir> [<run dir>…] --locale <code>
//
// Order on the page: the summary, the lines that need the operator's decision (risk tags,
// grouped by the French rule they touch), disputed lines, what the final call changed,
// then all copy scene by scene (English | final French | back-translation | flags).
import fs from "node:fs";
import path from "node:path";
import type { Segment } from "./extract.mts";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = args[outIdx + 1];
const locIdx = args.indexOf("--locale");
if (locIdx < 0) throw new Error("--locale <code> is required (fr-FR, es-US, …)");
const LOCALE = args[locIdx + 1];
const dirs = args.filter((a, i) => !a.startsWith("--") && i !== outIdx + 1 && i !== locIdx + 1);
const rd = (d: string, n: string, def: any = {}) => (fs.existsSync(path.join(d, n)) ? JSON.parse(fs.readFileSync(path.join(d, n), "utf8")) : def);

interface Row {
  id: string; scene: string; kind: string; en: string; fr: string; first: string; bt: string;
  note: string; risk: string; uncertain: boolean; decision?: string; reason?: string;
  flags: { category: string; severity: string; issue: string; fix: string; round: number }[]; disputed?: unknown;
}
const rows: Row[] = [];
const runs: { dir: string; segments: number; cost: number; sounds: number[]; sounds2: number[]; flags: number; flags2: number }[] = [];
for (const d of dirs) {
  const segs: Segment[] = fs.readFileSync(path.join(d, "segments.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const tr = rd(d, "translations.json"), bt = rd(d, "bt.json"), adj = rd(d, "adjudication.json"), fin = rd(d, "final.json"), disp = rd(d, "disputed.json");
  const dec2 = rd(d, "codex2-decisions.json"); // round-2 calls; the rewrites are already in adjudication.json via overrides
  for (const [id, v] of Object.entries<any>(dec2)) if (v?.keep) adj[id] = { ...(adj[id] ?? { decision: "keep" }), reason: [adj[id]?.reason, `Second Codex read: kept. ${v.why}`].filter(Boolean).join(" · ") };
  const flags: Record<string, Row["flags"]> = {};
  const sounds: number[] = [], sounds2: number[] = [];
  let n1 = 0, n2 = 0;
  // codex/ = Codex's read of the first translation; codex2/ = its second read of the final French
  for (const [sub, round] of [["codex", 1], ["codex2", 2]] as const) {
    const cdir = path.join(d, sub);
    for (const f of fs.existsSync(cdir) ? fs.readdirSync(cdir).filter((n) => n.endsWith(".json")) : []) {
      const o = JSON.parse(fs.readFileSync(path.join(cdir, f), "utf8"));
      (round === 1 ? sounds : sounds2).push(o.soundsTranslated);
      for (const x of o.flags) { (flags[x.id] ??= []).push({ ...x, round }); round === 1 ? n1++ : n2++; }
    }
  }
  // what the run cost, from every usage file it wrote (batch prices = half)
  let cost = 0;
  for (const f of fs.readdirSync(d).filter((n) => /usage\.json$/.test(n))) {
    for (const u of JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))) {
      const c = ((u.input_tokens ?? 0) * 4 + (u.cache_creation_input_tokens ?? 0) * 5 + (u.cache_read_input_tokens ?? 0) * 0.4 + (u.output_tokens ?? 0) * 20) / 1e6;
      cost += u.batch === false || u.direct ? c : c / 2;
    }
  }
  runs.push({ dir: path.basename(d), segments: segs.length, cost, sounds, sounds2, flags: n1, flags2: n2 });
  for (const s of segs) {
    const t = tr[s.id] ?? {};
    rows.push({
      id: s.id, scene: s.scene, kind: s.kind, en: s.en, first: t.fr ?? "", fr: fin[s.id] ?? t.fr ?? "", bt: bt[s.id] ?? "",
      note: t.note ?? "", risk: t.risk ?? "none", uncertain: !!t.uncertain,
      decision: adj[s.id]?.decision, reason: adj[s.id]?.reason, flags: flags[s.id] ?? [], disputed: disp[s.id],
    });
  }
}

const PACK = JSON.parse(fs.readFileSync(path.join("localize/locales", LOCALE, "pack.json"), "utf8"));
const RISK: Record<string, { title: string; rule: string }> = PACK.review?.risk ?? {};

const totalCost = runs.reduce((n, r) => n + r.cost, 0);
const allSounds = runs.flatMap((r) => r.sounds), allSounds2 = runs.flatMap((r) => r.sounds2);
const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "");
const summary = {
  segments: rows.length,
  rewritten: rows.filter((r) => r.decision === "rewrite").length,
  kept: rows.filter((r) => r.decision === "keep").length,
  flags: runs.reduce((n, r) => n + r.flags, 0),
  flags2: runs.reduce((n, r) => n + r.flags2, 0),
  sounds2: avg(allSounds2),
  disputed: rows.filter((r) => r.disputed).length,
  risk: rows.filter((r) => r.risk !== "none").length,
  sounds: allSounds.length ? (allSounds.reduce((a, b) => a + b, 0) / allSounds.length).toFixed(1) : "–",
  cost: totalCost.toFixed(2),
  words: rows.reduce((n, r) => n + r.en.split(/\s+/).filter(Boolean).length, 0),
  generated: new Date().toISOString().slice(0, 16).replace("T", " "),
  runs: runs.map((r) => r.dir).join(", "),
};

const payload = JSON.stringify({ rows, summary, risk: RISK, locale: LOCALE }).replace(/</g, "\\u003c");
const html = fs.readFileSync(new URL("./review-page.template.html", import.meta.url), "utf8")
  .replaceAll("__LANG__", PACK.prompts.languageWord).replaceAll("__LOCALE__", LOCALE).replaceAll("__LAW__", PACK.review?.lawName ?? "local law")
  .replace("/*__DATA__*/null", payload);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`${OUT}: ${rows.length} rows, ${summary.rewritten} rewritten, ${summary.risk} risk-tagged, ${summary.disputed} disputed · ${(html.length / 1024).toFixed(0)} KB`);
