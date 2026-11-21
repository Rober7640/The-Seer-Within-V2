/**
 * Country-specific crisis hotline numbers and geo-IP lookup.
 *
 * Used by the safety module to provide localized crisis resources
 * when suicide/self-harm content is detected.
 */

import logger from './logger';
import { msg } from '@shared/i18n';
import { localeDef, type LocaleCode } from '@shared/locales';
import { tl } from './locale';

// ============================================================
// Country Hotline Directory
// ============================================================

export interface CrisisHotline {
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  lines: Array<{
    name: string;
    number: string; // Phone number or text instructions
  }>;
  emergency: string; // Local emergency number (e.g., 911, 999)
}

const HOTLINE_DIRECTORY: CrisisHotline[] = [
  {
    country: 'United States', countryCode: 'US',
    lines: [
      { name: '988 Suicide & Crisis Lifeline', number: msg('988 (call or text)') },
      { name: 'Crisis Text Line', number: msg('Text HOME to 741741') },
    ],
    emergency: '911',
  },
  {
    country: 'United Kingdom', countryCode: 'GB',
    lines: [
      { name: 'Samaritans', number: msg('116 123 (free, 24/7)') },
      { name: 'Crisis Text Line UK', number: msg('Text SHOUT to 85258') },
    ],
    emergency: '999',
  },
  {
    country: 'Canada', countryCode: 'CA',
    lines: [
      { name: '988 Suicide Crisis Helpline', number: msg('988 (call or text, 24/7)') },
      { name: 'Crisis Text Line', number: msg('Text HOME to 741741') },
    ],
    emergency: '911',
  },
  {
    country: 'Australia', countryCode: 'AU',
    lines: [
      { name: 'Lifeline Australia', number: msg('13 11 14 (24/7)') },
      { name: 'Beyond Blue', number: msg('1300 22 4636') },
    ],
    emergency: '000',
  },
  {
    country: 'India', countryCode: 'IN',
    lines: [
      { name: 'iCall (TISS)', number: msg('9152987821') },
      { name: 'Vandrevala Foundation', number: msg('1860-2662-345 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Philippines', countryCode: 'PH',
    lines: [
      { name: 'NCMH Crisis Hotline', number: msg('1553 (landline)') },
      { name: 'Hopeline', number: msg('0917-899-8727 or 0908-639-2672') },
    ],
    emergency: '911',
  },
  {
    country: 'Ireland', countryCode: 'IE',
    lines: [
      { name: 'Samaritans Ireland', number: msg('116 123 (free, 24/7)') },
      { name: 'Pieta House', number: msg('1800 247 247') },
    ],
    emergency: '999 or 112',
  },
  {
    country: 'New Zealand', countryCode: 'NZ',
    lines: [
      { name: 'Lifeline NZ', number: msg('0800 543 354') },
      { name: 'Need to Talk?', number: msg('1737 (call or text)') },
    ],
    emergency: '111',
  },
  {
    country: 'South Africa', countryCode: 'ZA',
    lines: [
      { name: 'SADAG', number: msg('0800 567 567 (24/7)') },
      { name: 'Lifeline SA', number: msg('0861 322 322') },
    ],
    emergency: '10111',
  },
  {
    country: 'Germany', countryCode: 'DE',
    lines: [
      { name: 'Telefonseelsorge', number: msg('0800 111 0 111 (free, 24/7)') },
      { name: 'Telefonseelsorge', number: msg('0800 111 0 222 (free, 24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'France', countryCode: 'FR',
    lines: [
      { name: 'SOS Amitié', number: msg('09 72 39 40 50 (24/7)') },
      { name: 'Numéro National de Prévention du Suicide', number: msg('3114 (24/7)') },
    ],
    emergency: '112 or 15',
  },
  {
    country: 'Spain', countryCode: 'ES',
    lines: [
      { name: 'Teléfono de la Esperanza', number: msg('717 003 717 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Italy', countryCode: 'IT',
    lines: [
      { name: 'Telefono Amico', number: msg('02 2327 2327') },
      { name: 'Telefono Azzurro', number: msg('19696') },
    ],
    emergency: '112',
  },
  {
    country: 'Brazil', countryCode: 'BR',
    lines: [
      { name: 'CVV (Centro de Valorização da Vida)', number: msg('188 (24/7)') },
    ],
    emergency: '190',
  },
  {
    country: 'Mexico', countryCode: 'MX',
    lines: [
      { name: 'SAPTEL', number: msg('55 5259 8121 (24/7)') },
    ],
    emergency: '911',
  },
  {
    country: 'Japan', countryCode: 'JP',
    lines: [
      { name: 'TELL Lifeline', number: msg('03-5774-0992') },
      { name: 'Yorisoi Hotline', number: msg('0120-279-338 (24/7)') },
    ],
    emergency: '110',
  },
  {
    country: 'South Korea', countryCode: 'KR',
    lines: [
      { name: 'Korea Suicide Prevention Center', number: msg('1393 (24/7)') },
      { name: 'Mental Health Crisis Line', number: msg('1577-0199') },
    ],
    emergency: '112',
  },
  {
    country: 'Singapore', countryCode: 'SG',
    lines: [
      { name: 'Samaritans of Singapore (SOS)', number: msg('1-767 (24/7)') },
    ],
    emergency: '995',
  },
  {
    country: 'Malaysia', countryCode: 'MY',
    lines: [
      { name: 'Befrienders', number: msg('03-7627 2929 (24/7)') },
    ],
    emergency: '999',
  },
  {
    country: 'Netherlands', countryCode: 'NL',
    lines: [
      { name: '113 Zelfmoordpreventie', number: msg('113 or 0800-0113 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Belgium', countryCode: 'BE',
    lines: [
      { name: 'Centre de Prévention du Suicide', number: msg('0800 32 123 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Sweden', countryCode: 'SE',
    lines: [
      { name: 'Mind Självmordslinjen', number: msg('90101 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Norway', countryCode: 'NO',
    lines: [
      { name: 'Kirkens SOS', number: msg('22 40 00 40 (24/7)') },
    ],
    emergency: '113',
  },
  {
    country: 'Denmark', countryCode: 'DK',
    lines: [
      { name: 'Livslinien', number: msg('70 201 201') },
    ],
    emergency: '112',
  },
  {
    country: 'Finland', countryCode: 'FI',
    lines: [
      { name: 'MIELI Crisis Helpline', number: msg('09 2525 0111 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Portugal', countryCode: 'PT',
    lines: [
      { name: 'SOS Voz Amiga', number: msg('213 544 545 (16h–24h)') },
    ],
    emergency: '112',
  },
  {
    country: 'Poland', countryCode: 'PL',
    lines: [
      { name: 'Telefon Zaufania', number: msg('116 123 (24/7)') },
    ],
    emergency: '112',
  },
  {
    country: 'Argentina', countryCode: 'AR',
    lines: [
      { name: 'Centro de Asistencia al Suicida', number: msg('135 (24/7)') },
    ],
    emergency: '107',
  },
  {
    country: 'Nigeria', countryCode: 'NG',
    lines: [
      { name: 'SURPIN', number: msg('0800-123-0000') },
    ],
    emergency: '112',
  },
  {
    country: 'Kenya', countryCode: 'KE',
    lines: [
      { name: 'Befrienders Kenya', number: msg('0722 178 177') },
    ],
    emergency: '999 or 112',
  },
  {
    country: 'Pakistan', countryCode: 'PK',
    lines: [
      { name: 'Umang Helpline', number: msg('0317-4288665') },
    ],
    emergency: '115',
  },
  {
    country: 'Bangladesh', countryCode: 'BD',
    lines: [
      { name: 'Kaan Pete Roi', number: msg('01779-554391') },
    ],
    emergency: '999',
  },
  {
    country: 'Sri Lanka', countryCode: 'LK',
    lines: [
      { name: 'Sumithrayo', number: msg('011 268 2535') },
    ],
    emergency: '119',
  },
  {
    country: 'United Arab Emirates', countryCode: 'AE',
    lines: [
      { name: 'Mental Health Helpline', number: msg('800-HOPE (4673)') },
    ],
    emergency: '999',
  },
  {
    country: 'Israel', countryCode: 'IL',
    lines: [
      { name: 'ERAN', number: msg('1201 (24/7)') },
    ],
    emergency: '100',
  },
  {
    country: 'Thailand', countryCode: 'TH',
    lines: [
      { name: 'Samaritans of Thailand', number: msg('1323 (24/7)') },
    ],
    emergency: '191',
  },
  {
    country: 'Indonesia', countryCode: 'ID',
    lines: [
      { name: 'Into The Light', number: msg('119 ext. 8') },
    ],
    emergency: '112',
  },
  {
    country: 'China', countryCode: 'CN',
    lines: [
      { name: 'Beijing Suicide Research & Prevention Center', number: msg('010-82951332') },
      { name: 'Lifeline Shanghai', number: msg('400-161-9995') },
    ],
    emergency: '120',
  },
  {
    country: 'Taiwan', countryCode: 'TW',
    lines: [
      { name: 'Suicide Prevention Hotline', number: msg('1925 (24/7)') },
    ],
    emergency: '110',
  },
  {
    country: 'Hong Kong', countryCode: 'HK',
    lines: [
      { name: 'Samaritans Hong Kong', number: msg('2389 2222 (24/7)') },
    ],
    emergency: '999',
  },
];

/**
 * A country's lines as said in another LANGUAGE, where the service itself works
 * differently in that language (not a translation of the note): 988 answers in
 * Spanish when you press 2 or text AYUDA, Crisis Text Line answers AYUDA at
 * 741741. Used in place of the English entry's lines for that locale only; the
 * English entry above is never changed. Checked 2026-11-20 (localize/locales/es-US/legal.md).
 */
const LOCALE_LINES: Partial<Record<LocaleCode, Record<string, CrisisHotline['lines']>>> = {
  'es-US': {
    US: [
      {
        name: '988 Línea de Prevención del Suicidio y Crisis',
        number: 'llama al 988 y marca 2 para español, o envía AYUDA por mensaje de texto al 988; también por chat en 988lifeline.org/es',
      },
      { name: 'Crisis Text Line', number: 'envía AYUDA por mensaje de texto al 741741' },
    ],
  },
};

// Lookup index by country code
const HOTLINE_BY_CODE = new Map<string, CrisisHotline>(
  HOTLINE_DIRECTORY.map((h) => [h.countryCode, h]),
);

// Default fallback (US)
const DEFAULT_HOTLINE = HOTLINE_BY_CODE.get('US')!;

/**
 * Look up crisis hotline info for a country code.
 * Returns US hotline as fallback if country not in directory.
 */
export function getHotlineForCountry(countryCode: string | null): CrisisHotline {
  if (!countryCode) return DEFAULT_HOTLINE;
  return HOTLINE_BY_CODE.get(countryCode.toUpperCase()) ?? DEFAULT_HOTLINE;
}

// ============================================================
// Geo-IP Lookup (lightweight, no external dependency)
// ============================================================

// Simple in-memory cache to avoid repeated lookups for the same IP
const geoCache = new Map<string, { countryCode: string | null; expiresAt: number }>();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Resolve an IP address to a 2-letter country code using the free ip-api.com service.
 * Returns null on failure (network error, invalid IP, etc.).
 * Non-blocking with a 2-second timeout — never delays the crisis response.
 */
export async function getCountryFromIP(ip: string | undefined | null): Promise<string | null> {
  if (!ip) return null;

  // Normalize: strip IPv6 prefix, handle localhost
  const cleanIP = ip.replace(/^::ffff:/, '');
  if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') return null;

  // Check cache
  const cached = geoCache.get(cleanIP);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.countryCode;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,countryCode`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json() as { status: string; countryCode?: string };
    const code = data.status === 'success' ? (data.countryCode ?? null) : null;

    // Cache result
    geoCache.set(cleanIP, { countryCode: code, expiresAt: Date.now() + GEO_CACHE_TTL_MS });

    return code;
  } catch (err) {
    // Geo lookup should never block crisis response
    logger.warn('Geo-IP lookup failed (non-blocking)', { ip: cleanIP, error: (err as Error).message });
    return null;
  }
}

// ============================================================
// Crisis Response Builders
// ============================================================

/**
 * Build a warm, empathetic crisis response with country-specific hotline numbers.
 * Modeled after the ChatGPT crisis response pattern.
 */
export function buildCrisisResponse(hotline: CrisisHotline, locale: LocaleCode = 'en'): string {
  const { country, emergency, lines: shown } = localizeHotline(hotline, locale);
  const lines = shown
    .map((l) => `  - **${l.name}:** ${l.number}`)
    .join('\n');

  return tl(
    locale,
    msg(
      "I need to pause our reading here because what you're sharing sounds really serious, and I want to make sure you're safe.\n\n" +
      "You don't have to go through this alone.\n\n" +
      "Since you're in {country}, you can reach out to:\n" +
      '{lines}\n\n' +
      "If you're in immediate danger, please call emergency services ({emergency}) right now.\n\n" +
      "If calling feels hard, you can stay here and talk with me. What's happening that led you to feel this way?",
    ),
    { country, lines, emergency },
  );
}

/**
 * The directory is written in English ("France", "112 or 15"). In another locale
 * the country takes its name in that language and the "or" its conjunction, both
 * from Intl, so no hotline entry needs a translation. Line names and numbers are
 * the services' own and stay as listed. English: the entry, untouched.
 */
function localizeHotline(hotline: CrisisHotline, locale: LocaleCode): { country: string; emergency: string; lines: CrisisHotline['lines'] } {
  if (locale === 'en') return { country: hotline.country, emergency: hotline.emergency, lines: hotline.lines };
  // Line names are the services' own names (kept); the number notes are copy.
  // A service that works differently in this language has its own lines (LOCALE_LINES).
  const lines =
    LOCALE_LINES[locale]?.[hotline.countryCode] ??
    hotline.lines.map((l) => ({ name: l.name, number: tl(locale, l.number) }));
  const intl = localeDef(locale).market.intl;
  let country = hotline.country;
  let emergency = hotline.emergency;
  try {
    country = new Intl.DisplayNames([intl], { type: 'region' }).of(hotline.countryCode) ?? country;
  } catch { /* keep the English name */ }
  try {
    const parts = hotline.emergency.split(/\s+or\s+/);
    if (parts.length > 1) emergency = new Intl.ListFormat(intl, { type: 'disjunction' }).format(parts);
  } catch { /* keep as listed */ }
  return { country, emergency, lines };
}

/**
 * Build a soft crisis note (prepended to the persona's normal response).
 * Country-specific version of the original SOFT_CRISIS_NOTE.
 */
export function buildSoftCrisisNote(hotline: CrisisHotline, locale: LocaleCode = 'en'): string {
  const shown = localizeHotline(hotline, locale).lines;
  const primary = shown[0];
  const line =
    `**${primary.name}** (${primary.number})` +
    (shown[1] ? ` · ${shown[1].name}: ${shown[1].number}` : '');
  return '---\n' + tl(locale, msg('If things ever feel too heavy: {line}'), { line }) + '\n---\n\n';
}

/**
 * Build the "Help is available" disclaimer data for the frontend banner.
 */
export function buildCrisisDisclaimer(hotline: CrisisHotline, locale: LocaleCode = 'en'): {
  hotlineName: string;
  hotlineNumber: string;
  country: string;
} {
  const { country, lines } = localizeHotline(hotline, locale);
  return {
    hotlineName: lines[0].name,
    hotlineNumber: lines[0].number,
    country,
  };
}
