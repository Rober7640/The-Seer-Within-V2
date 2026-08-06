# 04-E1 — Subject-line bank *(The Turn)*

Same rules as [`02-E1`](../02/02-E1-subject-lines.md): one emoji at the front · `%FIRSTNAME%`
second, building to `{{ subscriber.first_name | capitalize }}` · curiosity not reveal · under
120 bytes measured **with the tag expanded** · no fallback filter · preheader continues rather
than repeats.

The source ships **one** subject (*"Here's what tea had to say about your future"*), which is
nameless, vague and gives away that this is a tea reading before she has any reason to care.

⚠ **04 needs the most subjects in the deck** — one for the letter, two nudges, and **three ladder
emails on consecutive days**. Six sends to the same woman inside five days, so repetition is the
risk, not weak curiosity. The ladder subjects below are deliberately plainer than the letter's:
by day two she knows what this is and a fresh hook reads as a fresh pitch.

---

## For `04-E2` — the letter

| # | Subject | Preheader |
|---|---|---|
| **1 ★** | 🍵 %FIRSTNAME%, I read my own cup and it wasn't about me | Seven symbols came up. None of them were mine. |
| 2 | 🍵 %FIRSTNAME%, it's a timing problem, not a wording one | You can spend a year rewording something that needed a different Tuesday. |
| 3 | 📵 %FIRSTNAME%, the message you haven't sent isn't wrong | It's early. There's a difference and it matters enormously. |
| 4 | 🕊️ %FIRSTNAME%, the bird came up first in your cup | He's been going a while. The question isn't the one you think. |
| 5 | 🌉 %FIRSTNAME%, your bridge works in both directions | Build the wrong one and it's the road he leaves by. |
| 6 | 🍵 %FIRSTNAME%, seven symbols, and one bad Tuesday | The leaves are the story. The cup is the calendar. |
| 7 | 🕊️ %FIRSTNAME%, you're not imagining the difference in him | You've just been told often enough that noticing is the problem. |
| 8 | 🍵 %FIRSTNAME%, I have your leaves but I haven't turned the cup | That's a separate reading and it's the one with the dates in it. |

★ = lead. It carries the uninvited act and the misdelivered cup, and it withholds everything.

**Nameless challengers**

- `It's a timing problem, not a wording one`
- `The message you haven't sent isn't wrong. It's early.`

## For `04-E6` — the abandon nudges

| Nudge | Subject | Preheader |
|---|---|---|
| +1h | 🍵 %FIRSTNAME%, your cup's still on the table | Nothing's turned yet. It takes a minute to say yes. |
| +24h | 🍵 %FIRSTNAME%, I think I know where you stopped | And it wasn't the money. About the waiting. |

## For `04-E5a/b/c` — the ladder

⚠ **Every ladder subject must carry the reason, never the number.** A subject that says the price
went up is a squeeze; one that says the cup is drying is craft. The rung itself appears on the
booking page, resolved server-side.

| Day | Subject | Preheader |
|---|---|---|
| 2 | 🍵 %FIRSTNAME%, your leaves have started to lift | Still readable. Just no longer soft. |
| 3 | 🍵 %FIRSTNAME%, the positions are getting harder to hold | I can still work it backwards. It takes me longer now. |
| 4 | 🍵 %FIRSTNAME%, this is the last day your cup reads clean | After tonight I'd rather not promise you the weeks. |

---

## Notes for the build

- **Subject 3 is the strongest in the bank and it is not the lead.** *"The message you haven't
  sent isn't wrong"* is the highest-recognition line in the letter — most of this audience has a
  drafted message in her phone right now — but it gives away the P.S. Run it as the first
  challenger against the lead, and expect it to win on click-through.
- **Emoji set: 🍵 🕊️ 🌉 📵.** Zero overlap with 02 (🔮 ⚡ ⭐ 🌙) and 03 (🕯️ 📖 🌙). Three
  programmes, three inbox signatures. 📵 appears once, on the drafted-message subject, and it is
  the only non-mystical glyph in the deck — which is why it will stand out and why it should stay
  rare.
- ⚠ **Day 4's subject is the only place in the deck that comes close to a deadline**, and it stays
  the right side of it: what expires is the *quality of the reading*, which is a fact about leaves,
  not an arbitrary offer window. Do not let a later pass tighten this into *last chance* or add a
  countdown — the honesty is what makes the ladder work at all (§3a).
- **Send-time:** 6:30pm SGT. ⚠ The ladder emails should hold the same slot on consecutive days so
  the sequence reads as a daily letter rather than as escalating pressure.
