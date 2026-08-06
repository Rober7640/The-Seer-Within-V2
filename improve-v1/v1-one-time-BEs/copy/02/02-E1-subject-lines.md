# 02-E1 — Subject-line bank *(Twin Flame Tarot)*

**The format is not the source's.** 02 ships seven quiet, literary, name-at-the-end subjects.
Our own AWeber data says that shape opens at ~22% on this list, and **emoji + first-name FIRST +
curiosity** opens at 30–40%. [00e §2](../../docs/00e-FRAMEWORK-BEs.md) already overrides the
source here; this bank follows our data.

**Rules applied**
- One emoji, at the front. Never two, never mid-line.
- `%FIRSTNAME%` is the second element, always. **On AWeber it builds to
  `{{ subscriber.first_name | capitalize }}`** — the Liquid form every live scheduled send uses,
  not the legacy `{!firstname_fix}`.
- Curiosity, never the reveal. If the subject answers itself there's no reason to open.
- Under 120 bytes hard cap, **counted with the tag expanded, not the token**. The real tag is 38
  bytes against `%FIRSTNAME%`'s 11, so a subject that looks short in this file can still overflow.
  All 18 below were measured expanded and clear it: longest is 85 bytes, so there is ~35 bytes of
  headroom. Re-measure any subject added later.
- ⚠ **No fallback filter**, matching live. A subscriber with no first name on record renders the
  tag empty and the subject opens on a bare comma. The live programme already carries this
  exposure; don't invent a different convention here without changing it there too.
- **No deadline language.** Not in a subject line either.
- Preheader continues the subject, never repeats it — in Gmail it's the second line of copy.

---

## For `02-E2` — the first letter

| # | Subject | Preheader |
|---|---|---|
| **1 ★** | 🔮 %FIRSTNAME%, three cards came out on their own | I was putting the deck away when it happened. |
| 2 | 🔮 %FIRSTNAME%, I drew three cards for you last night | Nobody asked me to. That's rather the point. |
| 3 | 🕯️ %FIRSTNAME%, two good cards and one I don't like | Take the first two. Then read the third twice. |
| 4 | ⚡ %FIRSTNAME%, the Tower doesn't arrive as an event | It arrives as a person. Usually one already here. |
| 5 | 🌙 %FIRSTNAME%, a quarter of an answer isn't an answer | Three cards tell you the weather. Twelve tell you the day. |
| 6 | 🕯️ %FIRSTNAME%, I don't do this one at a time | What I write most days is for everybody. This isn't. |
| 7 | 🔮 %FIRSTNAME%, read the third one twice | The first two are luck. The third is a warning. |
| 8 | 🔮 %FIRSTNAME%, your three cards are on the cloth | And one of them is holding up the other two. |

★ = lead. It carries the uninvited act, which is the whole engine of the letter, and it withholds
what the cards were.

**Nameless challengers** — the source's own pattern, kept so we can prove the override rather
than assume it. Run at most one per send against the lead.

- `Two good cards and one that isn't`
- `The third card is the one to read twice`

## For `02-E3` — the second letter

The word **MORE** does the work in the headline; at least one subject should carry it too.

| # | Subject | Preheader |
|---|---|---|
| **1 ★** | 🌙 %FIRSTNAME%, I drew three MORE cards for you | A different three. One of them is already running. |
| 2 | 🌙 %FIRSTNAME%, you've been reading him in the dark | Moonlight is the one light you must never trust. |
| 3 | 🌙 %FIRSTNAME%, half of what you know is moonlight | Your mind fills in what your eyes can't see. |
| 4 | ⭐ %FIRSTNAME%, the sky above the wreckage is yours | The Star is painted to arrive after the disaster. |
| 5 | 🌙 %FIRSTNAME%, you're answering things he didn't say | And he's receiving answers to things he didn't say. |
| 6 | 🔮 %FIRSTNAME%, three new cards, and one won't wait | Not coming. Running. |

## For `02-E6` — the abandon nudges

| Nudge | Subject | Preheader |
|---|---|---|
| +1h | 🕯️ %FIRSTNAME%, you stopped at the door | Your twelve are still face-down on the cloth. |
| +1h alt | 🔮 %FIRSTNAME%, they're still face-down | Nothing's been laid yet. It only takes your say-so. |
| +24h | ⚡ %FIRSTNAME%, one more word about the Tower | Then I'll leave it alone, I promise. |
| +24h alt | 🌙 %FIRSTNAME%, I'll ask once more and then stop | There's something I didn't mention that comes with it. |

---

## Notes for the build

- **Send-time:** the list's proven slot is 6:30pm SGT. Nothing here argues for moving it.
- **Test one variable.** Subject and preheader travel together — swap the pair, not the halves,
  or the read is worthless.
- The list's opens have roughly halved (~38%→~19%) and CTOR collapsed ~5×. That's fatigue and
  content, not the subject format, so don't read a soft open rate here as a reason to abandon
  the emoji + name-first shape that our own data proved.
- ⚠ Deliverability: this letter goes to a warm list that has not been sold to this hard in a
  while. Segment the first send to the most-engaged slice, watch complaints, then widen.
