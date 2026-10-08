# M · Guest Voice

**Status:** ❌ DROPPED (operator 2026-10-08: "very confusing") — tested with email 10 (Marcus).
**In one line:** Evelyn hands the email to someone else for a day (introduced by her), who tells their side → back to Evelyn's offer.
**Source:** Furey, *Tao of Email Copywriting*, PDF p.56 — "Honey, My Wife Took Over My Business" (Tammi writes to Tim's list). Furey's fix: don't let the guest "sneak in" — the host introduces her: *"Today I thought you'd like to hear her side of the story, so I'm passing the baton to her right now."*

## For Evelyn
- The obvious guests are the other Seer Within personas (Marcus — tarot; Luna — astrology): a cross-introduction ("Marcus reads the cards differently from me…").
- ⚠ The guest must be a persona the reader can actually chat with, and the email must still drive to a real chat link.

## Stress-test questions
1. Does the list want to hear from anyone but Evelyn?
2. Does cross-selling Marcus/Luna help V2 or split attention?

## Stress test result

Email: `../emails/10-marcus-lovers.md` — Evelyn opens on "Will he choose me?", introduces **Marcus Stone** (live V2 tarot reader, `/marcus`) and passes him the baton in Furey's words; Marcus writes the middle: the Lovers card **then vs now** (Jean Dodal's Marseille "L'Amoureux", c.1701–15 → Pamela Colman Smith's 1909 "The Lovers", plus Waite's "The old meanings fall to pieces of necessity with the old pictures") → his shadow-work question **"Where am I looking?"**; Evelyn closes with a Candor pitch. 488 words, 72/28 · Evelyn 246 / Marcus 242. Picture: Marcus's real persona avatar (`uploads/avatars/hi-def/marcus.png`, live at https://www.theseerwithin.com/uploads/avatars/hi-def/marcus.png). Draft only: no short link, nothing on S3, not sent.

| Test | Result |
|---|---|
| **Read** | ⏳ Pending — operator |
| **Truth** | ✅ Every line sourced without bending. Card facts come from the two public-domain cards themselves (looked at, eyes and hands checked) + Waite's own text (Wikisource, proofread) + V&A for 1909. The **guest is the hard part**: his "facts" are persona canon only — what the live site (`/api/personas/marcus-stone`) and his prompt say (tarot, 15 years, shadow work, one question then the cards, blunt, "The cards are mirrors."). No backstory, clients, or quotes invented; the site's `readingsCount: 5847` was left out (its own stats say 306). "15 years" is canon like Evelyn's 22 — operator to say if a guest's tenure should go |
| **Chat** | ⏳ Pending — needs the short link minted (persona `evelyn-cross`). Test lines in the email's Notes; the new risk to watch is Evelyn claiming Marcus's words, pretending to be him, or not knowing who he is (her live prompt never mentions him — only the reading brief does) |
| **Repeatable** | ✅ Yes — all six personas are live (`/api/personas`, 2026-10-08). Five more, each a real hook in the guest's own field: (1) **Luna Voss** on Venus retrograde, which runs **3 Oct – 13 Nov 2026** (tropical; Cafe Astrology / Jessica Davidson) — "why the ex texts now"; (2) **Marcus** again on the Death card: Waite 1910 — "for a maid, failure of marriage projects" — vs. how readers take it now (an ending that makes room); (3) **Aiden Powers** on 11/11 — a portal date he can actually compute for her (his signup gives 10 free minutes, not 3 — word the minutes line for the destination); (4) **Maren Soleil** on "will he come back?" — the question her prompt says she gets most — through her "soulmate or karmic?" lens; (5) **Nova Sharma** on Karva Chauth, the North Indian fast wives keep for their husbands' long life (date to verify — late Oct / early Nov). Also the reverse: Evelyn as the guest on another persona's list |
| **Effort** | ~2 hours for the first: the topic research is ordinary (~1 h: Waite text, two card scans, V&A), the guest facts take 15 min from the site API + prompt, and the one-off code check of the short-link system took the rest. Later guests: ~1–1.5 h |

**Stress-test questions — answers so far:**
1. **Does the list want to hear from anyone but Evelyn?** Unknown until it sends — compare opens/clicks/chats per 1k against Evelyn-only sends in the sends log. Built to lose little if the answer is no: the subject is about HER ("Waiting for him to choose you?"), not about the guest; Evelyn writes half the words, opens, and closes; every link goes to her. The challenger subject ("{name}, a man's answer to 'will he choose me?'") is the one that tests whether a new voice itself pulls opens.
2. **Does cross-selling Marcus help V2 or split attention?** In this build there is no cross-sell, so nothing splits: Marcus is a *voice* (Furey's "higher authority", p.55), Evelyn is the *door*. A real cross-sell is not ready: (a) the `/e/` short link only knows Evelyn — a `marcus-stone` code bounces to `/personas` (`server/routes/emailLinkRedirect.ts`); the mint script hard-codes `evelyn-cross`; the `/marcus` lander shows a static opener and ignores the email (the Continue Seed lookup is Evelyn-only) — the chat-side brief is already persona-generic, so three small changes would fix it (listed in the email's Notes); (b) Marcus's live chat prompt is the old 2.7k-char seed, without Evelyn's no-promise hardening; (c) a different "Marcus Stone" face (`marcus/08/08-headshot.jpg`, looks like a real photo) already sells a $35 written reading to list 6960130 in the V1 "08 Marcus" daily letters — if that list overlaps Evelyn's, readers meet two Marcuses. Recommendation: keep guests as voices that hand back to Evelyn until (a)–(c) are settled; then test one guest email whose CTA goes to the guest.

**Verdict (provisional):** 🔧 keep with changes — the shape works and stays true; rule for every guest email: host opens, introduces with site/prompt facts only, passes the baton by name, takes it back and closes; CTA to Evelyn unless the guest's short link is wired.

## Verdict (operator, 2026-10-08): ❌ drop — "very confusing"
Why it failed in email 10: two voices in one email (Evelyn → Marcus → Evelyn) make the reader track who's talking; the CTA goes to Evelyn's chat while Marcus made the case (the /e/ short links only support evelyn-cross); and this list signed up for Evelyn, so a guest reads like an ad for someone else. Furey himself warned it can "feel insincere" by email (p.56).
Keep instead: the **Higher authority** device (`devices.md`) — Evelyn quotes another voice in a line or two, in HER email, her CTA.
