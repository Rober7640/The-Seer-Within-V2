// The request's locale on the server, and server-side translation.
//
// The client sets the `seer_locale` session cookie when a visitor arrives with
// `?lang=` (client/src/lib/locale.ts); every same-origin fetch carries it. No
// cookie = English, so every existing request behaves exactly as today.
//
// Server copy uses the same catalogs as the client (shared/l10n/<code>/),
// registered once at import from shared/l10n/serverBundles.ts. Stripe webhooks have no cookie: they read `metadata.locale`,
// which checkout creation writes from this function.

import type { Request } from "express";
import { LOCALE_COOKIE, resolveLocale, type LocaleCode } from "@shared/locales";
import { pickData, registerCatalog, registerData, translate, type Vars } from "@shared/i18n";
import { SERVER_BUNDLES } from "@shared/l10n/serverBundles";
import { parseCookies } from "./visitorCookie";

export function localeFromRequest(req: Request): LocaleCode {
  return resolveLocale(parseCookies(req)[LOCALE_COOKIE]);
}

/** Translate server copy for a known locale. English returns the source text. */
export function tl(locale: LocaleCode, text: string, vars?: Vars): string {
  return translate(locale, text, vars);
}

export function pickFor<T>(locale: LocaleCode, key: string, english: T): T {
  return pickData(locale, key, english);
}

// Register every shipped locale bundle once, at import.
for (const [code, bundle] of Object.entries(SERVER_BUNDLES) as [LocaleCode, NonNullable<(typeof SERVER_BUNDLES)[keyof typeof SERVER_BUNDLES]>][]) {
  registerCatalog(code, bundle.catalog);
  for (const [key, value] of Object.entries(bundle.data ?? {})) registerData(code, key, value);
}
