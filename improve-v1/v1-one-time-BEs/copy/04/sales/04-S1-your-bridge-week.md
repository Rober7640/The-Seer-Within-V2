# 04-S1 — Sales email 1 of 3 · "Your bridge week" · Review draft

**Status:** Review draft — not gated, not built, not in AWeber. 2026-10-11.

## Subject options (operator picks one)

- (a) 🌉 {{ subscriber.first_name | capitalize }}, your bridge week is coming
- (b) 😶 Why does everything you say to him land wrong?
- (c) 🔮 {{ subscriber.first_name | capitalize }}, I saw the week to speak to him
- (d) 🤐 Before you text him again, read this

**Preheader:** For a few days in your next three weeks, what you say lands as an invitation, not pressure.

---

{{ subscriber.first_name | capitalize }},

**I saw your bridge week in the tea leaves.**

It's coming. Somewhere in your next twenty-one days, there's one short stretch when what you say to him lands as an invitation.

Say the same words a week before it, and they land as pressure. He goes quieter, and you lie awake wondering what you did wrong.

That stretch is your bridge week. Once you know when it is, you stop guessing.

### The cup I read for you

When I sat down with my tea and you on my mind, the leaves settled into seven shapes. None of them were about my life. They were about you and him.

`[IMG: esl-cup]`

*The cup I read for you, seen from above. I circled the seven shapes in red. Number 5, at the lower left, is the bridge. Your bridge week is in it.*

Here's what came up, in the order I numbered them:

1. **A bird taking flight.** A man pulling away.
2. **A broken heart.** What all this has done to you.
3. **A withering tree.** What the two of you had, gone thin.
4. **A boat.** The rough weather you're both caught in.
5. **A bridge.** A way back across to each other.
6. **A lighthouse.** Something steady in your life that isn't him.
7. **A butterfly.** A change in you that's already started.

Four of those are hard to read. Three of them give you a way through, and the bridge is the one that decides how this goes.

### A bridge works both ways

You can walk across a bridge toward someone. Someone can also walk away over it.

What you say to him is that bridge. In your bridge week, your words give him a way back to you. A week too soon, the very same words are the bridge he leaves by.

So this was never about finding the perfect thing to say. You can have the right words and still lose ground, because they landed in the wrong week.

### Find the bridge yourself

Look at the photo again for me, dear.

Start with the handle, at the lower right. In a tea cup, the handle is you. A leaf close to the handle is close to you. A leaf across the cup is far from you.

Height is time. A leaf right up under the rim is now and the weeks just ahead. The further down the wall a leaf sits, the further back it goes.

Now find number 5, at the lower left. It's a thin line of leaf lying right along the edge of the cup. It sits between your side of the cup and his, and higher than either.

So your bridge is near. It's weeks away, not months. But it isn't here yet, and nothing in the photo tells you which days it falls on.

### What your reading gives you

That's what the reading is for. I call it The Turn. I take each of your seven leaves, show you exactly where it sits in your cup, and turn it into your next twenty-one days.

You get:

- The days to stay quiet, and the days to speak.
- Your bridge week, the one message to send in it, what to keep in that message and what to cut, and the evening to send it.
- How long he's really been pulling away, read from the bird.
- How much of what you had is still there to get back.
- A one-page calendar of your twenty-one days, free, to keep where you'll see it.

It comes as a PDF, by email, within 24 hours. You don't need to send me anything, dear. Not his name, not what he said last night. Everything I need is in the cup.

**[Find out when your bridge week is.](https://theseerwithin.com/offers/wiccan/tea-reading?c=61&fn={{ subscriber.first_name | url_encode }})**

### Why I wouldn't wait

Until you know when your bridge week is, every message you send him is a guess.

And a guess in the wrong week costs you. It pushes him a little further off, and you spend the next week trying to undo it. One message can do that.

### What I won't promise

I won't promise you he comes back. Nobody honest can promise you that.

What I will tell you is when to stay quiet, when to speak, and what goes in your one message when your bridge week comes. You'll stop guessing, because you'll know the day.

`[BUTTON: Show me my bridge week](https://theseerwithin.com/offers/wiccan/tea-reading?c=62&fn={{ subscriber.first_name | url_encode }})`

— Evelyn

P.S. Your bridge week is somewhere in your next twenty-one days, {{ subscriber.first_name | capitalize }}, and it's short. The same words that land as an invitation in it land as pressure a week earlier. **[Find out when yours is.](https://theseerwithin.com/offers/wiccan/tea-reading?c=63&fn={{ subscriber.first_name | url_encode }})**

---

## Build notes

- **Angle:** the claim, the cup photo, the bridge week. Line 1 names the idea and states it as something
  Evelyn saw. Then the mechanism (a bridge works both ways: the same words are a way back or the way
  out, depending on the week), then how a cup is read (handle = her, height = time) so she can find
  the bridge herself, then what the reading turns that into.
- **Why:** the reading's own line is "the one stretch where what you say lands as an invitation and
  not as pressure" (Days 16–18 · the bridge, `04-P1-divided-rim.md`). Every one of the three drawn
  readings has a bridge stretch (Divided Rim 16–18, Turned Handle 13–15, Sunken Leaf 19–21), so
  "somewhere in your next twenty-one days" is true whichever she draws. The email never names a day.
- **Self-check moment:** "Find the bridge yourself" — she looks at the photo, finds the handle, then
  mark 5, and sees for herself that it sits up under the rim (near) and between her side and his.
- **Facts used, all from `docs/04/product/esl-cup-map.md`:** handle at lower right; bridge at lower
  left, right up under the rim, between her side and his and higher than either; rim = now, further
  down = further back. Symbol meanings match the readings' "Where your seven landed" table.
- **"Bridge week" vs three days:** in the readings the bridge is a three-day stretch headed "This is
  the week". The emails never say it's seven days; they call it "one short stretch".
- **Links:** `c=61` text link (end of "What your reading gives you"), `c=62` button, `c=63` P.S.
  (proposed; the brief gave only 61/62). `fn=` uses `{{ subscriber.first_name | url_encode }}` — see
  the report: 09's built HTML passes no first name, so there is no house form to copy.
- **Promises kept inside the PDF:** quiet/speak days, the bridge stretch + one message (what to keep,
  what to cut) + its evening, the bird's age, how much is recoverable, the free calendar, PDF within
  24 hours, nothing to send. No exact words for the message are promised (the reading gives its shape,
  not a script).
- **Counts and checks (2026-10-11):** body 769 words (prose incl. caption and bullets; no URLs, merge
  tags or image marker). "Bridge week" 10×. "dear" 2×. Greps on subjects + body: $ / price 0,
  deadline words 0, back-references 0, banned words 0, hedges (may/might/perhaps/maybe/probably/
  usually/often/seem/tend/almost/could be/I think) 0, em dashes in prose 0. Shared 6-word runs with
  email 2: 2 (button wording, "what the two of you had"); with email 3: 1 ("the cup I read for you").
