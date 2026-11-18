// Every translated locale bundle, statically imported for the SERVER bundle.
//
// The client loads bundles lazily (client/src/lib/i18n.ts, import.meta.glob) so
// English visitors never download another language. The server bundles them all
// up front: esbuild inlines these imports, so production does not depend on the
// JSON files being present next to dist/.
//
// The funnel-localize skill adds one line here per language it ships.

import type { LocaleBundle } from "../i18n";
import type { LocaleCode } from "../locales";

export const SERVER_BUNDLES: Partial<Record<Exclude<LocaleCode, "en">, LocaleBundle>> = {};
