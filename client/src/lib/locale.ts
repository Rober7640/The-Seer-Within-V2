// The visitor's locale on the client.
//
// Same contract as `?noemail` (lib/funnel.ts): the URL param wins and persists,
// so a French visitor stays French through the in-funnel navigations that
// rebuild the query string (bridge → chat → checkout → upsells). It persists in
// a SESSION cookie rather than sessionStorage because the server must see it
// too: every same-origin fetch carries the cookie, so no request body changes.
//
//   ?lang=fr  → fr-FR, cookie set
//   ?lang=en  → English, cookie cleared
//   no param  → the cookie, else English
//
// Captured once at boot (main.tsx) and cached: a page load has one locale.

import { DEFAULT_LOCALE, LOCALE_COOKIE, isKnownLocale, localeDef, resolveLocale, type LocaleCode } from "@shared/locales";
import { linkParams } from "./funnel";

let cached: LocaleCode | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const pair of document.cookie.split(";")) {
    const [k, ...rest] = pair.split("=");
    if (k && k.trim() === name) return decodeURIComponent(rest.join("=").trim());
  }
  return null;
}

function writeCookie(name: string, value: string | null): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = value === null
      ? `${name}=; path=/; max-age=0; SameSite=Lax`
      : `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
  } catch {
    /* cookies blocked — fall back to the URL param for this page only */
  }
}

/** Resolve the locale from the entry URL / cookie and remember it. Call once at boot. */
export function captureLocale(search?: string): LocaleCode {
  const p = linkParams(search);
  let locale: LocaleCode;
  if (p.has("lang") && isKnownLocale(p.get("lang"))) {
    locale = resolveLocale(p.get("lang"));
    writeCookie(LOCALE_COOKIE, locale === DEFAULT_LOCALE ? null : locale);
  } else {
    locale = resolveLocale(readCookie(LOCALE_COOKIE));
  }
  cached = locale;
  return locale;
}

/**
 * Settle the locale for this visit (after coverage checks at boot). Rewrites
 * the cookie too, so the server — which reads it for Evelyn's replies, emails
 * and checkout — always agrees with what is on screen.
 */
export function settleLocale(locale: LocaleCode): void {
  cached = locale;
  writeCookie(LOCALE_COOKIE, locale === DEFAULT_LOCALE ? null : locale);
}

/** The locale captured at boot (English if capture never ran). */
export function currentLocale(): LocaleCode {
  return cached ?? DEFAULT_LOCALE;
}

/**
 * The currency to report on the client Purchase pixels (FB Pixel + GAds), so the
 * browser fire matches the server Conversions API for the same event_id. "USD"
 * for English (unchanged); "EUR" for a French visit.
 */
export function purchaseCurrency(): string {
  return localeDef(currentLocale()).market.currency.toUpperCase();
}

/**
 * The locale for on-screen dates and times. English returns undefined, i.e. the
 * browser's own locale, exactly as today; a translated page uses its language,
 * so a French page never shows "Thursday 3:31 PM" on an English browser.
 */
export function dateLocale(): string | undefined {
  const l = currentLocale();
  return l === DEFAULT_LOCALE ? undefined : localeDef(l).market.intl;
}

/** Test helper. */
export function __setLocaleForTests(locale: LocaleCode | null): void {
  cached = locale;
}
