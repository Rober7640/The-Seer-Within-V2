// Stage 2 grade: Codex grades two pilot arms blind, line by line, against the English.
//
//   npx tsx scripts/l10n/pilot-grade.mts <pilot dir> --locale es-US --out <dir outside the repo> [--arms A,C]
//   npx tsx scripts/l10n/pilot-grade.mts <pilot dir> --locale es-US --out <same dir> --score
//
// The packet (items.json with X and Y, arm names hidden; schema.json; prompt.txt) goes to --out,
// which must be OUTSIDE the repo: Codex can read files on disk, and the run folder holds the
// arms. The key (which arm is X) stays in <pilot dir>/grade-key.json. Run Codex on the packet:
//   cd <out> && perl -e 'alarm shift; exec @ARGV' 900 codex exec --skip-git-repo-check \
//     -s read-only --ephemeral -C "$PWD" --output-schema schema.json -o out.json - < prompt.txt
//
// Lessons from the French grade (2026-11-18): X/Y are shuffled per SCENE, not per line, so the
// grader's "overall" paragraph compares two consistent versions; the grader is told what the
// pack intends (prices, register, endearments), or it penalises intended choices.
import fs from "node:fs";
import path from "node:path";
import { readPack } from "./prompts.mts";

const args = process.argv.slice(2);
const opt = (n: string) => { const i = args.indexOf(n); return i < 0 ? undefined : args[i + 1]; };
const dir = args.find((a) => !a.startsWith("--") && ![opt("--locale"), opt("--arms"), opt("--out")].includes(a))!;
const locale = opt("--locale");
const out = opt("--out");
if (!dir || !locale || !out) throw new Error("usage: pilot-grade.mts <pilot dir> --locale <code> --out <dir outside the repo> [--arms A,C] [--score]");
if (path.resolve(out).startsWith(process.cwd())) throw new Error("--out must be outside the repo (Codex could read the arms and the key)");
const keyFile = path.join(dir, "grade-key.json");
const [a1, a2] = (opt("--arms") ?? "A,C").split(",");

if (args.includes("--score")) {
  const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  const res = JSON.parse(fs.readFileSync(path.join(out, "out.json"), "utf8"));
  const wins: Record<string, number> = { [key.arms[0]]: 0, [key.arms[1]]: 0, tie: 0 };
  const sum: Record<string, Record<string, number>> = { [key.arms[0]]: {}, [key.arms[1]]: {} };
  for (const it of res.items) {
    const k = key.items[it.id];
    if (!k) continue;
    wins[it.better === "tie" ? "tie" : k[it.better]]++;
    for (const side of ["X", "Y"]) for (const m of ["accuracy", "naturalness", "voice"]) sum[k[side]][m] = (sum[k[side]][m] ?? 0) + it[side][m];
  }
  const n = res.items.length;
  console.log(`${n} lines graded. Better: ${key.arms[0]} ${wins[key.arms[0]]}, ${key.arms[1]} ${wins[key.arms[1]]}, tie ${wins.tie}`);
  for (const a of key.arms) console.log(`  ${a}: ` + ["accuracy", "naturalness", "voice"].map((m) => `${m} ${(sum[a][m] / n).toFixed(2)}`).join(", "));
  console.log(`\n${res.overall}`);
  process.exit(0);
}

const { pack } = readPack(locale);
const P = pack.prompts;
const L = P.languageWord;
const segs = fs.readFileSync(path.join(dir, "segments.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const arm = (n: string) => JSON.parse(fs.readFileSync(path.join(dir, `arm${n}.json`), "utf8"));
const A1 = arm(a1), A2 = arm(a2);
let seed = 20261120;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const flip = new Map<string, boolean>();
const key: { arms: string[]; items: Record<string, { seg: string; X: string; Y: string }> } = { arms: [a1, a2], items: {} };
const items = segs.map((s, i) => {
  if (!flip.has(s.scene)) flip.set(s.scene, rnd() < 0.5);
  const firstIsX = flip.get(s.scene)!;
  const id = "L" + String(i + 1).padStart(2, "0");
  key.items[id] = { seg: s.id, X: firstIsX ? a1 : a2, Y: firstIsX ? a2 : a1 };
  return {
    id, scene: s.scene.replace(/client\/src\/hooks\/useConversation\.ts › useConversation › /, "chat › "), kind: s.kind, en: s.en,
    X: (firstIsX ? A1 : A2)[s.id]?.fr ?? "", Y: (firstIsX ? A2 : A1)[s.id]?.fr ?? "",
  };
});
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "items.json"), JSON.stringify(items, null, 1));
fs.writeFileSync(keyFile, JSON.stringify(key, null, 1));
const side = { type: "object", additionalProperties: false, required: ["accuracy", "naturalness", "voice", "errors"],
  properties: { accuracy: { type: "integer", minimum: 1, maximum: 5 }, naturalness: { type: "integer", minimum: 1, maximum: 5 }, voice: { type: "integer", minimum: 1, maximum: 5 }, errors: { type: "array", items: { type: "string" } } } };
fs.writeFileSync(path.join(out, "schema.json"), JSON.stringify({ type: "object", additionalProperties: false, required: ["items", "overall"], properties: {
  items: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "X", "Y", "better", "why"], properties: { id: { type: "string" }, X: side, Y: side, better: { type: "string", enum: ["X", "Y", "tie"] }, why: { type: "string" } } } },
  overall: { type: "string" } } }, null, 1));
fs.writeFileSync(path.join(out, "prompt.txt"), [
  `You are ${P.editor}. Grade two ${L} versions (X and Y) of each English line from a spiritual-reading sales funnel. ${P.buyer} The speaker is "Evelyn", an older female psychic reader, chatting with the buyer. The ${L} must sound written by a native copywriter, not translated.`,
  `Score each version 1-5 on:
- accuracy: same meaning, nothing added or lost, {placeholders} and <tags> kept.
- naturalness: would a ${P.nativePerson} find it natural, idiomatic, not translated? Penalise calques, anglicisms, stiff or literary register, English Title Case headlines, and: ${P.localeFlag}.
- voice: warm, simple, spoken; register "${pack.register}" throughout (penalise ${P.registerFlag}); ${pack.buyerGender.value} agreement for the buyer; no added promises or pressure.`,
  `Intended, do NOT penalise: ${P.intended.replace("the house terms below", "consistent house terms")}`,
  `List concrete errors (quote the ${L} words). Then say which is better overall (X, Y or tie) and why in one line. Judge each line inside its scene: items with the same scene are consecutive lines of one conversation or page, so check consistency (register, terms) across them too.`,
  `The file items.json in the current directory holds the items: id, scene, kind (bubble = a chat message, ui, cta = a button, headline, server = a message the server sends), en, X, Y. Read it and grade every item. Finish with one paragraph "overall" comparing X and Y in general.`,
].join("\n\n") + "\n");
console.log(`${items.length} items, ${flip.size} scenes → ${out}`);
