# 04-S2 — Sales email 2 of 3 · "Two months, not three weeks" (the bird) · Review draft

**Status:** Review draft — not gated, not built, not in AWeber. 2026-10-11.

## Subject options (operator picks one)

- (a) 🕊️ {{ subscriber.first_name | capitalize }}, when did he really start pulling away?
- (b) 🤔 Why hasn't anything you've tried with him worked?
- (c) ⏪ It didn't start three weeks ago
- (d) 📅 {{ subscriber.first_name | capitalize }}, count back two months

**Preheader:** It started about two months ago. That's why nothing has worked, and why the timing matters now.

---

{{ subscriber.first_name | capitalize }},

**He started pulling away about two months ago.**

Not three weeks ago, when it got bad. Two months.

I saw it in the bird, in the tea leaves I read for you. And it explains the thing that's been wearing you down: why nothing you've tried has worked.

It also tells me when to speak to him again. That's your bridge week, and I'll come to it.

### Count back two months

Try this for me. Count back eight weeks from today, and think about what was going on between you then.

Was there a weekend when he felt a little further away? A reply that came back slower, or shorter? A plan he left loose, when he'd normally have pinned it down?

You noticed, and you told yourself he was busy or tired. Then it kept going, and about three weeks ago you couldn't explain it away any more.

That small thing, two months back, is where this began.

### The bird in your cup

I read a cup for you. When the tea was gone, seven shapes were left in the leaves, and I circled each one in red: a bird, a broken heart, a withering tree, a boat, a bridge, a lighthouse and a butterfly.

`[IMG: esl-cup]`

*Seven shapes, circled in red. Mark 1, near the top, is the bird: head up under the rim, tail trailing halfway down the wall. That tail is two months long. Mark 5, the bridge, holds your bridge week.*

The bird is mark 1, across the cup from the handle. The handle stands for you, so the bird is as far from you as the cup allows. That's a man going.

The height of a leaf tells me time. Up under the rim is now. Lower down the wall is longer ago.

Your bird's head is up under the rim, so he's still going now. But under the head, small bits of leaf trail down the wall to about halfway. That's the tail, and halfway down is about two months.

I read a bird from its tail. When a bird takes off, its tail is the last part to leave the branch. So the tail shows where the going started.

### Why nothing you've tried has worked

For three weeks, you've been working on the last three weeks. The text he left unanswered. The evening he was short with you. You've gone over each one, worked out what to say about it, and said it.

It didn't work, and you blamed yourself for the way you handled it.

You didn't handle it badly, dear. You were working on the wrong end of the bird. Whatever started this is two months old, and nothing you say about last week reaches back that far.

And a man in the middle of going hears every message as a tug on his sleeve. Walk toward a bird on the lawn and it only flies further off. Each time you reached for him, you gave him one more reason to keep going.

### Why two months matters

You've asked yourself whether there's someone else. The bird doesn't tell me that, and it isn't the question that decides this. What decides it is how long he's been going, and how much of that you can still get back.

If he'd started going a fortnight ago, I'd tell you to speak to him straight away. If he'd been going for a year, I'd tell you to leave him be. Two months sits in between.

It's set enough that speaking up now lands as pressure. And it's recent enough that the right words, on the right day, still get through.

That right day sits inside your bridge week, the few days out of your next twenty-one when what you say reaches him as an invitation. The days before it are for staying quiet.

### What's in your reading

Your reading is called The Turn. I read where each of your seven leaves sits, and work out from it what your next twenty-one days should look like.

It tells you how long he's been going, and how much of what the two of you had can still be got back. It marks out which days you hold back and which days you reach out. It finds your bridge week, and tells you what goes in the one message for it, what comes out, and which evening it goes. At the end there's a one-page calendar of all twenty-one days, free.

It arrives as a PDF in your inbox within 24 hours. There's nothing for you to send me. The cup has everything I need.

**[Get your reading and find your bridge week.](https://theseerwithin.com/offers/wiccan/tea-reading?c=71&fn={{ subscriber.first_name | url_encode }})**

### Before your bridge week comes

Some evening soon, dear, he'll go cold again, and you'll want to send something to close the gap. That's the message I'd stop. It lands on a man who's still going, and it pushes him further off.

The right message, sent in your bridge week, lands as an invitation instead.

Whether he comes back isn't something I'll promise. What I'll give you is how long he's been going, how much is still there, and the day to speak.

`[BUTTON: Find my bridge week](https://theseerwithin.com/offers/wiccan/tea-reading?c=72&fn={{ subscriber.first_name | url_encode }})`

— Evelyn

P.S. It started about two months ago, {{ subscriber.first_name | capitalize }}, not three weeks. That's why nothing has worked, and why your bridge week matters. **[Get your reading here.](https://theseerwithin.com/offers/wiccan/tea-reading?c=73&fn={{ subscriber.first_name | url_encode }})**

---

## Build notes

- **Angle:** the bird. A reframe she can check against her own memory: he started going about two
  months ago, not three weeks ago. That's why everything she's tried has missed (she's been answering
  the last three weeks, the bird's head, not where it started, the tail), and why timing matters now
  (two months is too set to speak into straight away, recent enough for the right words on the right
  day). The bridge week is the payoff of that logic.
- **Why:** "about two months" is the bird reading in **every** cup (`04-P1-*` build notes: "The bird
  reads two months in every cup"), read from the tail at about halfway down the wall
  (`esl-cup-map.md`). The "wrong end of the bird" and "read it from the tail" ideas are the product's
  own, so a buyer finds them again in the PDF. "The question that decides this isn't whether there's
  someone else. It's how long he's been going, and how much of that is recoverable" is the line every
  reading's "How much is recoverable" section quotes back as "my letter said", so this email makes that
  back-reference true.
- **Self-check moment:** "Count back two months" — eight weeks back, the slower reply, the loose
  plan, the weekend he felt further away, and how she explained it away.
- **Standalone:** re-introduces the cup (photo + all seven in one sentence), the handle and height
  rules, the bridge week, what the reading gives, 24 hours, nothing to send, and both links. No line
  or device from email 1 is reused: email 1's numbered symbol list, "a bridge works both ways" and
  "find the bridge yourself" are absent; the deliverables are prose here, bullets there.
- **Links:** `c=71` text link, `c=72` button, `c=73` P.S. (proposed). ⚠ `71–73` were the old
  abandon-nudge codes (`04-E6`), see the report.
- **Counts and checks (2026-10-11):** body 888 words. "Bridge week" 9×. "dear" 2×. Greps: $ /
  price 0, deadline 0, back-references 0, banned 0, hedges 0, em dashes in prose 0. Shared 6-word
  runs with email 3: only the symbol names.
