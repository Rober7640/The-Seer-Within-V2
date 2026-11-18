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
import { isCopyText, inNonCopyPosition, alreadyTranslated, declaredVars, decodeJsxEntities, cleanJsxText } from "./copyFilter.mts";

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

const EXCLUDE_DIRS = ["client/src/components/ui/", "node_modules/", "client/src/lib/locale.ts", "client/src/lib/i18n.ts", "shared/locales.ts", "shared/i18n.ts"];

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

// Inside t("…{name}…", { name }) the placeholders correspond to the ${…} slots
// of the template literal the codemod replaced; normalise them back so the
// before/after multiset compares like with like.
function normalizePlaceholders(node: ts.Node, value: string): string {
  const call = node.parent as ts.CallExpression;
  const names = declaredVars(call, call.expression.getText() === "tl" ? 2 : 1);
  if (!names.size) return value;
  return value.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (w, n: string) => (names.has(n) ? "${}" : w));
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
    if (!alreadyTranslated(node) && inNonCopyPosition(node)) return;
    if (alreadyTranslated(node)) value = normalizePlaceholders(node, value);
    if (!isCopyText(value)) return;
    const line = src.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    entries.push({ file: rel, line, kind, text: value.replace(/\s+/g, " ").trim() });
  };
  src.forEachChild(function visit(node) {
    if (ts.isRegularExpressionLiteral(node)) regex++;
    else if (ts.isJsxText(node)) {
      const rendered = cleanJsxText(node.text);
      if (rendered.trim()) push(node, "jsx", decodeJsxEntities(rendered) ?? rendered);
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
