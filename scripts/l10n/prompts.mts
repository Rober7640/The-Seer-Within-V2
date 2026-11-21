// Every model-facing prompt of funnel-localize, built from one locale pack.
//
// The wording that differs by language lives in the pack (localize/locales/<code>/pack.json
// "prompts", plus style.md, glossary.json, banned.json, legal.md). Everything here is shared
// by every language, so a new language is a new pack, never an edit to this file.
//
// The model reads and writes the translation under the language code before the dash
// ("fr" for fr-FR, "es" for es-US): textKey(). Run files on disk keep the historic field
// name `fr` for the translated text of ANY locale (translations.json, overrides.json,
// adjudication.json), so French runs made before this file stay readable.
import fs from "node:fs";
import path from "node:path";

export interface Pack {
  code: string;
  language: string;
  register: string;
  buyerGender: { value: string };
  market: { country: string };
  priceRule: string;
  doNotTranslate: string[];
  lengthBands: Record<string, number>;
  prompts: {
    languageWord: string; writer: string; cardNames: string; editor: string; buyer: string;
    registerFlag: string; localeFlag: string; nativePerson: string; intended: string; rejectExamples: string;
  };
  checks?: { currencyLeft?: { pattern: string; detail: string } | null; openingMarks?: boolean; quotedSpan?: string | null; samePrices?: boolean };
}

/** A locale code ("fr-FR") or a pack folder (a pilot arm: "localize/locales/fr-FR"). */
export function packDir(localeOrDir: string): string {
  return localeOrDir.includes("/") ? localeOrDir : path.join("localize/locales", localeOrDir);
}

export function readPack(localeOrDir: string) {
  const dir = packDir(localeOrDir);
  const read = (f: string) => fs.readFileSync(path.join(dir, f), "utf8");
  const pack: Pack = JSON.parse(read("pack.json"));
  if (!pack.prompts) throw new Error(`${dir}/pack.json has no "prompts" block (see localize/locales/fr-FR/pack.json)`);
  return { dir, read, pack, glossary: JSON.parse(read("glossary.json")), banned: JSON.parse(read("banned.json")) };
}

/** The JSON field the model uses for the translated text. */
export const textKey = (localeOrDir: string) => readPack(localeOrDir).pack.code.split("-")[0];

/** A glossary term's required rendering (keyed by the language code; `to` also accepted). */
const rendering = (t: any, k: string) => t[k] ?? t.to;

const techRules = (L: string) => `## Format (both mandatory)
- Return every segment you are given, by id, exactly once.
- Keep every {placeholder} exactly as written (same name, same braces); its position may move.
- Keep every <tag>…</tag> pair, around the words that carry the same emphasis.
- Keep the same number of line breaks (\\n): each line is shown on its own.
- "note": one short line, in English, on any choice a reviewer should know about (empty if none).
- "uncertain": true when you are unsure the ${L} is right (meaning, tone or a term).
- "risk": "none" unless the instructions above tell you to tag one.`;

// ── stage 2/3: the translator ───────────────────────────────────────────────────────────
export function translatorSystem(localeOrDir: string): string {
  const { read, pack, glossary, banned } = readPack(localeOrDir);
  const P = pack.prompts;
  const k = pack.code.split("-")[0];
  const gl = glossary.terms.map((t: any) => `- ${t.en} → ${rendering(t, k)}${t.note ? ` (${t.note})` : ""}${t.avoid ? `; not: ${t.avoid.join(", ")}` : ""}`).join("\n");
  const cards = Object.entries(glossary.tarot).map(([en, to]) => en === "_doc" ? String(to) : `${en} → ${to}`).join("; ");
  // banned.json v1 = { group: [rules] }; v2 = { rules: [{group, level, fix, …}] }
  const ruleList: any[] = Array.isArray(banned.rules) ? banned.rules
    : Object.entries(banned).filter(([key]) => !key.startsWith("_")).flatMap(([g, rules]: any) => rules.map((r: any) => ({ group: g, level: "fail", ...r })));
  const bans = ruleList.map((r) => `- [${r.group}${r.level === "review" ? ", check the meaning" : ""}] ${r.fix}`).join("\n");
  const riskNote = /`risk`/.test(read("legal.md")) ? `\n\nSet "risk" on each segment as legal.md describes ("none" when it carries none).` : "";
  return [
    `You translate the copy of a spiritual-reading sales funnel from English into ${pack.language}, for buyers in ${pack.market.country}. ${P.writer}`,
    `## Market facts\n- Register: "${pack.register}" always.\n- The buyer is a woman: ${pack.buyerGender.value} agreement.\n- Prices: ${pack.priceRule}\n- Never translate: ${pack.doNotTranslate.join(", ")}.`,
    `## Evelyn's voice\n${read("style.md")}`,
    `## Glossary (required renderings)\n${gl}\nTarot cards (${P.cardNames}): ${cards}`,
    `## Never write\n${bans}`,
    `## Legal limits in ${pack.market.country}\n${read("legal.md")}${riskNote}`,
    techRules(P.languageWord),
  ].join("\n\n");
}

/** The pilot's control arm: a plain "translate into X", with only the technical rules. */
export function controlSystem(localeOrDir: string): string {
  const L = readPack(localeOrDir).pack.prompts.languageWord;
  return `You translate English text from a website and chat into ${L}.\n\n${techRules(L)}`;
}

export function translationSchema(localeOrDir: string) {
  const k = textKey(localeOrDir);
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" }, [k]: { type: "string" }, note: { type: "string" }, uncertain: { type: "boolean" },
            risk: { type: "string", enum: ["none", "urgency", "danger", "claim", "ai-identity", "consent"] },
          },
          required: ["id", k, "note", "uncertain", "risk"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  };
}

// ── stage 5: back-translation (never sees the English) ──────────────────────────────────
export function btSystem(localeOrDir: string): string {
  const L = readPack(localeOrDir).pack.prompts.languageWord;
  return `You translate ${L} copy (a website and a chat with a spiritual reader) into English. Translate what the ${L} says, faithfully and plainly: keep its meaning, tone, tense and who does what; don't improve it, don't guess what an original might have said. Keep every {placeholder}, <tag> and line break (\\n) as it is. Return every segment by id.`;
}

// ── stage 6: Codex second opinion ───────────────────────────────────────────────────────
/** rows: { id, kind, scene, en, <textKey>: translation } in the order the buyer sees them. */
export function codexPrompt(localeOrDir: string, rows: unknown[]): string {
  const { read, pack, glossary } = readPack(localeOrDir);
  const P = pack.prompts;
  const L = P.languageWord;
  const k = pack.code.split("-")[0];
  return [
    `You are ${P.editor}. Below is a translation from English into ${L} of part of a sales funnel for spiritual readings: a landing page, a chat with "Evelyn" (an older, warm reader), card readings, checkout and upsell pages. ${P.buyer}`,
    `Review the ${L}. Flag only real problems, each with the segment id:`,
    `- accuracy: meaning changed, added or dropped compared with the English (not mere rewording)`,
    `- fluency: grammar, agreement, wrong preposition, typos`,
    `- register: ${P.registerFlag}`,
    `- terminology: the glossary below not followed`,
    `- locale: ${P.localeFlag}`,
    `- naturalness: correct but no ${P.nativePerson} would say it this way ("sounds translated")`,
    `- voice: breaks Evelyn's voice (stiff, literary, salesy, preachy, a proverb added)`,
    `- legal: a promise of an outcome or a health claim the English does not make`,
    `For each flag give a "fix": the complete corrected ${L} segment (keep every {placeholder}, <tag> and \\n), and "issue": why, in one short English sentence.`,
    `Intended, do NOT flag: ${P.intended}`,
    `Also give "soundsTranslated" for the whole packet (1 = reads as written in ${L}, 5 = obviously translated) and "overall": two sentences.`,
    `## House style (summary)\n${read("style.md")}`,
    `## Glossary\n${glossary.terms.map((t: any) => `- ${t.en} → ${rendering(t, k)}${t.note ? ` (${t.note})` : ""}`).join("\n")}\nTarot: ${Object.entries(glossary.tarot).filter(([key]) => key !== "_doc").map(([en, to]) => `${en} → ${to}`).join("; ")}`,
    `## Price rule\n${pack.priceRule}`,
    `## Segments (in the order the buyer sees them; "scene" groups them)`,
    "```json", JSON.stringify(rows, null, 1), "```",
  ].join("\n\n");
}

// ── stage 7: the final call (appended to translatorSystem) ──────────────────────────────
export function adjudicateTask(localeOrDir: string): string {
  const { pack } = readPack(localeOrDir);
  const L = pack.prompts.languageWord;
  const k = pack.code.split("-")[0];
  return `## Your task in this call (it replaces the "Format" section above)
You are now the final editor. For each segment you get the English source, the ${L} translation, a back-translation of the ${L} into English made WITHOUT seeing the source, the automatic check issues, and a second reviewer's flags (Codex), each with a suggested fix.
- Compare the back-translation with the English: a difference in meaning (a claim added, a condition turned into a promise, who acts, tense, a detail dropped) is a real problem even when nobody flagged it.
- A reviewer's flag is a claim, not a verdict. Accept it when it is right by the rules above; reject it when it conflicts with them (for example it asks for ${pack.prompts.rejectExamples}).
- A check issue marked "fail" must be fixed. One marked "review" must be looked at: keep the text when the word is fine in that context.
- Return one item for every segment that has a flag, a check issue, or a back-translation that differs in meaning; return nothing for the others. "decision" = "keep" (text unchanged) or "rewrite"; "${k}" = the final ${L} (the same text when kept); "reason" = one short English sentence.
- A rewrite keeps every {placeholder}, <tag> and line break (\\n), and stays as short as the original.`;
}
