# 08 Marcus — how the four post-purchase emails go out through AWeber

Decided 2026-09-13 (Joel): **D4 = AWeber, on a new list for Marcus buyers.** Marcus will run many
reading offers (blind spots today, soulmate in two days). One list, tags for the offer and the edition,
custom fields for the per-order words. The four emails never change per reading; the fields do.

Amended 2026-09-15 (Joel): **Resend is the backup path when the AWeber write fails.** AWeber stays primary; if the AWeber write/trigger fails for an order, the send helper (`server/lib/beMail.ts`, T10) sends the same email through Resend's transactional API instead and records the attempt in `be_send_attempts` with `provider: 'resend'`. The four HTML/TXT files in this folder are reused as the Resend bodies, with merge fields filled server-side instead of by AWeber's Liquid tags. n8n only needs its existing `POST /api/be/:offer/delivered` call; it may also call Resend directly as a last resort if the app itself is unreachable.

## FOR DEV — AWeber setup (Joel, 2026-09-13: "my dev will do these tasks")

Status: **waiting on Joel's review of the four emails first.** Do not paste anything into AWeber until
the copy is signed off.

- [ ] Create the list `Marcus Stone — buyers`; put its id in `AWEBER_MARCUS_BUYERS_LIST_ID`.
- [ ] Create the nine custom fields in the table below, names exact (`m8_question` … `m8_edition`).
- [ ] Create four campaigns, one per trigger tag (`be-08`, `be-08-audio`, `be-08-delivered`,
      `be-08-audio-delivered`). Paste each `.html` and `.txt` from this folder; each file's first
      lines say which campaign and tag it belongs to.
- [x] Support address is `hi@theseerwithin.com` (Joel, 2026-09-13) — already in all eight files.
- [ ] Test send to an internal inbox: confirm every `{{ subscriber.custom_field['m8_*'] }}` renders
      and the `{% if 'be-08-audio' in subscriber.tags %}` line shows only with the tag.
- [ ] **Launch gate:** two purchases by one test subscriber ten minutes apart — both confirmation
      emails must arrive with the right question. If remove-then-add of the trigger tag does not
      re-fire, use the per-order broadcast fallback (see below).
- [ ] Update `server/lib/backendCustomerList.ts` `marcus-reading` row with the new list id and the
      label tags (`be-08-speed`, `m8-ed-*`, `m8-topic-*`).

## One list

`Marcus Stone — buyers` (new; id goes in `AWEBER_MARCUS_BUYERS_LIST_ID`). Nobody joins it except by
paying. It is not the daily-letter list. The daily-letter lists stay as they are.

## Tags

Two kinds. **Trigger tags** start a campaign the moment they are added. **Label tags** never trigger
anything; they exist so a later broadcast or a report can pick people out.

| Tag | Kind | Added when | Starts |
|---|---|---|---|
| `be-08` | trigger | main payment verified (webhook) | Email 1 · order confirmation |
| `be-08-audio` | trigger | audio one-click charge verified | Email 2 · audio confirmation |
| `be-08-delivered` | trigger | approved PDF stored, signed link made | Email 3 · written delivery |
| `be-08-audio-delivered` | trigger | audio file stored, link made | Email 4 · audio delivery |
| `be-08-speed` | label | bump bought | — |
| `m8-ed-<edition-id>` (e.g. `m8-ed-blind-spots-v1`) | label | main payment | — |
| `m8-topic-<slug>` (e.g. `m8-topic-blind-spots`) | label | main payment | — |

The `be-08-*` names are the ones already reserved in `server/lib/backendCustomerList.ts` for the
`marcus-reading` offer (wave 1, T3). The `m8-*` labels are new and are what makes "one list, many
readings" work: a soulmate-reading broadcast later goes to `m8-topic-soulmate`, or to everyone on the
list *except* `m8-ed-soulmate-v1`.

## Custom fields (per subscriber; the latest order overwrites)

AWeber fields are per subscriber, not per order. The send helper writes them **immediately before**
adding the trigger tag, every time, so the campaign renders that order's words.

| Field | Example | Used by |
|---|---|---|
| `m8_question` | What are my blind spots? | subjects, all four |
| `m8_spread` | Tree of Life | 1, 3 |
| `m8_paid_count` | seven | 1, 3 |
| `m8_hours` | 24 or 12 | 1, 2 |
| `m8_due_local` | 9:40 tomorrow morning | 1 |
| `m8_reading_url` | https://… (signed, 60 days — D6) | 3 |
| `m8_audio_url` | https://… (signed, 60 days) — a direct download of the audio file (D3) | 4 |
| `m8_order_id` | short opaque id | support, dedupe |
| `m8_edition` | blind-spots-v1 | support |

Merge syntax in the AWeber HTML is Liquid, the form AWeber documents today and the form every live
Evelyn send in this repo already uses for the first name: `{{ subscriber.custom_field['m8_question'] }}`;
her first name `{{ subscriber.first_name | default: "friend" }}` (246 live uses of Liquid first-name
filters in the repo; the older `{!custom …}` form appears in no current AWeber doc and is not used). `m8_paid_count` is written as the word, capitalised where it opens a sentence
("Seven cards, inside 24 hours.") — the builder note from COLD-READ-04.

## The mapping from our email files

| File (passed cold read) | AWeber campaign | Trigger tag |
|---|---|---|
| `ORDER-CONFIRMATION.md` | 08 · Order confirmation | `be-08` |
| `AUDIO-ORDER-CONFIRMATION.md` | 08 · Audio confirmation | `be-08-audio` |
| `WRITTEN-DELIVERY.md` | 08 · Reading ready | `be-08-delivered` |
| `AUDIO-DELIVERY.md` | 08 · Audio ready | `be-08-audio-delivered` |

The `IF AUDIO_PURCHASED` line in the written delivery becomes an AWeber conditional on the
`be-08-audio` tag (or, if the account can't do tag conditionals in a campaign message, two campaign
messages on a segment — the build agent checks which the account supports and says so).

## The repeat-buyer problem, and the rule

An AWeber campaign fires when a tag is **added**. If she already carries `be-08` from her blind-spots
order and buys the soulmate reading two days later, adding `be-08` again may do nothing.

**Rule for the send helper, per event:** write the custom fields → **remove** the trigger tag if present
→ add the trigger tag. Same for delivery tags. This is the 02 pattern's `update_existing` write plus
one DELETE.

⛔ **Launch-gate test (not yet run):** on the new list, one test subscriber, two purchases ten minutes
apart; both confirmation emails must arrive with the right question in each. If remove-then-add does
not re-fire, the fallback is a one-subscriber broadcast per order through the existing
`aweber-broadcast.cjs` tooling, which is heavier but certain.

**Overlap race:** if she buys reading B before reading A's PDF is delivered, A's delivery email would
render B's question. Fields are written seconds before the trigger, so the window is seconds, but it
is real. The helper must serialise events per subscriber (one at a time, in order) and never pre-write
fields for a later order.

## What this changes elsewhere

- `server/lib/backendCustomerList.ts` `marcus-reading` row: `initialListId` becomes the new list's id
  (T3 copied 02's ids as a placeholder). Add the label tags.
- The four `/internal/marcus08/*` delivery operations (T5) call the send helper; no Resend.
- `be_send_attempts` (T3) still records each tag write with the AWeber response, so a webhook retry
  cannot double-fire.
- The thank-you page's "your receipt comes by email" line (COLD-READ-PAGES-01 #11) becomes true: the
  receipt is Email 1.
