// JSX twins: copy that is JSX in English (the landing subheadlines) arrives from the
// pipeline as tagged text ("…<br/><strong>…</strong>", see jsxRuns in
// scripts/l10n/extract.mts) and is rendered back here, with the classes the English
// elements carry.
import { Fragment, type ReactNode } from "react";

const TAGS: Record<string, (children: ReactNode) => ReactNode> = {
  strong: (c) => <strong className="text-gray-900 font-semibold">{c}</strong>,
  em: (c) => <em>{c}</em>,
};

export function renderTagged(text: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /<br\s*\/>|<([a-z]+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  let i = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (!m[1]) out.push(<br key={i++} />);
    else out.push(<Fragment key={i++}>{(TAGS[m[1]] ?? ((c) => c))(m[2])}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** "landing.variants:default.subheadline" → { "landing.variants": { default: { subheadline: <…/> } } } */
export function jsxTwins(jsx: Readonly<Record<string, string>>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, text] of Object.entries(jsx)) {
    const [twin, dotted] = id.split(":");
    const keys = dotted.split(".");
    let o: Record<string, unknown> = (out[twin] ??= {});
    for (const k of keys.slice(0, -1)) o = (o[k] ??= {}) as Record<string, unknown>;
    o[keys[keys.length - 1]] = renderTagged(text);
  }
  return out;
}
