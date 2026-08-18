# SCOPE — carry the tarot card identity into the deeper chat (`/fb-tarot`)

**Status: ⬜ SCOPED, not built. No code written.** Scoped 2026-08-19.

## The problem

Version B's beat 4 ends every lander on a **named** open loop — "Let me look closer at what's holding
his hand back…", "…at what he feels and hasn't found words for…". She then gives her name, and Evelyn
opens the next phase knowing **nothing about the card**. The loop is opened on the lander and dropped
one screen later.

The deeper flow reads only `userData.bucket`. Every tarot reference in `server/lib/prompts.ts` sits
inside the Version-C `buildTarotReflectPrompt` path, which no visitor reaches any more (`/fb-tarot/c`
302s to `/b`). `buildReading1Prompt` and friends take `(userData, concern)` and never see deck, hook or
card.

## This is a decision, not a bug — and that is why it needs revisiting rather than fixing

`client/src/hooks/useConversation.ts:738-744` says so outright:

> Tarot "decode-him card" bridge traffic: same skip-the-bucket-picker shape as palm (love inferred
> from the hook), but **the card identity already lives in the opener**, so the deeper flow stays the
> GENERIC engine — no palm-style identity is written to userData.

That reasoning held when the opener was a short static reveal and Version C's LLM did the weaving.
Two things changed underneath it:

1. **Every visitor now gets Version B, whose OPENER is pre-written.** ⚠️ Corrected 2026-08-19 (operator):
   "B makes no model call" is true of the *reveal*, not the session. STATUS.md scopes it to `openerB`
   ("sends the whole static read then goes straight to name capture"). The scripted run ends at email
   capture; the first model call is `reading1` (`useConversation.ts:632`) and ten more follow
   (reading2 · futureValidation · crisisReveal · crisisCost · crisisUrgency · objection ·
   shadowSummary · valueExplain).

   The card is therefore dropped exactly at that boundary: every message before it knows the card
   because the card is hard-coded into it, and all eleven model calls after it receive `userData` with
   no tarot field on it. That is what makes this worth doing — there is a live model on the far side of
   the loop, with somewhere for the identity to land.
2. **The readability rewrite makes beat 4 more specific, not less.** The old beat 4 was a vague "let me
   look closer at what he hasn't found the words for". The rewrite names the thread. A sharper promise
   makes the silence that follows more noticeable, not less.

## The fix is cheap because palm already paid for it

The identical problem on `/fb-palm` was diagnosed in `04-fb-palm-derail-PROVEN.md §3` and **that fix
has shipped**: `palmDirective()` (`prompts.ts:385`) returns `''` unless both palm fields are set, and
is appended in five shared builders. Non-palm funnels stay byte-identical. Copy the shape.

| # | File | Change |
|---|---|---|
| 1 | `shared/types.ts` | + `tarotMark?`, `tarotReading?`, `tarotAsked?`, `tarotTendency?` on `UserData`. (`tarotDeck/Hook/Card` already exist on `ChatRequest` — they just never reach `UserData`.) |
| 2 | `client/src/hooks/useConversation.ts:744` | Write them at name-capture from `DECKS[deck].mark[card]`, `.reading[card]` and `HEADLINES[hook]`, exactly as the palm branch does at :696. Replace the comment above it with the reasoning that replaced it. |
| 3 | `server/lib/prompts.ts` | + `tarotDirective(userData)` beside `palmDirective`, same guard-clause shape, appended at the same five call sites (403 / 462 / 497 / 542 / 606). |
| 4 | `tests/` | New guards: the fields are set for tarot and **absent for every other funnel**; the directive is empty without them (so root/fb/fb2/gdn prompts stay byte-identical); the mark matches the card actually drawn, keyed on card identity not panel letter. |

Effort: one type edit, one client edit, one prompt function, five one-line insertions, one test file.

## 🔴 The one place it must NOT copy palm

Palm reads **her** — her own hand, her own future. Tarot on this funnel reads **a real man**, and the
entire compliance model is *tendency, never verdict*: never state he is lying, cheating, faithful or
returning as fact (`fb-tarot/docs/PRD-tarot-bridge.md`).

Handing the LLM a card plus a question about a specific man, with no ban attached, invites exactly the
verdict every static read is written to avoid — and it would appear in the *unscripted* half of the
funnel, where no copy guard can see it.

So `tarotDirective` must carry the hook's ban with the identity. `TAROT_HOOK_TENDENCY`
(`prompts.ts:1175`) already holds it per hook, written for precisely this purpose; thread that string
rather than inventing new prompt language. This is the difference between the palm fix and this one,
and it is the part to get right.

## How to prove it before it ships

This changes LLM prompts on the funnel's highest-traffic surface, so it does not ship on inspection.

1. **`v1-funnel-eval`** — the sibling skill built for exactly this: scores reading quality before/after
   a prompt change against a frozen rubric and returns a better-or-not verdict. No server, no DB.
2. **`audit-flow.mjs`** in the sandbox — confirms the deeper flow still reaches the pitch and that no
   dead air or empty bubble appeared.
3. **A verdict-leak check** — the new eval cases must include "does Evelyn now state something about
   him as fact?", because that is the risk this change introduces and the existing rubric was written
   before the risk existed.
4. Ship behind the existing experiment framework if the eval is close rather than clear; the A/B
   machinery and `/admin/experiments` are already in place.

## Recommendation

Worth doing, **after** the copy migration — not alongside it. Two reasons to keep them apart: the copy
work is reviewable by reading it, whereas this needs an eval run to judge; and if both land together
and conversion moves, nothing tells you which one moved it.
