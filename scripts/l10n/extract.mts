// Stage 1 of funnel-localize: every translatable segment of the /fb + /fb-tarot
// funnel, as one JSONL file the later stages read.
//
//   npx tsx scripts/l10n/extract.mts [--out localize/runs/extract/segments.jsonl]
//
// Three sources, matching the three ways Part A marked copy:
//   catalog  t("…") / tx("…") / tl(locale, "…") / msg("…") literal keys — the
//            English text IS the key (one segment per distinct text; every place
//            it is used is listed in `uses`, so a translator sees all contexts)
//   data     every string leaf of a pick(key, english) data twin
//            (localize/twins.json), addressed by its path in the English value
//   legal    the legal pages, one segment per JSX text run, translated as a
//            whole page (the French page is assembled from them by hand)
//
// Each segment: { id, source, en, srcHash, kind, scene, file, line, uses?,
// placeholders, tags, prev?, next? }. `scene` groups segments a translator
// should see together (one chat stage, one tarot read, one upsell), and
// prev/next give the neighbouring lines inside it, so connectors and flow
// survive translation.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { collectScope } from "./literal-inventory.mts";
import { NON_COPY_KEYS, cleanJsxText, decodeJsxEntities, isClassNameLike } from "./copyFilter.mts";

const ROOT = process.cwd();
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : "localize/runs/extract/segments.jsonl";

export interface Segment {
  id: string;
  source: "catalog" | "data" | "legal";
  en: string;
  srcHash: string;
  kind: "bubble" | "ui" | "headline" | "cta" | "server" | "legal";
  scene: string;
  file: string;
  line: number;
  uses?: { file: string; line: number; scene: string }[];
  twin?: string;
  path?: (string | number)[];
  placeholders: string[];
  tags: string[];
  /** legal: the source of each {eN} slot, so the French page can put it back. */
  exprs?: string[];
  prev?: string;
  next?: string;
}

const hash = (s: string) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const placeholdersOf = (s: string) => [...new Set([...s.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1]))];
const tagsOf = (s: string) => [...new Set([...s.matchAll(/<([a-z][a-z0-9]*)>/g)].map((m) => m[1]))];
// Packs + plumbing that hold no translatable copy of their own.
const SKIP_FILES = /^(shared\/lang\/|shared\/typography\.ts|shared\/i18n\.ts|shared\/locales\.ts|client\/src\/lib\/(i18n|locale|langPack)\.ts|client\/src\/l10n\/)/;
const LEGAL_FILES = new Set(["client/src/pages/PrivacyPage.tsx", "client/src/pages/TermsPage.tsx", "client/src/pages/RefundPage.tsx"]);

// ── catalog keys ─────────────────────────────────────────────────────────────
// A key literal may be built with `+` ("…" + "…"): folded to one string.
function foldLiteral(e: ts.Expression): string | null {
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isParenthesizedExpression(e)) return foldLiteral(e.expression);
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = foldLiteral(e.left), r = foldLiteral(e.right);
    return l !== null && r !== null ? l + r : null;
  }
  return null;
}

function sceneOf(node: ts.Node, rel: string): string {
  const names: string[] = [];
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) names.unshift(n.name.getText());
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer) || ts.isCallExpression(n.initializer))) names.unshift(n.name.text);
    else if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))) names.unshift(n.name.text);
    else if (ts.isCaseClause(n) && (ts.isStringLiteral(n.expression) || ts.isPropertyAccessExpression(n.expression))) names.unshift(`case ${n.expression.getText().replace(/['"]/g, "")}`);
  }
  // Keep the outermost two levels: "useConversation › handleBucket" reads as a scene.
  return `${rel}${names.length ? " › " + names.slice(0, 3).join(" › ") : ""}`;
}

function kindOfCatalog(rel: string, node: ts.Node): Segment["kind"] {
  if (rel.startsWith("server/")) return "server";
  let inJsx = false, inBot = false;
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxAttribute(n)) inJsx = true;
    if (ts.isCallExpression(n) && /sendBotMessages?|addBotMessage|botSay|queueBot/.test(n.expression.getText())) inBot = true;
  }
  if (inBot) return "bubble";
  if (inJsx) {
    const el = node.parent?.parent;
    if (el && /<button|<Button|Cta|CTA/.test(el.getText().slice(0, 40))) return "cta";
    return "ui";
  }
  return /hooks\/|lib\/(upsell|intent)/.test(rel) ? "bubble" : "ui";
}

interface Hit { text: string; file: string; line: number; scene: string; kind: Segment["kind"] }

function catalogHits(abs: string): Hit[] {
  const rel = path.relative(ROOT, abs);
  const src = ts.createSourceFile(abs, fs.readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true, abs.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: Hit[] = [];
  src.forEachChild(function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText();
      const argIdx = callee === "tl" ? 1 : ["t", "tx", "tr", "msg"].includes(callee) ? 0 : -1;
      const arg = argIdx >= 0 ? node.arguments[argIdx] : undefined;
      const text = arg ? foldLiteral(arg) : null;
      if (text !== null && /[A-Za-z]/.test(text)) {
        hits.push({ text, file: rel, line: src.getLineAndCharacterOfPosition(node.getStart()).line + 1, scene: sceneOf(node, rel), kind: kindOfCatalog(rel, node) });
      }
    }
    node.forEachChild(visit);
  });
  return hits;
}

// ── data twins ───────────────────────────────────────────────────────────────
const ID_LIKE = /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/; // "cards-love-again", "arcana_mfh"
function isDataCopy(key: string | number | undefined, v: string): boolean {
  if (typeof key === "string" && NON_COPY_KEYS.has(key)) return false;
  const t = v.trim();
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^(https?:|mailto:|tel:|\/|\.\/|#|data:)/.test(t)) return false;
  if (/\.(png|jpe?g|webp|gif|svg|mp4|webm)(\?|$)/i.test(t)) return false;
  if (ID_LIKE.test(t) || isClassNameLike(t)) return false;
  return true;
}

type Leaf = { path: (string | number)[]; en: string };

function leavesOfValue(v: unknown, at: (string | number)[] = []): Leaf[] {
  if (typeof v === "string") return isDataCopy(at[at.length - 1], v) ? [{ path: at, en: v }] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => leavesOfValue(x, [...at, i]));
  if (v && typeof v === "object" && !(v as { $$typeof?: unknown }).$$typeof) return Object.entries(v).flatMap(([k, x]) => leavesOfValue(x, [...at, k]));
  return [];
}

// Module-local constants (not exported, or in a .tsx that can't load in Node):
// walk the literal initializer. Same-file const identifiers and spreads resolve;
// anything else (a call, JSX) is reported, never guessed.
function leavesOfAst(file: string, name: string, opaque: string[]): Leaf[] {
  const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const consts = new Map<string, ts.Expression>();
  src.forEachChild(function visit(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) consts.set(n.name.text, n.initializer);
    n.forEachChild(visit);
  });
  const walk = (e: ts.Expression, at: (string | number)[]): Leaf[] => {
    while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
    const s = foldLiteral(e);
    if (s !== null) return isDataCopy(at[at.length - 1], s) ? [{ path: at, en: s }] : [];
    if (ts.isArrayLiteralExpression(e)) {
      let i = 0;
      return e.elements.flatMap((el) => (ts.isSpreadElement(el) ? (opaque.push(`${at.join(".")}: spread`), []) : walk(el, [...at, i++])));
    }
    if (ts.isObjectLiteralExpression(e)) {
      return e.properties.flatMap((p) => {
        if (ts.isPropertyAssignment(p)) return walk(p.initializer, [...at, p.name.getText().replace(/^['"]|['"]$/g, "")]);
        if (ts.isSpreadAssignment(p) && ts.isIdentifier(p.expression) && consts.has(p.expression.text)) return walk(consts.get(p.expression.text)!, at);
        if (ts.isShorthandPropertyAssignment(p) && consts.has(p.name.text)) return walk(consts.get(p.name.text)!, [...at, p.name.text]);
        opaque.push(`${[...at, p.name?.getText() ?? "…"].join(".")}: ${ts.SyntaxKind[p.kind]}`);
        return [];
      });
    }
    if (ts.isIdentifier(e) && consts.has(e.text)) return walk(consts.get(e.text)!, at);
    if (ts.isJsxElement(e) || ts.isJsxFragment(e) || ts.isJsxSelfClosingElement(e)) opaque.push(`${at.join(".")}: JSX`);
    else if (ts.isTemplateExpression(e) || ts.isCallExpression(e) || ts.isArrowFunction(e) || ts.isConditionalExpression(e)) opaque.push(`${at.join(".")}: ${ts.SyntaxKind[e.kind]}`);
    return [];
  };
  const init = consts.get(name);
  if (!init) { opaque.push(`${name}: not found`); return []; }
  return walk(init, []);
}

function dataSceneOf(twin: string, p: (string | number)[], perHook?: string): string {
  // tarot.decks › arcana-mfh › reads › cards-love-again  (one read = one scene)
  if (twin === "tarot.decks" && p[1] === "reads") return `${twin} › ${p[0]} › ${p[2]}`;
  if (twin === "tarot.shadow") return `${twin} › ${p[0]}`;
  if (perHook === "" ) return twin;
  return `${twin} › ${p.slice(0, 1).join(".")}`;
}

function kindOfData(twin: string, p: (string | number)[]): Segment["kind"] {
  if (twin === "tarot.headlines" || twin === "tarot.questions") return "headline";
  if (/cta|button|Cta/i.test(String(p[p.length - 1]))) return "cta";
  if (twin.startsWith("tarot.") || twin.startsWith("upsell")) return "bubble";
  return "ui";
}

// ── legal pages ──────────────────────────────────────────────────────────────
// One segment per text block (p, li, h2, td…), with inline markup kept as simple
// tags ("<strong>Account management</strong> — registering your account…") and
// any other expression as {e1}, {e2}, so a clause is never split from its
// bold lead-in. The French page is assembled from these by hand (localizedPage).
const INLINE = new Set(["strong", "b", "em", "i", "u", "a", "Link", "span", "code", "br", "small", "sup"]);
function tagName(el: ts.JsxElement | ts.JsxSelfClosingElement): string {
  return (ts.isJsxElement(el) ? el.openingElement.tagName : el.tagName).getText();
}
function serializeRun(el: ts.JsxElement): { text: string; exprs: string[] } {
  const exprs: string[] = [];
  const ser = (children: ts.NodeArray<ts.JsxChild>): string => children.map((c) => {
    if (ts.isJsxText(c)) return cleanJsxText(decodeJsxEntities(c.text) ?? c.text);
    if (ts.isJsxExpression(c)) {
      if (!c.expression) return "";
      const lit = foldLiteral(c.expression);
      if (lit !== null) return lit;
      exprs.push(c.expression.getText());
      return `{e${exprs.length}}`;
    }
    if (ts.isJsxSelfClosingElement(c)) return tagName(c) === "br" ? "<br/>" : (exprs.push(c.getText()), `{e${exprs.length}}`);
    if (ts.isJsxElement(c)) {
      const name = tagName(c) === "Link" ? "a" : tagName(c).toLowerCase();
      return `<${name}>${ser(c.children)}</${name}>`;
    }
    return "";
  }).join("");
  return { text: ser(el.children).replace(/\s+/g, " ").trim(), exprs };
}
function legalRuns(abs: string): { en: string; line: number; exprs: string[] }[] {
  const src = ts.createSourceFile(abs, fs.readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: { en: string; line: number; exprs: string[] }[] = [];
  const hasOwnText = (el: ts.JsxElement) => el.children.some((c) => (ts.isJsxText(c) && /[A-Za-z]{2,}/.test(c.text)) || (ts.isJsxExpression(c) && !!c.expression && /[A-Za-z]{2,}/.test(foldLiteral(c.expression) ?? "")));
  src.forEachChild(function visit(node) {
    if (ts.isJsxElement(node) && hasOwnText(node) && !(INLINE.has(tagName(node)) && insideTextBlock(node))) {
      const run = serializeRun(node);
      if (/[A-Za-z]{2,}/.test(run.text)) out.push({ en: run.text, line: src.getLineAndCharacterOfPosition(node.getStart()).line + 1, exprs: run.exprs });
      return; // its inline children are part of this run
    }
    // document title and other literals outside JSX
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !ts.isJsxAttribute(node.parent) && !ts.isImportDeclaration(node.parent) && /\s/.test(node.text) && /[A-Za-z]{2,}/.test(node.text) && !isClassNameLike(node.text)) {
      out.push({ en: node.text, line: src.getLineAndCharacterOfPosition(node.getStart()).line + 1, exprs: [] });
    }
    node.forEachChild(visit);
  });
  function insideTextBlock(el: ts.Node): boolean {
    for (let n = el.parent; n; n = n.parent) if (ts.isJsxElement(n) && hasOwnText(n)) return true;
    return false;
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const segments: Segment[] = [];
  const scope = collectScope().filter((f: string) => !SKIP_FILES.test(path.relative(ROOT, f)) && !/\.(test|spec)\.tsx?$/.test(f));

  // catalog: one segment per distinct text, first use = home
  const byText = new Map<string, Hit[]>();
  for (const f of scope) {
    if (LEGAL_FILES.has(path.relative(ROOT, f))) continue;
    for (const h of catalogHits(f)) {
      const list = byText.get(h.text) ?? [];
      list.push(h);
      byText.set(h.text, list);
    }
  }
  for (const [text, hits] of byText) {
    const h = hits[0];
    segments.push({
      id: `cat:${hash(text)}`, source: "catalog", en: text, srcHash: hash(text), kind: h.kind, scene: h.scene, file: h.file, line: h.line,
      uses: hits.length > 1 ? hits.map(({ file, line, scene }) => ({ file, line, scene })) : undefined,
      placeholders: placeholdersOf(text), tags: tagsOf(text),
    });
  }

  // data twins
  const twins = JSON.parse(fs.readFileSync("localize/twins.json", "utf8")) as Record<string, { module: string; export: string; kind: string; scope: string[]; perHook?: string; jsx?: string[] }>;
  const report: string[] = [];
  for (const [key, def] of Object.entries(twins)) {
    if (key === "_doc" || def.kind === "derived" || def.kind === "component") continue;
    if (!def.scope.some((s) => s === "fb" || s === "fb-tarot")) { report.push(`${key}: out of scope (${JSON.stringify(def.scope)})`); continue; }
    const abs = path.join(ROOT, def.module);
    let leaves: Leaf[] = [];
    let how = "import";
    try {
      if (abs.endsWith(".tsx")) throw new Error("tsx");
      const mod = await import(abs);
      if (def.export === "*") {
        for (const n of Object.keys(mod).filter((n) => /^[A-Z][A-Z0-9_]+$/.test(n))) leaves.push(...leavesOfValue(mod[n], [n]));
      } else if (mod[def.export] !== undefined) {
        leaves = leavesOfValue(mod[def.export]);
      } else throw new Error("not exported");
    } catch {
      how = "ast";
      const opaque: string[] = [];
      leaves = leavesOfAst(abs, def.export, opaque);
      if (opaque.length) report.push(`${key}: ${opaque.length} part(s) not read as literals — ${opaque.slice(0, 4).join("; ")}${def.jsx ? ` (declared jsx: ${def.jsx.join(", ")})` : ""}`);
    }
    report.push(`${key}: ${leaves.length} strings via ${how}`);
    for (const l of leaves) {
      segments.push({
        id: `data:${key}:${l.path.join(".")}`, source: "data", en: l.en, srcHash: hash(l.en), kind: kindOfData(key, l.path),
        scene: dataSceneOf(key, l.path, def.perHook), file: def.module, line: 0, twin: key, path: l.path,
        placeholders: placeholdersOf(l.en), tags: tagsOf(l.en),
      });
    }
  }

  // legal pages
  for (const rel of LEGAL_FILES) {
    const runs = legalRuns(path.join(ROOT, rel));
    runs.forEach((r, i) => segments.push({
      id: `legal:${path.basename(rel, ".tsx")}:${i}`, source: "legal", en: r.en, srcHash: hash(r.en), kind: "legal",
      scene: `legal › ${path.basename(rel, ".tsx")}`, file: rel, line: r.line, placeholders: placeholdersOf(r.en), tags: tagsOf(r.en),
      ...(r.exprs.length ? { exprs: r.exprs } : {}),
    }));
    report.push(`${rel}: ${runs.length} text runs`);
  }

  // neighbours inside a scene, in source order
  const byScene = new Map<string, Segment[]>();
  for (const s of segments) (byScene.get(s.scene) ?? byScene.set(s.scene, []).get(s.scene)!).push(s);
  for (const list of byScene.values()) {
    list.sort((a, b) => a.line - b.line);
    list.forEach((s, i) => { if (i > 0) s.prev = list[i - 1].id; if (i < list.length - 1) s.next = list[i + 1].id; });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, segments.map((s) => JSON.stringify(s)).join("\n") + "\n");

  const words = (t: string) => t.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
  const bySource = new Map<string, { n: number; w: number }>();
  for (const s of segments) {
    const k = `${s.source}/${s.kind}`;
    const v = bySource.get(k) ?? { n: 0, w: 0 };
    v.n++; v.w += words(s.en);
    bySource.set(k, v);
  }
  for (const line of report) console.log("  " + line);
  console.log("");
  for (const [k, v] of [...bySource].sort()) console.log(`${String(v.n).padStart(6)} segments ${String(v.w).padStart(7)} words  ${k}`);
  const tw = segments.reduce((a, s) => a + words(s.en), 0);
  console.log(`${String(segments.length).padStart(6)} segments ${String(tw).padStart(7)} words  TOTAL in ${byScene.size} scenes → ${OUT}`);
}

await main();
