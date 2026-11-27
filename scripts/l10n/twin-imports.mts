// Codemod: route a file's imported COPY CONSTANTS through a data twin.
//
//   import { personalizeMessage, UPSELL2_GAP, UPSELL2_PRICE } from "@/lib/upsell2Messages";
//   … sendBotMessages(p(UPSELL2_GAP)) …
// becomes
//   import { personalizeMessage } from "@/lib/upsell2Messages";
//   import * as UPSELL2_MESSAGES from "@/lib/upsell2Messages";
//   const upsell2Msgs = () => pick("upsell2.messages", UPSELL2_MESSAGES);
//   … sendBotMessages(p(upsell2Msgs().UPSELL2_GAP)) …
//
// Only ALL_CAPS value imports move (the copy constants); functions and types
// stay named imports. For English pick() returns the module namespace itself,
// so every reference resolves to the very same value as before.
//
//   npx tsx scripts/l10n/twin-imports.mts <file> <module-specifier> <twin-key> <NamespaceName> <accessorName>
import ts from "typescript";
import fs from "node:fs";

const [file, spec, key, ns, accessor] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const edits: { start: number; end: number; text: string }[] = [];
const moved = new Set<string>();
let importDecl: ts.ImportDeclaration | undefined;

for (const st of src.statements) {
  if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || st.moduleSpecifier.text !== spec) continue;
  const b = st.importClause?.namedBindings;
  if (!b || !ts.isNamedImports(b)) continue;
  importDecl = st;
  const keep: string[] = [];
  for (const el of b.elements) {
    const name = el.name.text;
    if (!el.isTypeOnly && !el.propertyName && /^[A-Z][A-Z0-9_]+$/.test(name)) moved.add(name);
    else keep.push(el.getText(src));
  }
  const clause = keep.length ? `import {\n  ${keep.join(",\n  ")},\n} from "${spec}";\n` : "";
  edits.push({ start: st.getStart(src), end: st.getEnd() + (text[st.getEnd()] === "\n" ? 1 : 0),
    text: `${clause}import * as ${ns} from "${spec}";\n` });
}
if (!importDecl || !moved.size) { console.log(`nothing to move in ${file}`); process.exit(0); }

let refs = 0;
const visit = (n: ts.Node) => {
  if (ts.isImportDeclaration(n)) return;
  if (ts.isIdentifier(n) && moved.has(n.text)) {
    const p = n.parent;
    const isPropName = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) ||
      (ts.isPropertySignature(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n);
    if (ts.isShorthandPropertyAssignment(p)) { edits.push({ start: n.getStart(src), end: n.getEnd(), text: `${n.text}: ${accessor}().${n.text}` }); refs++; }
    else if (!isPropName) { edits.push({ start: n.getStart(src), end: n.getEnd(), text: `${accessor}().${n.text}` }); refs++; }
  }
  n.forEachChild(visit);
};
src.forEachChild(visit);

// accessor goes after the last import
const lastImport = [...src.statements].filter(ts.isImportDeclaration).pop()!;
edits.push({ start: lastImport.getEnd(), end: lastImport.getEnd(),
  text: `\n\n// l10n: the copy constants above are read through the locale's data twin (English = the module itself).\nconst ${accessor} = () => pick("${key}", ${ns});` });

let out = text;
for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
if (!/import \{[^}]*\bpick\b[^}]*\} from "@\/lib\/i18n"/.test(out)) {
  out = out.replace(/import \{ t \} from "@\/lib\/i18n";/, 'import { t, pick } from "@/lib/i18n";');
  if (!/\bpick\b.*@\/lib\/i18n/.test(out)) out = out.replace(/(\nimport [^\n]+;\n)(?![\s\S]*\nimport )/, `$1import { pick } from "@/lib/i18n";\n`);
}
fs.writeFileSync(file, out);
console.log(`${file}: ${moved.size} constants → ${accessor}() (${refs} references)`);
