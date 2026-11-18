// Shared rules for "is this string literal buyer-facing copy?"
//
// Used by literal-inventory.mts (sizing + the copy-move guard) and wrap-t.mts
// (the codemod that wraps inline copy in t()). Keeping ONE predicate means the
// guard and the codemod can never disagree about what counts as copy.

import ts from "typescript";

// JSX attributes and object keys whose string values are never copy.
export const NON_COPY_KEYS = new Set([
  "className", "class", "key", "href", "src", "id", "type", "variant", "name",
  "role", "htmlFor", "to", "path", "data-testid", "style", "size", "autoComplete",
  "inputMode", "target", "rel", "method", "state", "inputType", "value", "stage",
  "bucket", "funnel", "param", "prefix", "posthog", "event", "eventName", "kind",
  "mode", "currency", "product", "bumpProduct", "metadata", "color", "icon",
  "fill", "stroke", "viewBox", "d", "transform", "as", "asChild", "accept",
  "media_type", "model", "status", "code", "countryCode", "slug", "deck", "card",
]);

// Calls whose string arguments are logging / analytics / plumbing, never copy.
export const NON_COPY_CALLEES = /^(console|logger|log|Sentry|posthog|captureException|track\w*|trackPH|fetch|setLocation|navigate|localStorage|sessionStorage|document|window\.(localStorage|sessionStorage|location|addEventListener|history|open)|new URL|URLSearchParams|JSON|require|import)\b/;

// String methods whose literal arguments are matching logic, never copy.
const MATCH_METHODS = new Set([
  "includes", "startsWith", "endsWith", "indexOf", "lastIndexOf", "match",
  "matchAll", "replace", "replaceAll", "split", "test", "search", "get", "has",
  "set", "getItem", "setItem", "removeItem", "querySelector", "querySelectorAll",
  "getElementById", "addEventListener", "removeEventListener", "padStart", "padEnd",
  "join", "toLocaleString", "toLocaleDateString", "toLocaleTimeString",
]);

export function isClassNameLike(t: string): boolean {
  const tokens = t.split(/\s+/).filter(Boolean);
  if (!tokens.every((tok) => /^[!a-z0-9:\[\]\/\.\-#%_()]+$/i.test(tok))) return false;
  const classy = tokens.filter((tok) => /[-:\[]/.test(tok) || /^(flex|grid|block|hidden|relative|absolute|fixed|inline|italic|uppercase|truncate|underline|rounded|shadow|border|transition|container)$/.test(tok));
  return classy.length / tokens.length >= 0.5;
}

export function isCopyText(raw: string): boolean {
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

/** The property / attribute name a literal is the value of, if any. */
export function keyOf(node: ts.Node): string | null {
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

/** The callee text of the nearest call this node is an ARGUMENT of (not nested deeper). */
function directCallOf(node: ts.Node): ts.CallExpression | ts.NewExpression | null {
  let n: ts.Node = node;
  // walk up through parentheses / conditional branches / || ?? defaults
  while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isConditionalExpression(n.parent) ||
    (ts.isBinaryExpression(n.parent) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.parent.operatorToken.kind)))) n = n.parent;
  const p = n.parent;
  if (p && (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(n as ts.Expression)) return p;
  return null;
}

/** True when the literal sits in a non-copy position (logs, comparisons, keys, types, matching). */
export function inNonCopyPosition(node: ts.Node): boolean {
  const k = keyOf(node);
  if (k && NON_COPY_KEYS.has(k)) return true;
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    // anything inside a style object (style={{…}} or style: {…}) is CSS, never copy
    if (ts.isJsxAttribute(n) && n.name.getText() === "style") return true;
    if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && n.name.text === "style") return true;
    if (ts.isCallExpression(n) && NON_COPY_CALLEES.test(n.expression.getText())) return true;
    if (ts.isNewExpression(n) && /^(URL|URLSearchParams|RegExp|Error)$/.test(n.expression.getText())) return true;
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return true;
    if (ts.isElementAccessExpression(n) && n.argumentExpression === node) return true;
    if (ts.isLiteralTypeNode(n)) return true;
    if (ts.isCaseClause(n) && n.expression === node) return true;
    if (ts.isTaggedTemplateExpression(n)) return true;
  }
  const call = directCallOf(node);
  if (call && ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && MATCH_METHODS.has(call.expression.name.text)) return true;
  const p = node.parent;
  if (p && ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
  return false;
}

/** True when the node is inside a function body (evaluated at call time, not module load). */
export function inFunctionScope(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isFunctionLike(n) && (n as ts.FunctionLikeDeclaration).body) return true;
  }
  return false;
}

/** True when the node is already the text argument of t()/tl(). */
export function alreadyTranslated(node: ts.Node): boolean {
  const p = node.parent;
  if (!p || !ts.isCallExpression(p)) return false;
  const callee = p.expression.getText();
  if ((callee === "t" || callee === "tr") && p.arguments[0] === node) return true;
  if (callee === "tl" && p.arguments[1] === node) return true;
  return false;
}

/** For a t()/tl() call, the placeholder names declared in its vars object literal. */
export function declaredVars(call: ts.CallExpression, varsIndex: number): Set<string> {
  const out = new Set<string>();
  const arg = call.arguments[varsIndex];
  if (arg && ts.isObjectLiteralExpression(arg)) {
    for (const prop of arg.properties) {
      if ((ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) out.add(prop.name.text);
    }
  }
  return out;
}

// HTML entities React decodes inside JSX text. Anything else is reported by the
// codemod and left for a human, rather than guessed.
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0", mdash: "\u2014",
  ndash: "\u2013", hellip: "\u2026", rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201C",
  rdquo: "\u201D", copy: "\u00A9", reg: "\u00AE", trade: "\u2122", middot: "\u00B7",
  bull: "\u2022", times: "\u00D7", euro: "\u20AC", rarr: "\u2192", larr: "\u2190",
};

/** Decode JSX-text entities; returns null if an unknown named entity is present. */
export function decodeJsxEntities(raw: string): string | null {
  let unknown = false;
  const out = raw.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return String.fromCodePoint(code);
    }
    const hit = ENTITIES[body.toLowerCase()];
    if (hit === undefined) { unknown = true; return whole; }
    return hit;
  });
  return unknown ? null : out;
}

/** Babel's cleanJSXElementLiteralChild: the exact string React renders for a JSX text node. */
export function cleanJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((l, i) => { if (/[^ \t]/.test(l)) lastNonEmpty = i; });
  let str = "";
  lines.forEach((line, i) => {
    const isFirst = i === 0, isLast = i === lines.length - 1, isLastNonEmpty = i === lastNonEmpty;
    let trimmed = line.replace(/\t/g, " ");
    if (!isFirst) trimmed = trimmed.replace(/^[ ]+/, "");
    if (!isLast) trimmed = trimmed.replace(/[ ]+$/, "");
    if (trimmed) {
      if (!isLastNonEmpty) trimmed += " ";
      str += trimmed;
    }
  });
  return str;
}
