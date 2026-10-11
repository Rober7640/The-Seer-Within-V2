# 04-T3 — Confirmation email + wait-filler *(The Turn)*

| | |
|---|---|
| **Subject** | `Your tea reading is confirmed — The Turn` — transactional and searchable. ⛔ Not the broadcast format |
| **Trigger** | AWeber Campaign, tag applied: `be-04-tea-reading`. Wait: none |
| **List** | `theseerwithin_be_customer` (`AWEBER_BE_CUSTOMER_LIST_ID`) |
| **Purpose** | The receipt, and the wait. Restates **within 24 hours**, names the delivery subject word for word, opens one loop (the bird), and argues against texting him tonight. **Sells nothing** |
| **Supersedes** | the drafted T3 inside `04-T1-T3-follow-through.md` — same bones, timing lines fixed (see build notes) |

---

<!-- BEAT 1 · transactional subject. Deliberately NOT the broadcast format -->

**Subject:** Your tea reading is confirmed — The Turn

**Preheader:** What happens next, and the one thing not to do tonight.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · thanks as HER good judgement -->

Thank you for deciding this. You read your own situation well, and you didn't let it drift. What comes back to you will be counted in days, not fortnights.

<!-- BEAT 3 · the work has started, present tense -->

Your cup's on my table now and I've started.

<!-- BEAT 4 · open ONE loop. P1 pays it off before the sequence begins -->

I'll tell you what I look at first, so you know what's coming. The bird. In my letter I said a bird high on the wall is a fortnight old, and a bird down by the base has been going since before you noticed anything. Those two would have you doing opposite things, and I can only tell which one you've got by where it sits. You'll read that before anything else.

<!-- BEAT 5 · restate the wait + the delivery subject, word for word -->

Your reading will be with you within 24 hours. Watch for an email with this subject line:

> %FIRSTNAME% — your cup is turned

If 24 hours pass and it isn't there, look in your promotions tab, then reply to this email and I'll sort it out.

Nothing's needed from you. Not tonight, and not while you wait.

### Which is the point, actually

<!-- BEAT 6 · P5 — her state is "tempted to act now", so this argues against texting him tonight.
     Placed ABOVE the story so it is read -->

Let me be direct about the wait, %FIRSTNAME%, because I know roughly what it holds.

You've just bought a reading about *when to speak*. Somewhere in the back of your mind, booking it has already loosened something. And a loosened woman at ten at night with her phone in her hand is exactly the woman who sends the message.

**Don't send it tonight.**

Not because it's the wrong message. I haven't read your cup yet, so I don't know. But whatever it is, it'll still be sendable once your reading has arrived, and by then you'll know how long he's been going and which week your message belongs in.

You've waited weeks already. This one's a day at most, and it's the only wait in all of this with an end you can see.

### And something to hold while you wait

<!-- BEAT 7 · the wait-filler. About not speaking yet, without mentioning him once -->

Here's a piece of the practice I like, and it's got nothing to do with your reading.

When I was learning, the woman who taught me made me read forty cups before she'd let me say a word about any of them. Forty. I'd turn the cup, look, write down what I saw and hand her the paper, and she'd put it in a drawer without reading it.

Around the thirtieth I got frustrated enough to ask what the drawer was for.

She said: *"You're not learning to read tea. Anybody can learn that in a fortnight. You're learning to look at something and not say anything about it yet."*

I've thought about that a great deal since, dear, and not only about tea.

Almost everything I've got badly wrong in my life, I got wrong in the gap between noticing something and answering it. And I always made that gap shorter than it needed to be. Not because I was stupid. Because noticing was uncomfortable, and saying something was how I made the discomfort stop.

She was a difficult woman, and she never once told me I'd done well at anything. I miss her enormously.

<!-- BEAT 8 · quiet share ask, then sign-off. No CTA, no next offer -->

If it's any use, pass it on. Most people know somebody who could use a drawer.

Your cup's on the table. You'll hear from me when it's turned.

— Evelyn

## Build notes

- **Built from the drafted T3** in `04-T1-T3-follow-through.md`. Kept: the thanks, *"Don't send it tonight"* (still above the story, so it is read), the forty-cups drawer, the difficult teacher she misses, the share ask. That file's T3 is now superseded by this one; its thank-you page (T1) was not touched.
- **Timing lines fixed** — delivery is automated, inside 24 hours, usually around 12. Removed: *"I'm starting tonight"* (a 9am buyer would read her reading arrive before "tonight"), *"Not tonight and not tomorrow"*, *"sendable on Thursday … by Thursday"* (a weekday breaks for six buyers in seven), *"the only one with a date on the end of it"*, and *"I'll write in the morning"*. In their place: *"on my table now and I've started"* (the work, present tense), *"within 24 hours"* twice, *"once your reading has arrived"*, *"a day at most"*, and *"you'll hear from me when it's turned"*. Nothing here says when she gets it except "within 24 hours".
- **Subject is a receipt, not a hook.** She is expecting it, and support will ask her to find it weeks later. *"tea reading"*, *"confirmed"* and *"The Turn"* are the three words she might search for. Do not "improve" it into the emoji/first-name format.
- **The delivery subject is named word for word, in its own box**, so she can search for it. It must match `04-T1` and `04-T4` exactly. ⚠ For a buyer with no first name, the box renders *"dear — your cup is turned"* (the renderer's mid-sentence fallback). The `04-T4` subject in AWeber should use the same `"dear"` fallback, or the two won't match for her.
- **One loop, the bird.** It is the letter's open question (`04-E2` beat 12: *"Position can … I'll tell you which one you're in"*) and P1 answers it first, before the twenty-one days. *"How much of that is recoverable"* is NOT promised here — `0-WORKFLOW-04` notes P1 never answers it. *"Which week your message belongs in"* rides along inside the don't-send paragraph because P1's bridge closes it.
- **The thanks is her judgement** (*"you read your own situation well, and you didn't let it drift"*), not our luck. *"Your leaves were still soft when you booked"* was cut (2026-10-11): it went to every buyer, including a day-4 buyer whose leaves the ladder emails told her had dried, and the readings no longer open on it either. *"Counted in days, not fortnights"* stays — every reading gives exact days.
- **The drawer story lost one line.** *"Handing it over stops the feeling. It doesn't improve the outcome."* was a balanced two-line saying, which Evelyn's voice rules ban. The paragraph before it now carries the point in her own life (*"saying something was how I made the discomfort stop"*), so nothing is lost. *"The gap is always shorter than it needs to be"* became *"I always made that gap shorter"* for the same reason: a memory, not a rule.
- **The `[IMG — a cup mid-pour, or nothing]` slot was dropped.** It was marked optional, the renderer would drop it anyway, and no image is hosted.
- **No Still Cup mention.** This goes to every buyer; naming the bump here would sell it to the ones who didn't take it. Bump buyers get `04-T5`.
- **`%FIRSTNAME%` × 3** — salutation (`"friend"` fallback), the subject-line box, and the don't-send paragraph (`"dear"` fallback).
