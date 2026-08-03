# decode-him deck — card art

Drop the supplied card-strip image(s) for this deck here.

- **Seeded deck:** `decode-him` (face-down · Sun / Moon / Tower).
- **Live strip:** `client/public/tarot/decode-him-strip.png` — currently a **placeholder** (a copy of the
  palm thumbs strip) so the funnel renders. Replace it with the real 3-panel card-back art (equal panels,
  one per card; record the pixel W×H and set it in `DECODE_HIM.strip` in
  `client/src/content/tarotReads.ts`).

When adding a NEW deck from an image, put its raw art in `fb-tarot/docs/decks/<deck>/` and run the
`fb-tarot-add-card` skill.
