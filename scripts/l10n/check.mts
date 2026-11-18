// Stage 4 of funnel-localize: deterministic checks on translated segments.
//
//   npx tsx scripts/l10n/check.mts <segments.jsonl> <translations.json> [--locale fr-FR]
//
// translations.json = { "<segment id>": "<translated text>", … }
// Prints one line per issue and a summary; exits 1 when any segment fails.
// Issue kinds: placeholder, tag, newline, length, english, banned:<group>,
// typography (fixable by applyLocaleTypography, reported as info).
import fs from "node:fs";
import path from "node:path";
import { foldText } from "../../shared/lang/fold";
import { applyLocaleTypography } from "../../shared/typography";
import type { LocaleCode } from "../../shared/locales";

export interface Issue { id: string; kind: string; detail: string; severity: "fail" | "review" | "info" }
export interface Rule { group: string; level: "fail" | "review"; scope: "all" | "voice"; pattern: string; fix: string }
const VOICE_KINDS = new Set(["bubble", "headline", "cta"]);
/** banned.json v1 = { group: [rules] } (all fail, all scopes); v2 = { rules: [...] } */
export function bannedRules(banned: any): Rule[] {
  if (Array.isArray(banned.rules)) return banned.rules;
  return Object.entries(banned).filter(([k]) => !k.startsWith("_")).flatMap(([g, rules]: any) => rules.map((r: any) => ({ group: g, level: "fail", scope: "all", ...r })));
}

const EN_STOP = new Set(["the", "and", "you", "your", "with", "that", "this", "what", "have", "will", "for", "are", "from", "just", "been", "into", "about", "dear", "it's", "i'm", "don't", "can't"]);
const FR_OK = new Set(["dear"].filter(() => false)); // nothing exempt yet

function multiset(xs: string[]) {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort().map(([k, v]) => `${k}×${v}`).join(",");
}

export function checkSegment(
  seg: { id: string; en: string; kind: string; placeholders: string[] },
  fr: string,
  pack: { lengthBands: Record<string, number>; doNotTranslate: string[] },
  banned: any,
  locale: LocaleCode,
): Issue[] {
  const out: Issue[] = [];
  const add = (kind: string, detail: string, severity: Issue["severity"] = "fail") => out.push({ id: seg.id, kind, detail, severity });
  const ph = (s: string) => [...s.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1]);
  if (multiset(ph(seg.en)) !== multiset(ph(fr))) add("placeholder", `en ${multiset(ph(seg.en))} ≠ fr ${multiset(ph(fr))}`);
  const tags = (s: string) => [...s.matchAll(/<\/?([a-z][a-z0-9]*)\/?>/g)].map((m) => m[0]);
  if (multiset(tags(seg.en)) !== multiset(tags(fr))) add("tag", `en ${multiset(tags(seg.en))} ≠ fr ${multiset(tags(fr))}`);
  const nl = (s: string) => (s.match(/\n/g) ?? []).length;
  if (nl(seg.en) !== nl(fr)) add("newline", `en ${nl(seg.en)} line breaks, fr ${nl(fr)}`);
  const band = pack.lengthBands[seg.kind] ?? 1.35;
  if (seg.en.length >= 12 && fr.length > seg.en.length * band) add("length", `${fr.length} chars vs ${seg.en.length} (band ×${band})`, seg.kind === "cta" ? "fail" : "info");
  if (!fr.trim()) add("empty", "no text");
  if (/\$/.test(fr.replace(/\$\{[^}]*\}/g, ""))) add("price", "a '$' is left in the French (see pack.json priceRule)");
  // English left in: 3+ English function words that are not French words
  const words = foldText(fr).replace(/\{[^}]+\}/g, " ").split(/[^a-z']+/).filter(Boolean);
  const dnt = new Set(pack.doNotTranslate.flatMap((n) => foldText(n).split(/\s+/)));
  const eng = words.filter((w) => EN_STOP.has(w) && !dnt.has(w) && !FR_OK.has(w));
  if (eng.length >= 2) add("english", `English words left: ${[...new Set(eng)].join(", ")}`);
  const folded = foldText(fr);
  for (const r of bannedRules(banned)) {
    if (r.scope === "voice" && !VOICE_KINDS.has(seg.kind)) continue;
    const re = new RegExp(r.pattern, "m");
    // a buyer's own words inside « » are exempt from the register check
    const text = r.group === "register" ? folded.replace(/«[^»]*»/g, " ") : folded;
    if (re.test(text)) add(`banned:${r.group}`, `${r.fix}`, r.level === "review" ? "review" : "fail");
  }
  const typo = applyLocaleTypography(fr, locale);
  if (typo !== fr) add("typography", "spacing / quotes fixed mechanically", "info");
  return out;
}

export function loadPack(locale: string) {
  const dir = path.join("localize/locales", locale);
  return {
    pack: JSON.parse(fs.readFileSync(path.join(dir, "pack.json"), "utf8")),
    banned: JSON.parse(fs.readFileSync(path.join(dir, "banned.json"), "utf8")),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const [segFile, trFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const li = process.argv.indexOf("--locale");
  const locale = (li >= 0 ? process.argv[li + 1] : "fr-FR") as LocaleCode;
  const segs = new Map(fs.readFileSync(segFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((s) => [s.id, s]));
  const tr: Record<string, string> = JSON.parse(fs.readFileSync(trFile, "utf8"));
  const { pack, banned } = loadPack(locale);
  const issues: Issue[] = [];
  for (const [id, fr] of Object.entries(tr)) {
    const seg = segs.get(id);
    if (!seg) { issues.push({ id, kind: "unknown", detail: "no such segment", severity: "fail" }); continue; }
    issues.push(...checkSegment(seg, fr, pack, banned, locale));
  }
  for (const i of issues) console.log(`${i.severity === "fail" ? "✗" : i.severity === "review" ? "?" : "·"} ${i.id} [${i.kind}] ${i.detail}`);
  const fails = issues.filter((i) => i.severity === "fail");
  const reviews = issues.filter((i) => i.severity === "review");
  console.log(`\n${Object.keys(tr).length} segments, ${fails.length} failing, ${reviews.length} to review, ${issues.length - fails.length - reviews.length} info`);
  process.exit(fails.length ? 1 : 0);
}
