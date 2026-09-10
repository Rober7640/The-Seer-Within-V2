# Daily email → local funnel continuity

The source of truth is `scripts/build-08-daily.py` (`LETTERS`) plus the original `letters-02/*.md` email. The local funnel now consumes generated edition records instead of a second hand-written list of cards and email excerpts.

## Local operator commands

Run from the repository root:

```sh
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py --check
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.test.py
```

The first command writes `local/08-marcus/editions.json`. The second reports source/fixture drift without writing. The third checks continuity, full email text, variable visible-card counts, version differences, markup removal, invalid metadata, and buyer-only hidden draws. No command publishes, uploads, sends email, or writes to a database.

Restart the local server after regenerating: fixtures are imported at startup.

## What is exported

- Stable edition ID and version; question, explicit interpretive theme, and spread ID/name/version.
- Free-card positions and names parsed from email headings, with fixed card IDs from the builder’s card-art configuration. Deck IDs normalize `the-star` to `star`, etc.
- Paid-position labels from each selected config’s `funnel` metadata. These are explicit because ordinary close paragraphs cannot reliably be parsed into positions. Paid cards are absent: each buyer receives a separate draw.
- Complete original email as **plain text**, including subject, paragraphs, sign-off, and P.S. Markdown links retain visible wording; HTML/script content is not passed through. Render as text, never as trusted HTML.
- Optional question-specific `bookingCopy` from the same builder config.
- Source path and source SHA-256 in the JSON envelope for review/debugging.

The email Markdown remains editable in `letters-02/`; metadata does not rewrite the email or change generated email HTML. Generated `editions.json` should not be edited directly.

## Included fixtures

| Edition ID | Version | Face up / buyer drawn | Purpose |
| --- | --- | --- | --- |
| `healing-v1` | 1 | 2 / 4 | Preserve the existing local healing route |
| `commitment-v1` | 1 | 2 / 4 | Preserve the existing local commitment route |
| `quiet-v1` | 1 | 3 / 3 | Exercise a different visible-card count |
| `higher-calling-v1` | 1 | 2 / 4 | Historical draft, version-continuity fixture |
| `higher-calling-v2` | 2 | 2 / 4 | Same topic slug, revised email and labels |

These historical drafts are **not approved for live publication**. The envelope explicitly says `local-fixture-only`; `status: published` merely lets the local demo route to them. Review the original drafts before any real publication. The older copy has statements that do not represent the current writing guidance.

## Adding a future edition

1. Write the email using [SHAPE.md](SHAPE.md), with its question/spread/card config in `LETTERS`.
2. Add its local export metadata to `LOCAL_FUNNEL_EDITIONS` in the builder: stable `id`, positive `version`, an explicit `theme`, spread metadata, and one `paid_labels` entry per hidden position. Add `booking_copy` when ready. A new version of a topic keeps its topic `slug` but gets a new unique edition ID/version.
3. Run the exporter and its checks. Fixed card headings/art and counts must agree; invalid configs fail before writing.
4. Open `/email?edition=<id>` and `/booking?edition=<id>` in the local app and verify the question, spread, fixed cards, and hidden labels match.

Before live implementation, lock approved versions in persistent storage and bind the real email CTA to that immutable edition. Regenerating this local fixture is not a substitute for a production publication/version-lock process, and it must not silently replace a version that has already been sent or purchased.
