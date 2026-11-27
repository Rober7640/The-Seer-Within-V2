// Builds a locale bundle (client/src/l10n/<locale>/index.ts) from what the pipeline
// generated, shared/l10n/<locale>/{catalog,data,jsx}.ts, plus the locale's language pack.
// It adds only what cannot be data: the twins DERIVED from other twins (the V1 upsell
// copy objects are built from the upsell message modules) and the JSX twins.
import { overlay, type LocaleBundle } from "@shared/i18n";
import type { LangPack } from "@shared/lang/types";
import * as U1 from "@/lib/upsellMessages";
import * as U2 from "@/lib/upsell2Messages";
import { V1_UPSELL1, V1_UPSELL2 } from "@/lib/upsellCopy/v1";
import type { Bucket } from "@/types/chat";
import { jsxTwins } from "./jsx";

/** Each field of `english` that IS one of the module's exports → that export, translated. */
function derive(english: object, ns: Record<string, unknown>, nsTr: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(english)) {
    // arrays/objects AND single-line strings (QUESTION_1, RITUAL_PATH_A_EXTRA): a string
    // field was skipped before, so it stayed English on translated pages.
    if (v === null || (typeof v !== "object" && typeof v !== "string")) continue;
    const name = Object.keys(ns).find((n) => ns[n] === v);
    if (name && nsTr[name] !== ns[name]) out[k] = nsTr[name];
  }
  return out;
}

export function buildBundle(src: {
  catalog: Readonly<Record<string, string>>;
  data: Readonly<Record<string, unknown>>;
  jsx: Readonly<Record<string, string>>;
  lang: LangPack;
}): LocaleBundle {
  const { catalog, lang } = src;
  const DATA = src.data as Record<string, any>;
  const t = (s: string) => catalog[s] ?? s;
  const u1 = overlay(U1 as unknown as Record<string, unknown>, DATA["upsell1.messages"]);
  const u2 = overlay(U2 as unknown as Record<string, unknown>, DATA["upsell2.messages"]);
  const bucketMsgs = u1.UPSELL_BUCKET_MESSAGES as Record<Bucket, string[]>;

  const data: Record<string, unknown> = {
    ...DATA,
    "upsell1.v1": {
      ...derive(V1_UPSELL1, U1 as unknown as Record<string, unknown>, u1),
      bucketMessages: (bucket: Bucket | undefined) => (bucket ? bucketMsgs[bucket] : []) || [],
      acceptLabel: t(V1_UPSELL1.acceptLabel),
    },
    "upsell2.v1": {
      ...derive(V1_UPSELL2, U2 as unknown as Record<string, unknown>, u2),
      downsellDeclineLabel: t(V1_UPSELL2.downsellDeclineLabel),
    },
  };
  for (const [key, twin] of Object.entries(jsxTwins(src.jsx))) data[key] = overlay((data[key] as object) ?? {}, twin);
  return { catalog, data, lang };
}
