// Inventory of buyer-facing English string literals in the /fb + /fb-tarot funnel.
//
// Two jobs:
//   1. SIZE the translation: per-file count of copy strings and words.
//   2. GUARD the copy move (Part A of the localization plan): when strings are
//      moved out of components into typed copy modules, the multiset of copy
//      texts across (scope files + copy modules) must be unchanged. A string that
//      moved is fine; a string that was altered, dropped or duplicated fails.
//
// Usage:
//   npx tsx scripts/l10n/literal-inventory.mts --out <file.json>
//   npx tsx scripts/l10n/literal-inventory.mts --compare <before.json> <after.json>
//
// Scope = the import graph reachable from the funnel's route components inside
// client/src + shared (excluding components/ui, the shadcn kit), plus a fixed list
// of server files that produce buyer-visible text. Files under client/src/copy/
// are always included, so moved strings stay counted.

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ENTRY_FILES = [
  "client/src/pages/LandingPage.tsx",
  "client/src/pages/ChatPage.tsx",
  "client/src/pages/PaiCheckoutPage.tsx",
  "client/src/pages/UpsellPage.tsx",
  "client/src/pages/Upsell2Page.tsx",
  "client/src/pages/SuccessPage.tsx",
  "client/src/pages/TarotBridge.tsx",
  "client/src/pages/FAQPage.tsx",
  "client/src/pages/PrivacyPage.tsx",
  "client/src/pages/TermsPage.tsx",
  "client/src/pages/RefundPage.tsx",
];

const SERVER_FILES = [
  "server/lib/prompts.ts",
  "server/lib/claude.ts",
  "server/lib/universalSafety.ts",
  "server/lib/refundDeflection.ts",
  "server/lib/identitySanitizer.ts",
  "server/lib/predictionSanitizer.ts",
  "server/lib/smsConsent.ts",
  "server/lib/crisisHotlines.ts",
];

const COPY_DIRS = ["client/src/copy", "shared/copy", "server/lib/lang"];

const EXCLUDE_DIRS = ["client/src/components/ui/", "node_modules/"];

// JSX attributes and object keys whose string values are never copy.
const NON_COPY_KEYS = new Set([
  "className", "class", "key", "href", "src", "id", "type", "variant", "name",
  "role", "htmlFor", "to", "path", "data-testid", "style", "size", "autoComplete",
  "inputMode", "target", "rel", "method", "state", "inputType", "value", "stage",
  "bucket", "funnel", "param", "prefix", "posthog", "event", "eventName", "kind",
  "mode", "currency", "product", "bumpProduct", "metadata", "color", "icon",
  "fill", "stroke", "viewBox", "d", "transform", "as", "asChild", "accept",
  "media_type", "model", "status", "code", "countryCode", "slug", "deck", "card",
]);

const LOG_CALLEES = /^(console|logger|log|Sentry|posthog|captureException|track)\b/;

interface Entry { file: string; line: number; kind: "jsx" | "string" | "template"; text: string }
interface Inventory { generatedAt: string; files: string[]; entries: Entry[]; regexCount: Record<string, number> }

function resolveImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "client/src", spec.slice(2));
  else if (spec.startsWith("@shared/")) base = path.join(ROOT, "shared", spec.slice(8));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function isExcluded(abs: string): boolean {
  const rel = path.relative(ROOT, abs);
  if (/\.(test|spec)\.tsx?$/.test(rel)) return true;
  return EXCLUDE_DIRS.some((d) => rel.startsWith(d) || rel.includes(`/${d}`));
}

function collectScope(): string[] {
  const seen = new Set<string>();
  const stack = ENTRY_FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f));
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file) || isExcluded(file)) continue;
    seen.add(file);
    const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    src.forEachChild(function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const r = resolveImport(file, node.moduleSpecifier.text);
        if (r && !seen.has(r)) stack.push(r);
      }
      if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
        // dynamic import("./x") and lazyWithRetry(() => import("./x"))
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const r = resolveImport(file, (node.arguments[0] as ts.StringLiteral).text);
          if (r && !seen.has(r)) stack.push(r);
        }
      }
      node.forEachChild(visit);
    });
  }
  for (const f of SERVER_FILES) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) seen.add(abs);
  }
  for (const d of COPY_DIRS) {
    const absDir = path.join(ROOT, d);
    if (!fs.existsSync(absDir)) continue;
    for (const f of fs.readdirSync(absDir, { recursive: true }) as string[]) {
      const abs = path.join(absDir, f);
      if (/\.tsx?$/.test(abs) && !isExcluded(abs)) seen.add(abs);
    }
  }
  return [...seen].sort();
}

function isClassNameLike(t: string): boolean {
  const tokens = t.split(/\s+/).filter(Boolean);
  if (!tokens.every((tok) => /^[!a-z0-9:\[\]\/\.\-#%_()]+$/i.test(tok))) return false;
  const classy = tokens.filter((tok) => /[-:\[]/.test(tok) || /^(flex|grid|block|hidden|relative|absolute|fixed|inline|italic|uppercase|truncate|underline|rounded|shadow|border|transition|container)$/.test(tok));
  return classy.length / tokens.length >= 0.5;
}

function isCopy(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 2 || !/[A-Za-z]/.test(t)) return false;
  if (/^(https?:|mailto:|tel:|\/|\.\/|#)/.test(t)) return false;
  if (isClassNameLike(t)) return false;
  if (!/\s/.test(t)) {
    // single token: keep Capitalised words, words with apostrophes, punctuated words
    if (/^[A-Z][a-zà-ÿ']+[.!?…,:]*$/.test(t)) return true;
    if (/[a-z]'[a-z]/i.test(t) || /[.!?…]$/.test(t)) return /[a-z]{2,}/i.test(t);
    return false;
  }
  if (/^[A-Z0-9_]+( [A-Z0-9_]+)*$/.test(t) && /_/.test(t)) return false; // ENUM_LIKE
  return true;
}

function keyOf(node: ts.Node): string | null {
  const p = node.parent;
  if (!p) return null;
  if (ts.isPropertyAssignment(p) && p.initializer === node) {
    const n = p.name;
    if (ts.isIdentifier(n) || ts.isStringLiteral(n)) return n.text;
  }
  if (ts.isJsxAttribute(p)) return p.name.getText();
  if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent)) return p.parent.name.getText();
  if (ts.isBinaryExpression(p) && p.right === node && ts.isPropertyAccessExpression(p.left)) return p.left.name.text;
  return null;
}

function insideLogCall(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText();
      if (LOG_CALLEES.test(callee)) return true;
    }
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return true;
    if (ts.isElementAccessExpression(n) && n.argumentExpression === node) return true;
    if (ts.isLiteralTypeNode(n)) return true; // string-literal types
    if (ts.isCaseClause(n) && n.expression === node) return true;
  }
  if (node.parent && ts.isBinaryExpression(node.parent) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(node.parent.operatorToken.kind)) return true;
  return false;
}

function templateText(node: ts.TemplateExpression): string {
  let s = node.head.text;
  for (const span of node.templateSpans) s += "${}" + span.literal.text;
  return s;
}

function scan(file: string): { entries: Entry[]; regex: number } {
  const text = fs.readFileSync(file, "utf8");
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file);
  const entries: Entry[] = [];
  let regex = 0;
  const push = (node: ts.Node, kind: Entry["kind"], value: string) => {
    const k = keyOf(node);
    if (k && NON_COPY_KEYS.has(k)) return;
    if (insideLogCall(node)) return;
    if (!isCopy(value)) return;
    const line = src.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    entries.push({ file: rel, line, kind, text: value.replace(/\s+/g, " ").trim() });
  };
  src.forEachChild(function visit(node) {
    if (ts.isRegularExpressionLiteral(node)) regex++;
    else if (ts.isJsxText(node)) {
      if (node.text.trim()) push(node, "jsx", node.text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      push(node, "string", node.text);
    } else if (ts.isTemplateExpression(node)) {
      push(node, "template", templateText(node));
      // still descend into spans so nested literals (ternaries etc.) are seen
      for (const span of node.templateSpans) span.expression.forEachChild(visit), visit(span.expression);
      return;
    }
    node.forEachChild(visit);
  });
  return { entries, regex };
}

function words(t: string): number {
  return t.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]/.test(w)).length;
}

function build(): Inventory {
  const files = collectScope();
  const entries: Entry[] = [];
  const regexCount: Record<string, number> = {};
  for (const f of files) {
    const r = scan(f);
    entries.push(...r.entries);
    if (r.regex) regexCount[path.relative(ROOT, f)] = r.regex;
  }
  return { generatedAt: new Date().toISOString(), files: files.map((f) => path.relative(ROOT, f)), entries, regexCount };
}

function summary(inv: Inventory) {
  const byFile = new Map<string, { n: number; w: number }>();
  for (const e of inv.entries) {
    const s = byFile.get(e.file) ?? { n: 0, w: 0 };
    s.n++; s.w += words(e.text);
    byFile.set(e.file, s);
  }
  const rows = [...byFile.entries()].sort((a, b) => b[1].w - a[1].w);
  let tn = 0, tw = 0;
  for (const [f, s] of rows) { console.log(`${String(s.w).padStart(7)} words ${String(s.n).padStart(5)} strings  ${f}`); tn += s.n; tw += s.w; }
  console.log(`${String(tw).padStart(7)} words ${String(tn).padStart(5)} strings  TOTAL across ${inv.files.length} files`);
  const rx = Object.entries(inv.regexCount).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log("\nRegex literals (language-logic candidates):");
  for (const [f, n] of rx) console.log(`${String(n).padStart(5)}  ${f}`);
}

function compare(beforePath: string, afterPath: string): number {
  const before: Inventory = JSON.parse(fs.readFileSync(beforePath, "utf8"));
  const after: Inventory = JSON.parse(fs.readFileSync(afterPath, "utf8"));
  const count = (inv: Inventory) => {
    const m = new Map<string, number>();
    for (const e of inv.entries) m.set(e.text, (m.get(e.text) ?? 0) + 1);
    return m;
  };
  const b = count(before), a = count(after);
  const lost: string[] = [], gained: string[] = [];
  for (const [t, n] of b) if ((a.get(t) ?? 0) < n) lost.push(`${n - (a.get(t) ?? 0)}× ${t}`);
  for (const [t, n] of a) if ((b.get(t) ?? 0) < n) gained.push(`${n - (b.get(t) ?? 0)}× ${t}`);
  console.log(`before ${before.entries.length} strings, after ${after.entries.length} strings`);
  if (!lost.length && !gained.length) { console.log("✅ copy multiset unchanged"); return 0; }
  if (lost.length) { console.log(`\n❌ ${lost.length} texts lost or altered:`); lost.slice(0, 50).forEach((l) => console.log("  - " + l)); }
  if (gained.length) { console.log(`\n❌ ${gained.length} texts new or altered:`); gained.slice(0, 50).forEach((l) => console.log("  + " + l)); }
  return 1;
}

const args = process.argv.slice(2);
if (args[0] === "--compare") {
  process.exit(compare(args[1], args[2]));
} else {
  const outIdx = args.indexOf("--out");
  const inv = build();
  if (outIdx >= 0) fs.writeFileSync(args[outIdx + 1], JSON.stringify(inv, null, 1));
  summary(inv);
}
