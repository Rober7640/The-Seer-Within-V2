/**
 * The persona roster for the audit/iterate loop.
 *
 * Deliberately a hardcoded list rather than a DB read: `analyze-buyer-pull.ts`
 * is pure file analysis with no DB connection, and the audit must be able to
 * print "0 buyers in window" for a persona that appears nowhere in the pulled
 * data — which requires knowing the persona exists without querying anything.
 *
 * Anything found in pull data but absent from this list is still reported (see
 * buyer-pull-stats.ts), so a newly added seventh persona surfaces loudly rather
 * than being silently dropped. When that happens, add it here.
 */
export const KNOWN_PERSONA_SLUGS = [
  'evelyn-cross',
  'aiden-powers',
  'luna-voss',
  'marcus-stone',
  'maren-soleil',
  'nova-sharma',
] as const;

export type KnownPersonaSlug = (typeof KNOWN_PERSONA_SLUGS)[number];

/** Bucket label for rows whose persona_slug is null (deleted/legacy persona). */
export const UNKNOWN_PERSONA = '(unknown)';

export function isKnownPersona(slug: string): slug is KnownPersonaSlug {
  return (KNOWN_PERSONA_SLUGS as readonly string[]).includes(slug);
}
