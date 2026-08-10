# 03-T3 — Confirmation email + wait-filler *(Judgement Day)*

| | |
|---|---|
| **Sends** | immediately on purchase, from AWeber, triggered by the `be-03-judgement-day` tag. **It sells nothing** |
| **Also** | it is her **second door to the Entry**, for the woman who closed the thank-you page before filling the form (D11 moved the Entry onto a screen after the money). ⚠ It is no longer the intake vehicle itself |
| **Register** | **P5** — her buyer is *angry, across three nights*. 02's is hopeful across 24 hours. Three days earns something longer, and it must do **quiet inoculation** |
| **The inoculation** | *don't spend these nights watching for their downfall* |
| **Component** | [00e §5](../../docs/00e-FRAMEWORK-BEs.md) |

---

**Subject:** Your page is open — now send me the Entry

**Preheader:** The three nights start the moment your Entry reaches me.

---

Dear %FIRSTNAME%,

Thank you for deciding this. It is not a small thing to decide and most women who need it never
get as far as the page.

**Your Entry is the one thing I still need.** Who it is, what they did, how long. Your own words,
any length, no order required — and I can't start the three nights without it.

If you wrote it out on the page just now, it is already with me and there is nothing else to do.

If you closed the page before you got that far, it is still open and waiting for you:
[send me your Entry]({{AWEBER_ENTRY_URL}}).

Once it's in, I'll write to you again the same evening to say the first night is done.

---

### While the nights run, one piece of advice

I want to say something about the next few days, %FIRSTNAME%, and it is the only instruction I'll
give you before your record arrives.

**Don't spend them watching.**

I know the temptation, dear. Something is finally being done, and the natural thing is to go and
look — to check on them, once, just to see whether anything has shifted. To read the messages
again. To find out how they are.

Don't. Not for the three nights.

Here is the reason, and it is craft rather than superstition.

What I am doing is moving a weight off your name. What checking does is put your name back on it —
every time you go and look, you re-enter yourself into an account I am in the middle of closing.
It is like watching someone carry a full glass across a room and asking them a question halfway.

The three nights will do their work whether or not you are watching. But you will make them longer,
and you will make the ninth day less clear, and you will have spent three more evenings in a room
with somebody you are paying me to get out of.

---

### And a story, because three nights is a long time to sit still

`[IMG — optional; a stopped clock, or nothing]`

There was a woman in the village where I learned this work who was owed money.

Not a great sum, but she was not wealthy and it had been a very long time. The man who owed it had
done well since. She used to walk past his house on her way to the market, which was the shortest
way, and she used to look at the roof — because he had put a new roof on it, and she had not been
paid.

She did that for eleven years. New roof, new gate, new car in the road. Every week, twice a week,
on her way to buy vegetables.

When she was old she told me that she worked out something towards the end of it, and that she had
been slow about it.

She said: *I thought I was keeping the account. I was the account.*

Nobody else in that village was tallying anything. The man had almost certainly forgotten. The only
place the debt existed at all was in a woman walking to market, twice a week, adding it up.

She started going the long way round. She said it took four extra minutes and gave her back eleven
years.

That is not a story about forgiveness and I would not insult you by pretending it was. She never
forgave him and she never got her money. What she got back was the walk.

---

If it's any use to you, pass it on. Somebody you know is walking past a roof.

Send me your Entry when you're ready, and then let me carry it for three nights.

— Evelyn

---

## Build notes

- **P5 — the register is matched to anger, not hope.** 02's donkey is warm and resolves upward.
  This one is cooler, older, and its ending is deliberately unsatisfying — *she never forgave him
  and she never got her money*. An uplifting parable sent to a woman who has just written down the
  worst thing anybody did to her reads as a person who wasn't listening.
- **The wait-filler IS the inoculation**, which is why it earns three days' length. *I thought I was
  keeping the account. I was the account* restates the brief's big idea in a form she can carry
  around, and it argues for the don't-watch instruction without repeating it.
- ⚠ **The don't-watch instruction is the highest-value paragraph in the whole offer.** It prevents
  the single most likely failure mode — she checks on them during the wait, finds them thriving,
  and decides the working failed before it has been delivered. It is argued from craft (*re-entering
  yourself into an account I'm closing*), never from ethics, per the letter's own precedent.
- **The share ask is present but quiet** — *"somebody you know is walking past a roof"* — and it is
  the engagement rung 02's donkey also carries. Same job, entirely different story: ⚠ 02 and 03 must
  never share a parable, and a buyer who takes both will read both.
- ⚠ **REWRITTEN 2026-08-09 — this email is no longer the intake vehicle.** D11 moved the Entry to
  a form on the thank-you page, *after* the money, so by the time this arrives she has already been
  shown it. Telling her to "reply to this email" would have sent her down a second, slower intake
  path that nothing is built to read. It is now her **second door**: it confirms the Entry if she
  filled it and links her back to it if she did not. The ask still appears in the third line, before
  the advice and the story, so a woman who reads nothing else still knows what to do.
- ⛔ **`{{AWEBER_ENTRY_URL}}` is a placeholder, not syntax.** The link is the `entry_url` custom
  field on her subscriber record (written by `addBackendCustomer`). Insert it from AWeber's own
  personalization picker when you build the Campaign, then seed-test that it resolves — a token
  that ships unswapped is read by the buyer as gibberish at the exact moment she is deciding
  whether this was real.
- ⚠ **No SLA restated as a delivery date** beyond "the three nights", and no price — she has already
  paid, and naming what she paid on a page about a debt is the one tonal mistake this email could
  make.
