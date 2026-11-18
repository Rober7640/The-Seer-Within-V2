// Codemod: wrap INLINE buyer-facing copy in t(), so it can be translated.
//
//   "It's lovely to meet you."             → t("It's lovely to meet you.")
//   `Lovely to meet you, ${capitalized}.`  → t("Lovely to meet you, {capitalized}.", { capitalized })
//   <p>Your reading is ready</p>           → <p>{t("Your reading is ready")}</p>
//   placeholder="Your email..."            → placeholder={t("Your email...")}
//
// English output cannot change: t() returns the source text for English. The
// copy predicate is the one the inventory uses (copyFilter.mts), so after a run
// `literal-inventory.mts --compare` must report the multiset unchanged.
//
// Only FUNCTION-SCOPE literals are wrapped. Module-level copy (constants,
// registries) is evaluated before a locale bundle can load, so it is translated
// as a data twin (pick()) instead; the codemod reports it and leaves it alone.
//
// Usage:
//   npx tsx scripts/l10n/wrap-t.mts [--dry] <file> [<file> …]
// Writes a report to stdout: wrapped counts, skipped items that need a human.

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import {
  isCopyText, inNonCopyPosition, inFunctionScope, alreadyTranslated,
  decodeJsxEntities, cleanJsxText,
} from "./copyFilter.mts";

interface Edit { start: number; end: number; text: string }
interface Report { file: string; wrapped: number; moduleLevel: number; skipped: string[]; fragmented: string[] }

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function lineOf(src: ts.SourceFile, node: ts.Node): number {
  return src.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

function hasLocalT(src: ts.SourceFile): boolean {
  let found = false;
  src.forEachChild(function visit(n) {
    if (found) return;
    if ((ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isFunctionDeclaration(n) || ts.isBindingElement(n)) && n.name && ts.isIdentifier(n.name) && n.name.text === "t") found = true;
    if (ts.isImportSpecifier(n) && n.name.text === "t") found = n.propertyName?.text !== "t" || false;
    n.forEachChild(visit);
  });
  return found;
}

function importsI18n(src: ts.SourceFile): string | null {
  for (const st of src.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && /lib\/i18n$/.test(st.moduleSpecifier.text)) {
      const b = st.importClause?.namedBindings;
      if (b && ts.isNamedImports(b)) for (const el of b.elements) if ((el.propertyName ?? el.name).text === "t") return el.name.text;
    }
  }
  return null;
}

function placeholderName(expr: ts.Expression): string | null {
  let e: ts.Expression = expr;
  while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

function hasNestedCopy(node: ts.Node): boolean {
  let hit = false;
  node.forEachChild(function visit(n) {
    if (hit) return;
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && isCopyText(n.text) && !inNonCopyPosition(n)) hit = true;
    if (ts.isTemplateExpression(n)) hit = true;
    n.forEachChild(visit);
  });
  return hit;
}

function processFile(file: string, dry: boolean): Report {
  const abs = path.resolve(file);
  const original = fs.readFileSync(abs, "utf8");
  const src = ts.createSourceFile(abs, original, ts.ScriptTarget.Latest, true, abs.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(process.cwd(), abs);
  const report: Report = { file: rel, wrapped: 0, moduleLevel: 0, skipped: [], fragmented: [] };
  const existing = importsI18n(src);
  const fn = existing ?? (hasLocalT(src) ? "tr" : "t");
  const edits: Edit[] = [];

  const callFor = (key: string, vars?: [string, string][]) => {
    const lit = JSON.stringify(key);
    if (!vars?.length) return `${fn}(${lit})`;
    const obj = vars.map(([name, expr]) => (name === expr ? name : `${name}: ${expr}`)).join(", ");
    return `${fn}(${lit}, { ${obj} })`;
  };

  const visit = (node: ts.Node): void => {
    // ---- JSX text -------------------------------------------------------
    if (ts.isJsxText(node)) {
      const rendered = cleanJsxText(node.text);
      if (!rendered.trim() || !isCopyText(rendered)) return;
      if (!inFunctionScope(node)) { report.moduleLevel++; return; }
      const decoded = decodeJsxEntities(rendered);
      if (decoded === null) { report.skipped.push(`${rel}:${lineOf(src, node)} unknown HTML entity in JSX text: ${rendered.trim().slice(0, 60)}`); return; }
      const lead = /^ /.test(decoded) ? '{" "}' : "";
      const trail = / $/.test(decoded) ? '{" "}' : "";
      edits.push({ start: node.getStart(), end: node.getEnd(), text: `${lead}{${callFor(decoded.trim())}}${trail}` });
      report.wrapped++;
      const parent = node.parent;
      if (parent && (ts.isJsxElement(parent) || ts.isJsxFragment(parent))) {
        const kids = parent.children.filter((c) => !(ts.isJsxText(c) && !c.text.trim()));
        if (kids.length > 1) report.fragmented.push(`${rel}:${lineOf(src, node)} "${decoded.trim().slice(0, 50)}" shares its element with ${kids.length - 1} other child(ren)`);
      }
      return;
    }
    // ---- plain string literals -------------------------------------------
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isCopyText(node.text) || alreadyTranslated(node) || inNonCopyPosition(node)) return;
      if (!inFunctionScope(node)) { report.moduleLevel++; return; }
      const inAttr = node.parent && ts.isJsxAttribute(node.parent);
      const call = callFor(node.text);
      edits.push({ start: node.getStart(), end: node.getEnd(), text: inAttr ? `{${call}}` : call });
      report.wrapped++;
      return;
    }
    // ---- template literals with ${} ---------------------------------------
    if (ts.isTemplateExpression(node)) {
      // Probe with a bare "x" per slot: `${url}?cancelled=true` must stay a
      // single non-copy token, while `Welcome back, ${name}.` still reads as copy.
      let probe = node.head.text;
      for (const sp of node.templateSpans) probe += "x" + sp.literal.text;
      const literalOnly = node.head.text + node.templateSpans.map((sp) => sp.literal.text).join(" ");
      if (!isCopyText(probe) || !/[A-Za-z]{2,}/.test(literalOnly) || inNonCopyPosition(node)) { node.forEachChild(visit); return; }
      if (!inFunctionScope(node)) { report.moduleLevel++; return; }
      const names = new Map<string, string>(); // exprText -> name
      const used = new Set<string>();
      let key = node.head.text;
      let i = 0;
      for (const span of node.templateSpans) {
        const exprText = span.expression.getText(src);
        if (hasNestedCopy(span.expression)) report.skipped.push(`${rel}:${lineOf(src, node)} copy nested inside \${${exprText.slice(0, 40)}} — left untranslated, fix by hand`);
        let name = names.get(exprText);
        if (!name) {
          let base = placeholderName(span.expression) ?? `v${i}`;
          if (!IDENT.test(base)) base = `v${i}`;
          name = base;
          let n = 2;
          while (used.has(name)) name = `${base}${n++}`;
          used.add(name);
          names.set(exprText, name);
        }
        key += `{${name}}` + span.literal.text;
        i++;
      }
      for (const name of used) {
        const literalCount = key.split(`{${name}}`).length - 1;
        const slotCount = [...names.values()].filter((v) => v === name).length;
        if (literalCount < slotCount) { report.skipped.push(`${rel}:${lineOf(src, node)} placeholder clash for {${name}}`); return; }
      }
      // A literal `{word}` in the English text that equals a placeholder name would be eaten.
      const raw = node.head.text + node.templateSpans.map((s) => s.literal.text).join("");
      for (const name of used) if (raw.includes(`{${name}}`)) { report.skipped.push(`${rel}:${lineOf(src, node)} English text already contains {${name}}`); return; }
      const inAttr = node.parent && ts.isJsxExpression(node.parent) && node.parent.parent && ts.isJsxAttribute(node.parent.parent);
      void inAttr;
      edits.push({ start: node.getStart(), end: node.getEnd(), text: callFor(key, [...names.entries()].map(([expr, name]) => [name, expr])) });
      report.wrapped++;
      return; // do not descend: inner edits would overlap
    }
    node.forEachChild(visit);
  };
  src.forEachChild(visit);

  if (!edits.length) return report;
  edits.sort((a, b) => b.start - a.start);
  let out = original;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  if (!existing) {
    const spec = fn === "t" ? "{ t }" : "{ t as tr }";
    const importLine = `import ${spec} from "@/lib/i18n";\n`;
    const lastImport = [...src.statements].filter(ts.isImportDeclaration).pop();
    if (lastImport) {
      // position in the ORIGINAL text; edits never touch import declarations, but recompute on `out`
      const marker = original.slice(lastImport.getStart(), lastImport.getEnd());
      const idx = out.indexOf(marker);
      out = out.slice(0, idx + marker.length) + "\n" + importLine.trimEnd() + out.slice(idx + marker.length);
    } else {
      out = importLine + out;
    }
  }
  if (!dry) fs.writeFileSync(abs, out);
  return report;
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const files = args.filter((a) => !a.startsWith("--"));
let total = 0;
for (const f of files) {
  const r = processFile(f, dry);
  total += r.wrapped;
  console.log(`${String(r.wrapped).padStart(5)} wrapped  ${String(r.moduleLevel).padStart(4)} module-level (data twin)  ${r.file}`);
  for (const s of r.skipped) console.log(`        ⚠ ${s}`);
  for (const s of r.fragmented) console.log(`        ✂ ${s}`);
}
console.log(`${total} literals wrapped${dry ? " (dry run, nothing written)" : ""}`);
