// May this page be served in `locale`? Checked at boot, before mount.
//
// 1. The locale must serve this funnel / path (LocaleDef.serves).
// 2. On /fb-tarot the lander's hook (and deck) must be in the locale's twin,
//    because French ships in batches: an untranslated lander stays English
//    for the whole visit rather than mixing languages.
//
// Anything not covered → English, and the cookie is rewritten to match.
import { funnelDefForPath } from "@shared/funnelConfig";
import { localeDef, type LocaleCode } from "@shared/locales";
import { twinFor } from "@shared/i18n";
import { DEFAULT_DECK, DEFAULT_HOOK } from "@/content/tarotReads";

export function localeServesPath(locale: LocaleCode, pathname: string): boolean {
  const serves = localeDef(locale).serves;
  if (!serves) return true;
  const funnel = funnelDefForPath(pathname);
  if (funnel) return serves.funnels.includes(funnel.posthog);
  return serves.paths.includes(pathname.replace(/\/+$/, "") || "/");
}

/** Run AFTER the locale bundle is registered. */
export function localeCoversPage(locale: LocaleCode, pathname: string, search: string): boolean {
  if (locale === "en") return true;
  if (!localeServesPath(locale, pathname)) return false;
  // Only the lander and the chat read per-hook copy; checkout, upsells and the
  // success page use the funnel's shared copy, and carry no hook in their URL.
  const tarotPage = funnelDefForPath(pathname)?.posthog === "tarot" && /^\/fb-tarot(\/(b|c|chat))?\/?$/.test(pathname);
  if (tarotPage) {
    const q = new URLSearchParams(search);
    const hook = q.get("hook") || DEFAULT_HOOK;
    const deck = q.get("deck") || DEFAULT_DECK;
    const headlines = twinFor(locale, "tarot.headlines") as Record<string, string> | undefined;
    const decks = twinFor(locale, "tarot.decks") as Record<string, { reads?: Record<string, unknown> }> | undefined;
    return Boolean(headlines?.[hook] && decks?.[deck]?.reads?.[hook]);
  }
  return true;
}
