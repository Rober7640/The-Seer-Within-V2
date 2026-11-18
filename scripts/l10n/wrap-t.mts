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
  decodeJsxEntities, cleanJsxText, NON_COPY_FILES, literalText,
} from "./copyFilter.mts";

interface Edit { start: number; end: number; text: string }
interface Report { file: string; wrapped: number; merged: number; moduleLevel: number; skipped: string[]; fragmented: string[] }

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
  if (ts.isCallExpression(e)) {
    const c = e.expression;
    // x.toLowerCase() / x.trim() → name of x;  money(cents) → "money"
    if (ts.isPropertyAccessExpression(c) && /^(toLowerCase|toUpperCase|trim|toString|toFixed|toLocaleString)$/.test(c.name.text)) return placeholderName(c.expression);
    if (ts.isIdentifier(c)) return c.text;
    if (ts.isPropertyAccessExpression(c)) return c.name.text;
  }
  if (ts.isElementAccessExpression(e)) return placeholderName(e.argumentExpression);
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

// ---- type checker (used only to decide whether a JSX run can be merged) -----
let checker: ts.TypeChecker;
let program: ts.Program;
function loadProgram(files: string[]) {
  const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json")!;
  const cfg = ts.getParsedCommandLineOfConfigFile(cfgPath, { noEmit: true, incremental: false }, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!;
  program = ts.createProgram({ rootNames: files.map((f) => path.resolve(f)), options: { ...cfg.options, incremental: false, tsBuildInfoFile: undefined } });
  checker = program.getTypeChecker();
}

/** string | number (with null/undefined allowed): renders the same via JSX or String(). */
function rendersAsText(e: ts.Expression): boolean {
  const ok = (t: ts.Type): boolean => {
    if (t.isUnion()) return t.types.every(ok);
    const F = ts.TypeFlags;
    return !!(t.flags & (F.StringLike | F.NumberLike | F.Null | F.Undefined)) && !(t.flags & (F.Any | F.Unknown));
  };
  const ty = checker.getTypeAtLocation(e);
  // must include at least one string/number constituent (not just null)
  const parts = ty.isUnion() ? ty.types : [ty];
  return ok(ty) && parts.some((t) => !!(t.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike)));
}

function processFile(file: string, dry: boolean): Report {
  const abs = path.resolve(file);
  const original = fs.readFileSync(abs, "utf8");
  const src = program.getSourceFile(abs)!;
  if (src.getFullText() !== original) throw new Error(`${file} changed on disk while loading`);
  const rel = path.relative(process.cwd(), abs);
  const report: Report = { file: rel, wrapped: 0, merged: 0, moduleLevel: 0, skipped: [], fragmented: [] };
  if (NON_COPY_FILES.test(rel)) { report.skipped.push(`${rel} is analytics/tracking plumbing — never wrapped`); return report; }
  const existing = importsI18n(src);
  const fn = existing ?? (hasLocalT(src) ? "tr" : "t");
  const edits: Edit[] = [];

  const callFor = (key: string, vars?: [string, string][]) => {
    const lit = JSON.stringify(key);
    if (!vars?.length) return `${fn}(${lit})`;
    const obj = vars.map(([name, expr]) => (name === expr ? name : `${name}: ${expr}`)).join(", ");
    return `${fn}(${lit}, { ${obj} })`;
  };

  const nameSlots = () => {
    const names = new Map<string, string>(); // exprText -> name
    const used = new Set<string>();
    let i = 0;
    return {
      names, used,
      slot(expr: ts.Expression): string {
        const exprText = expr.getText(src);
        let name = names.get(exprText);
        if (!name) {
          let base = placeholderName(expr) ?? `v${i}`;
          if (!IDENT.test(base)) base = `v${i}`;
          name = base;
          let n = 2;
          while (used.has(name)) name = `${base}${n++}`;
          used.add(name);
          names.set(exprText, name);
        }
        i++;
        return name;
      },
    };
  };

  /** Merge a JSX element's text + plain-value children into ONE t() call. */
  const tryMergeRun = (el: ts.JsxElement | ts.JsxFragment): boolean => {
    const kids = el.children;
    let hasText = false, hasExpr = false;
    for (const c of kids) {
      if (ts.isJsxText(c)) { if (/[A-Za-z]/.test(cleanJsxText(c.text))) hasText = true; continue; }
      if (!ts.isJsxExpression(c)) return false;           // nested element → not mergeable
      if (!c.expression) return false;                     // comment inside: keep as is
      if (literalText(c.expression) !== null && !ts.isTemplateExpression(c.expression)) continue; // {" "}
      if (ts.isCallExpression(c.expression) && /^(t|tr)$/.test(c.expression.expression.getText())) return false;
      if (hasNestedCopy(c.expression) || !rendersAsText(c.expression)) return false;
      hasExpr = true;
    }
    if (!hasText || !hasExpr) return false;
    const slots = nameSlots();
    let text = "";
    for (const c of kids) {
      if (ts.isJsxText(c)) {
        const r = cleanJsxText(c.text);
        const d = decodeJsxEntities(r);
        if (d === null) return false;
        if (/\{[A-Za-z_]/.test(d)) return false; // literal braces in copy would read as placeholders
        text += d;
      } else if (ts.isJsxExpression(c) && c.expression) {
        const lit = literalText(c.expression);
        if (lit !== null && !ts.isTemplateExpression(c.expression)) text += lit;
        else text += `{${slots.slot(c.expression)}}`;
      }
    }
    if (!isCopyText(text.replace(/\{[A-Za-z0-9_]+\}/g, "x"))) return false;
    const first = kids[0], last = kids[kids.length - 1];
    const rawLead = ts.isJsxText(first) ? first.text.match(/^\s*/)![0] : "";
    const rawTrail = ts.isJsxText(last) ? last.text.match(/\s*$/)![0] : "";
    const spLead = text.match(/^ */)![0], spTrail = text.match(/ *$/)![0];
    const lead = rawLead.includes("\n") ? rawLead : spLead ? `{${JSON.stringify(spLead)}}` : "";
    const trail = rawTrail.includes("\n") ? rawTrail : spTrail ? `{${JSON.stringify(spTrail)}}` : "";
    const vars: [string, string][] = [...slots.names.entries()].map(([expr, name]) => [name, expr]);
    edits.push({ start: first.pos, end: last.end, text: `${lead}{${callFor(text.trim(), vars)}}${trail}` });
    report.wrapped++;
    report.merged++;
    return true;
  };

  const visit = (node: ts.Node): void => {
    // ---- JSX element whose children are text + plain values: one t() -----
    if ((ts.isJsxElement(node) || ts.isJsxFragment(node)) && inFunctionScope(node)) {
      if (tryMergeRun(node)) {
        // still visit attributes of the opening element (placeholder="…", aria-label="…")
        if (ts.isJsxElement(node)) node.openingElement.forEachChild(visit);
        return;
      }
    }
    // ---- JSX text -------------------------------------------------------
    if (ts.isJsxText(node)) {
      const rendered = cleanJsxText(node.text);
      if (!rendered.trim() || !isCopyText(rendered)) return;
      if (!inFunctionScope(node)) { report.moduleLevel++; return; }
      const decoded = decodeJsxEntities(rendered);
      if (decoded === null) { report.skipped.push(`${rel}:${lineOf(src, node)} unknown HTML entity in JSX text: ${rendered.trim().slice(0, 60)}`); return; }
      // Keep the source layout: whitespace runs that contain a newline are
      // dropped by React anyway, so they stay verbatim around the call; spaces
      // React DOES render become explicit {" "} expressions.
      // node.getStart() skips leading whitespace for JsxText; node.pos/node.text do not.
      const raw = node.text;
      const rawLead = raw.match(/^\s*/)![0], rawTrail = raw.match(/\s*$/)![0];
      const spLead = decoded.match(/^ */)![0], spTrail = decoded.match(/ *$/)![0];
      const lead = rawLead.includes("\n") ? rawLead : spLead ? `{${JSON.stringify(spLead)}}` : "";
      const trail = rawTrail.includes("\n") ? rawTrail : spTrail ? `{${JSON.stringify(spTrail)}}` : "";
      edits.push({ start: node.pos, end: node.end, text: `${lead}{${callFor(decoded.trim())}}${trail}` });
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
      const slots = nameSlots();
      const { names, used } = slots;
      let key = node.head.text;
      for (const span of node.templateSpans) {
        const exprText = span.expression.getText(src);
        if (hasNestedCopy(span.expression)) report.skipped.push(`${rel}:${lineOf(src, node)} copy nested inside \${${exprText.slice(0, 40)}} — left untranslated, fix by hand`);
        key += `{${slots.slot(span.expression)}}` + span.literal.text;
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
loadProgram(files);
let total = 0;
for (const f of files) {
  const r = processFile(f, dry);
  total += r.wrapped;
  console.log(`${String(r.wrapped).padStart(5)} wrapped (${String(r.merged).padStart(2)} merged runs)  ${String(r.moduleLevel).padStart(4)} module-level (data twin)  ${r.file}`);
  for (const s of r.skipped) console.log(`        ⚠ ${s}`);
  for (const s of r.fragmented) console.log(`        ✂ ${s}`);
}
console.log(`${total} literals wrapped${dry ? " (dry run, nothing written)" : ""}`);
