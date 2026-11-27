// Fold text for pattern matching: lower case, accents stripped, one apostrophe,
// ligatures opened, odd spaces made plain. Language packs write their FOLDED
// patterns against this form (shared/lang/types.ts).
//
//   foldText("J’ai 16 ANS, déprimée") → "j'ai 16 ans, deprimee"

export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[   ]/g, " ");
}
