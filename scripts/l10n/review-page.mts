// Stage 10 of funnel-localize: the operator's review page, rendered from run data only
// (never hand-edited), so a re-run regenerates it.
//
//   npx tsx scripts/l10n/review-page.mts --out <page.html> <run dir> [<run dir>…] [--locale fr-FR]
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
const LOCALE = locIdx >= 0 ? args[locIdx + 1] : "fr-FR";
const dirs = args.filter((a, i) => !a.startsWith("--") && i !== outIdx + 1 && i !== locIdx + 1);
const rd = (d: string, n: string, def: any = {}) => (fs.existsSync(path.join(d, n)) ? JSON.parse(fs.readFileSync(path.join(d, n), "utf8")) : def);

interface Row {
  id: string; scene: string; kind: string; en: string; fr: string; first: string; bt: string;
  note: string; risk: string; uncertain: boolean; decision?: string; reason?: string;
  flags: { category: string; severity: string; issue: string; fix: string }[]; disputed?: unknown;
}
const rows: Row[] = [];
const runs: { dir: string; segments: number; cost: number; sounds: number[]; flags: number }[] = [];
for (const d of dirs) {
  const segs: Segment[] = fs.readFileSync(path.join(d, "segments.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const tr = rd(d, "translations.json"), bt = rd(d, "bt.json"), adj = rd(d, "adjudication.json"), fin = rd(d, "final.json"), disp = rd(d, "disputed.json");
  const flags: Record<string, Row["flags"]> = {};
  const sounds: number[] = [];
  const cdir = path.join(d, "codex");
  for (const f of fs.existsSync(cdir) ? fs.readdirSync(cdir).filter((n) => n.endsWith(".json")) : []) {
    const o = JSON.parse(fs.readFileSync(path.join(cdir, f), "utf8"));
    sounds.push(o.soundsTranslated);
    for (const x of o.flags) (flags[x.id] ??= []).push(x);
  }
  // what the run cost, from every usage file it wrote (batch prices = half)
  let cost = 0;
  for (const f of fs.readdirSync(d).filter((n) => /usage\.json$/.test(n))) {
    for (const u of JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))) {
      const c = ((u.input_tokens ?? 0) * 4 + (u.cache_creation_input_tokens ?? 0) * 5 + (u.cache_read_input_tokens ?? 0) * 0.4 + (u.output_tokens ?? 0) * 20) / 1e6;
      cost += u.batch === false || u.direct ? c : c / 2;
    }
  }
  runs.push({ dir: path.basename(d), segments: segs.length, cost, sounds, flags: Object.values(flags).flat().length });
  for (const s of segs) {
    const t = tr[s.id] ?? {};
    rows.push({
      id: s.id, scene: s.scene, kind: s.kind, en: s.en, first: t.fr ?? "", fr: fin[s.id] ?? t.fr ?? "", bt: bt[s.id] ?? "",
      note: t.note ?? "", risk: t.risk ?? "none", uncertain: !!t.uncertain,
      decision: adj[s.id]?.decision, reason: adj[s.id]?.reason, flags: flags[s.id] ?? [], disputed: disp[s.id],
    });
  }
}

const RISK: Record<string, { title: string; rule: string }> = {
  danger: { title: "Danger if she doesn't buy", rule: "Banned outright when inaccurate (Code de la consommation L121-4 12°); exploiting distress can make it an aggressive practice (L121-6, L121-7). Needs rewriting, not just a label." },
  urgency: { title: "Time or places limited", rule: "False scarcity is banned outright (L121-4 7°). Keep only limits that are true." },
  claim: { title: "Claims that need proof", rule: "Customer counts, testimonials (fake reviews: L121-4 28°), Evelyn's lineage, promised results (L121-2)." },
  "ai-identity": { title: "Evelyn presented as a person", rule: "EU AI Act Art. 50(1): a person chatting with an AI must be told, unless it is obvious." },
  consent: { title: "Consent, refunds, withdrawal", rule: "E-mail and pixel consent (CNIL); the 14-day withdrawal right and the refund promise must be described separately." },
};

const totalCost = runs.reduce((n, r) => n + r.cost, 0);
const allSounds = runs.flatMap((r) => r.sounds);
const summary = {
  segments: rows.length,
  rewritten: rows.filter((r) => r.decision === "rewrite").length,
  kept: rows.filter((r) => r.decision === "keep").length,
  flags: runs.reduce((n, r) => n + r.flags, 0),
  disputed: rows.filter((r) => r.disputed).length,
  risk: rows.filter((r) => r.risk !== "none").length,
  sounds: allSounds.length ? (allSounds.reduce((a, b) => a + b, 0) / allSounds.length).toFixed(1) : "–",
  cost: totalCost.toFixed(2),
  words: rows.reduce((n, r) => n + r.en.split(/\s+/).filter(Boolean).length, 0),
  generated: new Date().toISOString().slice(0, 16).replace("T", " "),
  runs: runs.map((r) => r.dir).join(", "),
};

const payload = JSON.stringify({ rows, summary, risk: RISK, locale: LOCALE }).replace(/</g, "\\u003c");
const html = fs.readFileSync(new URL("./review-page.template.html", import.meta.url), "utf8").replace("/*__DATA__*/null", payload);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`${OUT}: ${rows.length} rows, ${summary.rewritten} rewritten, ${summary.risk} risk-tagged, ${summary.disputed} disputed · ${(html.length / 1024).toFixed(0)} KB`);
