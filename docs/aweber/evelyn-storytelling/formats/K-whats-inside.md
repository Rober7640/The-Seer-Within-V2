# K · What's Inside

**Status:** 🧪 STRESS TEST BUILT — `08-real-or-waiting` drafted 2026-10-08 with NO scarcity (nothing in the chat is limited); Read + Chat pending
**In one line:** "Here's why this is so valuable:" + numbered curiosity bullets about what she'll get in the chat → two ways to start.
**Source:** Furey, *Tao of Email Copywriting*, PDF p.48 — "98 Left for Those Who Act FAST" (selling his newsletter with **scarcity + curiosity**): five numbered bullets that each dangle a reveal ("You learn about an insidious food that we've heard called a 'vegetable.' It's not."), then *"Two ways to get the job done: 1… or 2…"* ("Give 'em Options", p.50).

## Shape for Evelyn (≈300–450 words)
Short hook → "When you sit down with me, here's what we look at:" → 3–5 bullets, each a specific curiosity about HER reading → two ways in (e.g. ask one question now / a full reading) → button.

## Rules
- ⛔ **Scarcity must be real.** No "only 98 left" unless something is genuinely limited. No fake deadlines.
- Bullets must describe what the chat really does — chat-test them.
- Best as an occasional "direct" email, not a daily one.

## Stress test result

Email: [`../emails/08-real-or-waiting.md`](../emails/08-real-or-waiting.md) — *is it real, or are you just waiting?* Free takeaway first: two mirrored lists, **Signs it's real / Signs you're waiting** (4 lines each). Then "what really happens when you bring me a love question": 5 numbered curiosity bullets (how you asked · his name, hard or soft ending · what he wants and what's sitting on top of it · the block · one card, seven face down, only one) → **Two doors** (one question / the whole story — "Both doors open the same chat with me"). 415 words (build count; ~407 real), 36/64. Draft only: no short link, nothing on S3, not sent. Built 2026-10-08.

| Test | Result |
|---|---|
| **Read** | ⏳ Pending — operator's verdict. (Writer's view: the lists carry the free value, so it doesn't read as a pure ad. But it is pitch-heavy by nature, 36/64 — Furey's bullets ARE the sell. Keep it an occasional "direct" email, never two in a row) |
| **Truth** | ✅ Every bullet traced to a rule in Evelyn's LIVE prompt (experiment `persona_prompt_evelyn_2026`, variant B at weight 100) or the production code, quoted in the email's `## Sources`. The card checked end to end: the prompt carries `[CARD_DRAW_TOOL]` → the engine adds the `[TAROT_DRAW]` mechanics (`chatEngine.ts` 636–644) → the picker shows **7** face-down Major Arcana, one pick (`ChatServicePage.tsx` `drawCards(7)`, `TarotCardDraw.tsx`), on `origin/Production` 3de8ee7. Limits respected in the wording: the card comes last, only after a reading lands and only if she wants to go deeper ("at the end… if you want to go deeper"), one per session ("There's a reason I won't let you pull a second" = the prompt's "the deck spoke once"); the name/him bullets need a named person, so door two covers "no one yet". ⛔ **Scarcity dropped entirely** — Furey's "98 left… first-come first-served" has no honest equal here (minutes aren't limited), so the format runs on curiosity + options only; reason not to wait = a list callback ("'soon'… never gets shorter on its own"). The signs lists are Evelyn's own documented sayings (prompt lines), framed as what she looks for, not facts |
| **Chat** | ⏳ Pending — needs the short link minted. Test lines in the email's Notes. Main risks: (1) "I want a card" as the FIRST message — the prompt reads first and draws later, which could feel like a bait-and-switch; (2) "is it real?" invites a yes/no verdict — she must give reasons from what the reader said, never a comforting yes |
| **Repeatable** | ✅ Yes — and cheap, because the source is the product itself. Each idea below is a section of the live prompt; each pairs with a different substance device: |
| | 1. **What his name says before he says a word** — first sound = how he meets the world, last sound = endings, the count of beats = his rooms, a doubled letter = a pattern that repeats (prompt: HOW A NAME SPEAKS). Device: Ask yourself ("Say it out loud…"). Name the four, withhold the meanings |
| | 2. **What I'll never tell you** — no dates ("by October" is banned), never whether he read your text, never "he'll come back" to keep you coming, never someone working against you (prompt: THE FEELING LAYER, THE TRUE READ, THE HELD BREATH). Device: Myth vs truth. ⚠ The "never a curse" line sits awkwardly beside V1's protection-ritual buyers on the palm/tarot lists — operator call |
| | 3. **Early or late in the month?** — what a birth date says: the season is the ground, early in the month starts things, late finishes them, one number, one feeling (prompt: A BIRTH DATE speaks lightly). Device: One question to carry |
| | 4. **Why I only let you pull one card** — the card comes last, the deck speaks once, a second ask gets a deeper read of the same card (prompt: THE CARD; picker = 7 face down). Device: The one rule |
| | 5. **Something to do tonight** — practices with exact steps, never the same twice: hands on heart, the letter you write and never send, the sentence said out loud once (prompt: CRAFT). Device: 3 things. ⚠ name them, don't teach them (over-teaching) |
| | 6. **No 20 questions** — one question at a time at most, 2–3 turns of asking at most, and "just tell me" stops the asking (prompt: GIVE, THEN ASK). Device: Then vs now (the psychic who fishes / what happens here) |
| | 7. **When you come back** — recognition first, the open thread by name, the picture from last time kept as your shared language (prompt: THE SESSION ARC, THE IMAGE). Device: The timeline. ⚠ chat-test that memory really carries across sessions before writing it |
| **Effort** | **Low: ~1.25 h** from brief to preview — ~25 min reading the live prompt + production code to verify each bullet (the card count needed the client code, not the prompt), ~30 min writing, ~5 min sketch (`codex exec`, 1 try), ~15 min build + screenshot checks. No outside research. The ongoing cost: the prompt is live config, so **every K email must be re-verified against the running variant the day it's built** — a bullet that was true last month can go false without anyone touching the email |

**Method notes for the next K email:**
- **Verify each bullet twice: the running prompt variant (check the experiment weights) AND the production code** for anything she clicks or sees (cards, picker, minutes).
- **Dangle, don't teach.** Name the thing and the question it answers about HER; withhold the meaning (08: "Does it stop hard, or trail off soft? I read those two very differently").
- **No scarcity.** Replace Furey's "98 left" with a true callback. Never "only today", never a fake count.
- **Two doors = two ways to use the ONE chat** — say so in one line, and put the text link after both doors.
- **Never promise the card on arrival or inside the free minutes.** "At the end, if you want to go deeper."
- **Every "him" bullet needs a "no one yet" path** (door two, the Continue Seed).
- **Put the free takeaway first** (the lists, ~55 words in) so the email gives before it sells.
