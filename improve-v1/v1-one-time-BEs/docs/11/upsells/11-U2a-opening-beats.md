# 11-U2a — U2 opening beats *(PATH_A and PATH_B → the Manifestation Bracelet)*

| | |
|---|---|
| **Product sold** | V1's **Manifestation Bracelet**, unchanged. $47, downsell $30 |
| **Fit** | ⚠ The weaker of the two. It's an attraction product being sold as protection. It works only as: *you protect what comes back by using it* |
| **Sells** | "Protect what's coming back to you." |
| **Engine** | shared `useUpsell2Chat.ts` + the same copy object as `11-U1a` |
| **Hinge** | the same product line: *"What you do with it is on you."* The stone guards what comes IN, on the left wrist. The bracelet is the RIGHT wrist, V1's own "broadcasting side", and keeps what's back in use |
| **Personal details** | none beyond `{firstName}` |

**The trap.** V1 sells "calling it in". On this offer that reads as calling *them*, or as a promise of someone new. So the bracelet works on her side only, and says so out loud: *"It won't bring them back. It won't bring anybody."* Also held from `11-U1a`: no hint at what was taken, no fork, and nothing that says the reading needs help.

**Path A** follows a stone. It stacks on it. **Path B** follows a no. It doesn't argue, it gives her something new from a card she already has.

---

## Opening beats

**`PATH_A_OPEN`** *(took the stone)*

> {firstName}... both are booked. Your reading and your stone.
>
> Your stone goes on my altar tonight. Your reading will be with you within 24 hours.
>
> One more thing while I've got you, and it's about the day after you read that letter.
>
> The letter gets it back to you. The stone stands guard over what comes IN.
>
> Neither one does anything about what goes OUT from you, {firstName}.
>
> And if it comes back and you keep it shut away, it sits with you the way it sat with them, doing nobody any good.

**`PATH_B_OPEN`** *(declined the stone)*

> {firstName}... the stone's your call, and I'll leave it there. Your reading will be with you within 24 hours either way.
>
> But before I lay your twelve, there's one card I want to say a bit more about.
>
> The Hermit. Look at how he holds that lantern. Out in front of him, up high, where it can do some good.
>
> That's what a lantern's for. I told you the lantern is what they took, and all this time it's done nobody any good.
>
> When it comes back to you it needs carrying, {firstName}. If you shut it away, it sits with you the way it sat with them.
>
> Your left wrist takes things in. Your right wrist is the side that reaches out, and right now there's nothing on it.

---

## The rest of the flow, so nothing old leaks

### Route (`chain`)

| Edge | V1 | 11 | Why |
|---|---|---|---|
| `PATH_A_OPEN`, `PATH_B_OPEN` → | `MANIFEST_REVEAL` | `GAP` | The AI reveal needs a bucket 11 doesn't have. Same as 09, 06 and 03 |
| `GAP` → | `QUESTION_1` | `INTRODUCE` | Q1's shared text says "Between being safe…" and "calling something in". It can't be overridden |
| `STONES` → | `QUESTION_2` | `RITUAL_INSTRUCTION` | Q2's text is about "pulling something toward you". It also skips `MANIFEST_PERSONALIZE` |
| `WHAT_RECEIVE` → | `QUESTION_3` | `SOCIAL_PROOF` | Q3's text is "start calling it in" |

**`pauses`:** `GAP`: *Go on* · `STONES`: *I'm listening* · `WHAT_RECEIVE`: *Tell me*

### Lines

| Export · index | V1 line | 11 |
|---|---|---|
| `GAP[0]` | "The clearing will remove…" | Your letter will get it back to you. That part's settled. |
| `GAP[1]` | "…opening a door…" | But having it back and using it are two different things, {firstName}. |
| `GAP[2]` | "…clear every block in your field…" | You've had plenty of practice at keeping it in. You go quiet. You say you're tired. You find the fault by Thursday. Those habits don't know anything's changed. |
| `GAP[3]` | "…Safe, but alone." | You protect what's coming back to you by using it. |
| `INTRODUCE[0]` | | V1 |
| `INTRODUCE[1]` | "Not for clearing…" | Not to guard you. Not to pull anyone to you. For what goes out from you. |
| `INTRODUCE[2]` | "…draw specific energies…" | Eight stones on one bracelet, and each one has its own job once it's back. |
| `INTRODUCE[3]` | "…whose energy is ready…" | I call it a Manifestation Bracelet. And I only offer it to women who've got something coming back to them. |
| `INTRODUCE[4]` | "…the moment we began talking." | You do, {firstName}. I knew that the night they came to me. |
| `STONES[0]` | "…your desire toward you." | Eight stones, {firstName}. Each one does something different with what comes back. |
| `STONES[1]` | "…asking the universe for…" | Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The good things you've walked past because your head was somewhere else. |
| `STONES[2]` | | V1 |
| `STONES[3]` | "Once the block is cleared… The universe…" | Amethyst — your intuition amplifier. It helps you see what's in front of you, and not what used to be there. |
| `STONES[4]` | "…gives you the nerve to say yes." | Tiger's Eye — the stone of bold action. It goes to work on the chances that take courage, the ones you'd normally hesitate on, and it gets you to say yes. |
| `STONES[5]` | | V1 |
| `STONES[6]` | "…tonight's clearing." | Eight stones. Eight signals. All charged while your twelve are on my table. |
| `RITUAL_INSTRUCTION[0]` | | V1 |
| `RITUAL_INSTRUCTION[1]` | "…how your energy flows outward…" | Your right side is the side that reaches out. Every room you walk into, every person you meet, every yes you say. |
| `RITUAL_INSTRUCTION[2]` | "…so the universe can hear…" | For a long time, all that's gone out from that side is "I'm tired" and "I'm busy". |
| `RITUAL_INSTRUCTION[3]` | "…speaking at full volume." | I charge it to your lantern. The Hermit's, the one I told you about. So when it's back, it goes out in front of you and doesn't sit. |
| `RITUAL_INSTRUCTION[4]` *(new)* | | It won't bring them back, {firstName}. It won't bring anybody. I don't do that and I'm not going to pretend I do. It keeps what's yours in use, where you can see it. |
| `RITUAL_PATH_A_EXTRA` | | V1 |
| `WHAT_RECEIVE[0]` | "…tonight's clearing… what you told me…" | I do the charging while your twelve are on my table. By the time the bracelet reaches you, it's done. |
| `WHAT_RECEIVE[1–2]` | | V1 |
| `SOCIAL_PROOF[0]` | | V1 |
| `SOCIAL_PROOF[1]` | "…Like the universe finally heard them." | They don't just tell me something changed. They tell me everything changed. |
| `PRICE[0, 2]` | | V1 |
| `PRICE[1]` | "Same 30-day guarantee… if nothing starts moving toward you…" | There's a 30-day guarantee. If you don't feel the difference in yourself, every penny back. |
| `URGENCY[0]` | "…inside your energy field tonight…" | I can only charge the stones while your twelve are on my table, {firstName}. Once I've written out your letter, that's done. |
| `URGENCY[1]` | "Your clearing will be powerful…" | It comes back to you either way. It comes back when you read it, bracelet or no bracelet. |
| `URGENCY[2]` | "…beyond clearing…" | But if you want something on your right wrist when it does... this is the moment. |
| `DOWNSELL[0, 1, 5]` | | V1 |
| `DOWNSELL[2]` | "…tonight's clearing…" | I have a bracelet that's already been cleansed and prepared. It just hasn't been charged to anyone yet. It won't carry your lantern the way a fresh one would... |
| `DOWNSELL[3]` | "…connect it to your energy…" | But I can still tie it to you before I begin. The stones do their work on their own. |
| `DOWNSELL[4]` | "…Same manifestation energy…" | I can send it to you for $30 instead. Same eight stones. Just prepared differently. |
| `SUCCESS[0, 3]` | | V1 |
| `SUCCESS[1]` | "…tonight's clearing." | Your Manifestation Bracelet gets charged while your twelve are on my table. |
| `SUCCESS[2]` | | Eight stones, carrying your lantern. |
| `SUCCESS_HAS_SHIPPING[0, 3]` | | V1 |
| `SUCCESS_HAS_SHIPPING[1, 2]` | same | same as `SUCCESS[1, 2]` above |
| `SUCCESS_NEEDS_SHIPPING[0, 3, 4]` | | V1 |
| `SUCCESS_NEEDS_SHIPPING[1, 2]` | same | same as `SUCCESS[1, 2]` above |
| `SHIPPING_CONFIRMED[0–2]` | | V1 |
| `SHIPPING_CONFIRMED[3]` | "…your clearing reading…" | Watch your inbox. Your reading arrives within 24 hours. |
| `SHIPPING_CONFIRMED[4]` | "Thank you for trusting me…" | Thank you for letting me do this, {firstName}. |
| `SHIPPING_CONFIRMED[5]` | "The universe is already responding." | Read your letter the day it comes, dear. Don't wait for the bracelet. |
| `SOFT_DECLINE[0]` | "The clearing alone…" | I understand, {firstName}. Your letter does its job with or without it. |
| `SOFT_DECLINE[1]` | "…the stones are patient… I'll be here." | Just use what comes back, dear. Don't let it sit. |
| `SOFT_DECLINE[2]` | | V1 |
| `SOFT_DECLINE[3]` | "Tonight's work begins soon." | Take care. You don't owe them a word. |

**`downsellDeclineLabel`:** No thanks, just my letter

**`placeholderNames`:** `["Friend"]`

---

## Build notes

- **How the bracelet "protects".** The argument is that what isn't used goes the way it went in their hand. It rests on two things she already has: the Hermit's lantern, and the letter's "You go quiet. You say you're tired." Both are true of every buyer.
- ⚠ **Where this one rubs.** The letter promises "the next time someone reaches for you, there's someone there". `GAP[2]` says her habits don't know anything's changed. I kept it because it's about habits, not about whether it came back, and it's the product's own "on you". But it's the line nearest to fighting the product. Read it first.
- **`STONES[4]` changed for one word.** V1's "gives you the nerve to say yes" uses a reveal word: "Your nerve" is one of the nine answers.
- **`GAP[3]` changed for the same reason.** V1's "Safe, but alone" uses another one. That's also why Q1 is routed around: its text says "being safe".
- **`STONES[1]` keeps "New connections".** It's V1's and promises no person. It's as far as this should go.
- **`URGENCY` is inside the 24 hours.** It sets no new deadline, and the page only shows once, so nothing needs code to keep it. V1's "the stones are patient… I'll be here" is cut because nothing keeps that promise.
- **`DOWNSELL[4]` types $30.** V1's line says "Same manifestation energy", so it can't be kept by reference. It must match V1's price.
- **`SHIPPING_CONFIRMED[5]`** stops a real failure: she holds off reading until the bracelet comes.
- ⚠ **Shared lines I can't reach:** the CTA text in `Upsell2CTA.tsx` is fine ("Yes, send me the Manifestation Bracelet", "$47 includes attuned bracelet + manifestation guide + free shipping").
- ⚠ **She has the bracelet already, in many cases.** Same overlap as the stone, see `11-U1a`.
- **No prices typed in the openers.** `{firstName}` × 2 in each path.
