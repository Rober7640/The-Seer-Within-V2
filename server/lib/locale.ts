// The request's locale on the server, and server-side translation.
//
// The client sets the `seer_locale` session cookie when a visitor arrives with
// `?lang=` (client/src/lib/locale.ts); every same-origin fetch carries it. No
// cookie = English, so every existing request behaves exactly as today.
//
// Server copy uses the same catalogs as the client (shared/l10n/<code>/),
// registered once at import from shared/l10n/serverBundles.ts. Stripe webhooks have no cookie: they read `metadata.locale`,
// which checkout creation writes from this function.

import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";
import { DEFAULT_LOCALE, LOCALE_COOKIE, localeDef, resolveLocale, type LocaleCode } from "@shared/locales";
import { pickData, registerCatalog, registerData, translate, type Vars } from "@shared/i18n";
import { SERVER_BUNDLES } from "@shared/l10n/serverBundles";
import { LANG_PACKS } from "@shared/lang/packs";
import { langPackFor, registerLangPack } from "@shared/lang/registry";
import type { LangPack } from "@shared/lang/types";
import { parseCookies } from "./visitorCookie";

export function localeFromRequest(req: Request): LocaleCode {
  return resolveLocale(parseCookies(req)[LOCALE_COOKIE]);
}

// The request's locale, readable anywhere below a request (prompts, safety,
// sanitizers) without threading a parameter through every signature. Outside a
// request — webhooks with no cookie, crons, scripts, tests — it is English.
const store = new AsyncLocalStorage<LocaleCode>();

export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  store.run(localeFromRequest(req), next);
}

export function requestLocale(): LocaleCode {
  return store.getStore() ?? "en";
}

/**
 * The charge currency for a locale's market. English = "usd", byte-identical to
 * today; a French order = "eur". For NEW orders (main line, bump, a fresh PAI
 * order) read from the visitor's locale; for an off-session upsell charge read
 * the ORIGINAL order's currency instead (the cookie may be stale).
 */
export function requestCurrency(locale: LocaleCode = requestLocale()): "usd" | "eur" {
  return localeDef(locale).market.currency;
}

/**
 * The Stripe Checkout `locale` for this order. undefined for English leaves
 * Stripe's own auto-detection exactly as today; a French order renders in French.
 */
export function requestStripeLocale(locale: LocaleCode = requestLocale()): "fr" | "es" | "en" | undefined {
  return localeDef(locale).market.stripeLocale;
}

/**
 * The shipping countries a checkout accepts: the funnel's base list plus the
 * locale's own market country when that market is not the US (so a French buyer
 * can enter a French address). English (US market) returns the base list
 * unchanged; a country already present is never duplicated.
 */
export function shippingCountries(base: readonly string[], locale: LocaleCode = requestLocale()): string[] {
  const country = localeDef(locale).market.country;
  if (country === "US" || base.includes(country)) return [...base];
  return [...base, country];
}

/**
 * Stripe metadata for the order's language: `{ locale: "fr-FR" }` on a non-English order and
 * NOTHING on an English one, so English orders keep exactly the keys they have today. n8n's
 * Stripe router reads it to send a French order to the French reading flow (the English flow
 * matches on `product`, which never changes).
 */
export function localeMetadata(locale: LocaleCode = requestLocale()): { locale?: LocaleCode } {
  return locale === DEFAULT_LOCALE ? {} : { locale };
}

/** Run `fn` with an explicit locale (webhooks that read metadata.locale, tests). */
export function withLocale<T>(locale: LocaleCode, fn: () => T): T {
  return store.run(locale, fn);
}

/** The language pack of this request's locale; null for English. */
export function requestLangPack(locale: LocaleCode = requestLocale()): LangPack | null {
  return langPackFor(locale);
}

/** Translate server copy for a known locale. English returns the source text. */
export function tl(locale: LocaleCode, text: string, vars?: Vars): string {
  return translate(locale, text, vars);
}

export function pickFor<T>(locale: LocaleCode, key: string, english: T): T {
  return pickData(locale, key, english);
}

// Register every language pack and every shipped locale bundle once, at import.
for (const pack of LANG_PACKS) registerLangPack(pack);
for (const [code, bundle] of Object.entries(SERVER_BUNDLES) as [LocaleCode, NonNullable<(typeof SERVER_BUNDLES)[keyof typeof SERVER_BUNDLES]>][]) {
  registerCatalog(code, bundle.catalog);
  for (const [key, value] of Object.entries(bundle.data ?? {})) registerData(code, key, value);
}
