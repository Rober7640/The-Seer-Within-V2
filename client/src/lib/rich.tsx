// Rich-text translation: one translatable sentence that contains markup.
//
//   tx("Your reading showed you the <em>what</em>. A conversation tells you the <em>why</em>.",
//      { em: (c) => <em>{c}</em> })
//
// The whole sentence (tags included) is ONE catalog key, so a translator can move
// the emphasised words wherever the target language needs them. Tags are simple
// <name>…</name> pairs (no nesting, no attributes); each name maps to a render
// function. {placeholders} work as in t(), and are filled AFTER the tags are
// parsed, so a buyer's name can never be read as markup.
//
// For English the key is the source text, so the rendered output is the same
// text and the same elements the JSX had before.

import { Fragment, type ReactNode } from "react";
import { interpolate, type Vars } from "@shared/i18n";
import { t } from "./i18n";

export type TagRenderers = Record<string, (children: ReactNode) => ReactNode>;

const TAG = /<([a-z][a-z0-9]*)>([\s\S]*?)<\/\1>/g;

export function tx(text: string, tags: TagRenderers, vars?: Vars): ReactNode {
  const template = t(text); // no vars: placeholders stay as {name} until after parsing
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  const re = new RegExp(TAG.source, "g");
  for (let m = re.exec(template); m; m = re.exec(template)) {
    const idx = m.index;
    if (idx > last) out.push(interpolate(template.slice(last, idx), vars));
    const render = tags[m[1]];
    const inner = interpolate(m[2], vars);
    out.push(<Fragment key={i++}>{render ? render(inner) : inner}</Fragment>);
    last = idx + m[0].length;
  }
  if (last < template.length) out.push(interpolate(template.slice(last), vars));
  return <>{out}</>;
}
