// The languages + markets a V1 funnel can be served in.
//
// A LOCALE IS A LANGUAGE *AND* A MARKET. They are separate on purpose: es-US is
// Spanish copy sold into the US market (USD, US shipping, US consumer law, 988),
// while fr-FR is French copy sold into France (EUR, EU shipping, French consumer
// law, 3114). Code that needs a market fact (currency, shipping countries,
// hotline) reads it from `market`, never from the language code.
//
// HOW A VISITOR GETS A LOCALE. Like `?noemail` (client/src/lib/funnel.ts), the
// locale is ORTHOGONAL to the funnel: an ad link adds `?lang=fr` to any existing
// funnel URL (/fb, /fb-tarot, ...), so every route, pixel rule and funnel helper
// keeps working unchanged. The client persists it in a session cookie, which also
// tells the server (same-origin fetches carry it), so no request body changes.
// No `?lang` and no cookie = English, byte-identical to today.
//
// To add a language: one entry below + its catalog/data under
// shared/l10n/<code>/ (produced by the funnel-localize skill).

export type LocaleCode = "en" | "fr-FR";

export const DEFAULT_LOCALE: LocaleCode = "en";

/** The session cookie that carries the locale to the server. */
export const LOCALE_COOKIE = "seer_locale";

export interface LocaleMarket {
  /** ISO 3166-1 alpha-2 country the funnel sells into. */
  country: string;
  /** Stripe currency code. */
  currency: "usd" | "eur";
  /** Stripe Checkout `locale`; undefined = leave unset (today's behaviour). */
  stripeLocale?: "fr" | "es" | "en";
  /** BCP-47 tag for Intl number/date formatting. */
  intl: string;
  /** Country code used to look up the crisis line in server/lib/crisisHotlines.ts. */
  hotlineCountry: string;
}

export interface LocaleDef {
  code: LocaleCode;
  /** Value of the `?lang=` URL parameter that selects this locale. */
  param: string;
  /** <html lang> value. */
  htmlLang: string;
  /** Human name, for admin/review pages. */
  label: string;
  /** The language's own name, as said inside a sentence in that language ("English", "français"). */
  languageName: string;
  /** How Evelyn addresses the buyer, where the language distinguishes. */
  register?: "vous" | "tu" | "usted" | "tú";
  market: LocaleMarket;
  /**
   * Appended AFTER the funnel's own suffixes so attribution stays separate:
   * Stripe product " - FB" + " - FR", AWeber tag "-fb" + "-fr", PostHog prop.
   * Empty for English so English stays byte-identical.
   */
  suffix: { product: string; aweber: string };
  /**
   * Where this locale may be served. A visitor carrying it on any other page
   * (another funnel, the V2 app) gets English for that visit, so no page is
   * ever half translated. `funnels` = FunnelDef.posthog keys
   * (shared/funnelConfig.ts); `paths` = exact non-funnel paths (legal pages).
   * English serves everything (null).
   */
  serves: null | { funnels: readonly string[]; paths: readonly string[] };
  /**
   * The go-live switch (gate G3). false = the bundle is served by the dev server
   * only, so merging a translated locale changes nothing in production until the
   * operator approves it and this flips to true.
   */
  live: boolean;
}

export const LOCALES: Record<LocaleCode, LocaleDef> = {
  en: {
    code: "en",
    param: "en",
    htmlLang: "en",
    label: "English",
    languageName: "English",
    market: { country: "US", currency: "usd", intl: "en-US", hotlineCountry: "US" },
    suffix: { product: "", aweber: "" },
    live: true,
    serves: null,
  },
  "fr-FR": {
    code: "fr-FR",
    param: "fr",
    htmlLang: "fr",
    label: "Français (France)",
    languageName: "français",
    register: "vous",
    market: { country: "FR", currency: "eur", stripeLocale: "fr", intl: "fr-FR", hotlineCountry: "FR" },
    suffix: { product: " - FR", aweber: "-fr" },
    serves: { funnels: ["fb", "tarot"], paths: ["/privacy", "/terms", "/refund"] },
    live: false,
  },
};

const BY_PARAM: Record<string, LocaleCode> = Object.fromEntries(
  Object.values(LOCALES).map((l) => [l.param, l.code]),
);

/** Coerce an untrusted value (URL param, cookie, request field) to a locale. */
export function resolveLocale(value: unknown): LocaleCode {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const v = value.trim();
  if (v in LOCALES) return v as LocaleCode;
  const byParam = BY_PARAM[v.toLowerCase()];
  return byParam ?? DEFAULT_LOCALE;
}

/** True when `value` names a known locale (by code or by `?lang=` param). */
export function isKnownLocale(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v in LOCALES || v.toLowerCase() in BY_PARAM;
}

export function localeDef(code: LocaleCode): LocaleDef {
  return LOCALES[code];
}
