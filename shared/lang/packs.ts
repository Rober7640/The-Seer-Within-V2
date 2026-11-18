// Every language pack, for the SERVER (statically imported; the client gets its
// visitor's pack from the lazily loaded locale bundle instead).
import { FR_FR } from "./fr";
import type { LangPack } from "./types";

export const LANG_PACKS: readonly LangPack[] = [FR_FR];
