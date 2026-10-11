# 04-U v2 — Upsell copy, as she sees it *(The Turn)*

| | |
|---|---|
| **Status** | Built in code, preview only — `readyForMoney` is still false for 04 |
| **Code** | `client/src/lib/upsellCopy/teaReading.ts` → `BACKEND_UPSELL_PITCH['tea-reading']` in `client/src/lib/backendOffers.ts` |
| **Tests** | `client/src/lib/upsellCopy/teaReading.test.ts` — walks every reachable line, both U2 openings |
| **Walk** | `improve-v1/v1-one-time-BEs/scripts/walk-04-upsells.mjs` → `improve-v1/evidence/04-tea-reading-2026-10-11/upsells/` |
| **Source** | [`04-U-upsell-beats.md`](./04-U-upsell-beats.md) — the drafted beats. This file supersedes it where they differ; the reasons are at the bottom |
| **Route** | `/offers/upsell/welcome1` → `/offers/upsell/welcome2` → `/offers/wiccan/tea-reading/success` (shared pages; offer resolved from the booking session) |

**How to read this.** Every Evelyn bubble in order. `{firstName}` is the only merge — when
checkout carried no name it becomes "dear". Lines marked `V1` are V1's words, unchanged
(referenced by index in the code, never retyped). Everything else is 04's.

**The rules this copy is held to** (and the tests check):

1. **No personal details.** Her interpretation (drawn at random at checkout) moves the days, and the upsells run before she knows it — the bridge is
   days 16–18, 13–15 or 19–21 depending on the cup, and the quiet runs nine days or six. So no day
   number, no count of quiet days and no numbered week appears anywhere. The leaves every buyer has
   (bridge, lighthouse, butterfly) are named freely.
2. **The upsell must not fight the product.** U1 keeps a well-meaning friend from talking her out
   of the quiet days; it supports the sequence and never replaces it. U2 works on *her* side and
   never promises he comes back — the letter and all three readings refuse that promise.
3. **No V1 leak:** no "clearing", "energy field" or "our conversation".
4. **Timing:** the reading arrives "within 24 hours". Never "by morning", "tomorrow", or "tonight"
   about the reading. "Tonight" stays only on the stone ritual. No weekdays or dates.
5. **The cup hasn't been turned yet** when these run, so nothing claims where a leaf *sat*.

---

## U1 — the Protection Ritual


**CONFIRMATION**

> It's done, {firstName}. I'll turn your cup, and your twenty-one days will be with you within 24 hours.
>
> You'll have the whole sequence. Which days are for quiet, which week the bridge is for, and how old the bird actually is.
>
> One thing before I go, because it's the thing most likely to cost you this.

**GAP**

> The sequence works because of the quiet. The quiet days are the ones that do it.
>
> But quiet isn't nothing, {firstName}. Everything still reaches you. You just don't get to answer it the way you'd like to.
>
> Whatever he sends, or doesn't. Your own version of events at two in the morning. And — this is the one — everybody else's opinion about what you should be doing instead.
>
> When you're holding a line you can't explain, you're very easy to talk out of it.

**RISK**

> And somebody is going to try. I'd put money on it.
>
> Not an enemy. Someone who loves you, who's watched you be unhappy for months and wants it over — and who's going to tell you, kindly, to stop overthinking and just be honest with him.
>
> They'll say it a few days in. They always do. That's when the quiet starts to look like you're suffering for no reason.
>
> The trouble is they're not wrong about the honesty, {firstName}. Being honest with him is IN the sequence. It has its own week, and that's what the bridge is for.
>
> What they're actually asking is that you do it now, on the wrong day. Then even the right words push him further off.
>
> And you won't be able to argue back, because the case for waiting is a tea reading, and you'll hear how that sounds in your own mouth before you've finished saying it.

**QUESTION 1**

> Tell me honestly — is there somebody in your life who already thinks you're being too patient about this?

Quick replies: `Yes, and they've said so` · `Probably` · `I haven't told anyone`

**AFTER Q1 · `yes`**

> Then you already know which day this gets difficult.
>
> They mean it well, {firstName}, and they're still the biggest risk to your twenty-one days. Bigger than anything he does.
>
> Let me give you something to hold the line with.

**AFTER Q1 · `maybe`**

> They will. A few days in, when the quiet starts to look like giving up from the outside.
>
> You don't need to win that argument. You just need to still be on your days when it's over.
>
> That's what this next part is for.

**AFTER Q1 · `unsure`**

> That's the safest place to be, and I'd keep it that way. Don't explain the sequence to anybody.
>
> But it reaches you anyway — the general opinion that you should be doing something. It doesn't need to be aimed at you to land.
>
> Let me keep it off you while you keep your days.

**AFTER Q1 · `default`**

> Then you know the shape of what I mean.
>
> The sequence is sound. What it needs is a woman who doesn't get talked out of the quiet days.

**SOLUTION**

> That's why there's one other piece of work I do alongside a reading like yours. A Protection Ritual.
>
> It puts a guard on what reaches you while you keep your days. The guard starts the night I do the work, before your stone has even left me.
>
> And I anchor it to something physical, so it holds on the days you're on your own with this.

**LAVA STONE** — then the lava-stone photo

> For your protection, I use volcanic lava stone. `V1`
>
> It's not a random choice, {firstName}. `V1`
>
> Lava is born from the Earth's core — where creation and destruction meet. `V1`
>
> When a volcano erupts, it destroys the old ground and lays new ground in its place. That's what these three weeks are. The old way you've been doing this goes, and a new one sets.
>
> The stone is porous — it literally absorbs negative energy before it can reach you. `V1`

**QUESTION 2** — shared V1 text, imported by the hook — not overridable

> Transformation through fire... destruction of the old to create the new. Can you feel why this stone is meant for you right now, {firstName}?

Quick replies: `Yes, I can feel it` · `I think I understand` · `Tell me more`

**AFTER Q2 · `yes`** — shared V1

> I knew you would. Your energy recognized it immediately. `V1`
>
> This stone has been waiting for someone like you. `V1`

**AFTER Q2 · `understand`** — shared V1

> Good. The understanding will deepen once you hold it in your hands. `V1`
>
> Some connections become clear only through touch. `V1`

**AFTER Q2 · `more`** — shared V1

> Of course. Let me show you exactly what I'll do with it. `V1`
>
> The ritual itself is where the real power lies. `V1`

**AFTER Q2 · `default`** — shared V1

> The connection between you and this stone — it's already forming. `V1`
>
> Let me tell you how I'll seal it. `V1`

**RITUAL**

> Here's exactly what I'll do for you, {firstName}... `V1`
>
> Tonight, between 2 and 4am — when the veil between worlds is thinnest — I'll begin. `V1`
>
> I'll place your stone on my altar, beside a white candle and a vessel of blessed water. `V1`
>
> I'll call you forward through your cup. Seven leaves is more than enough to find you by.
>
> Then I'll speak the protection invocation — words passed down through my grandmother's line. `V1`
>
> I'll circle your stone with sage smoke seven times, sealing your frequency into it. `V1`
>
> The ritual takes about two hours. It drains me... but for those who are ready, it's necessary work. `V1`
>
> When I'm done, I'll place your stone under moonlight until dawn to lock the charge. `V1`

**FEEL**

> You may feel something tonight, {firstName}. `V1`
>
> Warmth spreading through your chest. Dreams more vivid than usual. `V1`
>
> A sense of being watched over — protected. `V1`
>
> That's me, working on your energy from a distance. Don't be alarmed. It means the connection is strong. `V1`

**QUESTION 3** — shared V1 text, imported by the hook — not overridable

> I'm prepared to do this work for you tonight, {firstName}. Are you ready to be protected?

Quick replies: `Yes, I'm ready` · `I think so` · `What exactly will I receive?`

**AFTER Q3 · `yes`** — shared V1

> I can feel your readiness. It's strong. `V1`
>
> Let me tell you exactly what happens after the ritual... `V1`

**AFTER Q3 · `maybe`** — shared V1

> That hesitation is natural. You've been let down before. `V1`
>
> But your soul wouldn't have brought you this far if you weren't meant to continue. `V1`

**AFTER Q3 · `what`** — shared V1

> A fair question. Let me be completely clear about what you'll receive. `V1`

**AFTER Q3 · `default`** — shared V1

> Let me tell you exactly what you'll receive... `V1`

**THE STONE BLOCK (one for every buyer)**

> Once your stone is charged, it stands between you and everything that comes at you while you keep your days.
>
> Wear it on your LEFT wrist — your receiving hand. `V1`
>
> In this work the left side receives. Everything coming toward you — every opinion, every kind "just be honest with him", whatever he sends or doesn't — passes through that hand before it reaches you.
>
> The stone takes it in before it gets to you. You'll still hear it, {firstName}. It just won't move you off your days.
>
> You don't argue with them and you don't explain. The stone holds the line, so you don't have to.

**DELIVERY**

> Once the ritual is complete, I'll ship your charged stone directly to you. `V1`
>
> It arrives in a protective velvet pouch with a card explaining how to activate it. `V1`
>
> When you receive it, hold it in both hands, close your eyes, and say: 'I am protected. I am transforming.' `V1`
>
> That phrase activates the bond between you and the stone. `V1`
>
> The protection holds strong for at least 30 days — longer for most people. Long enough to cover every one of your twenty-one days.

**OFFER** — then the buttons

> The Protection Ritual is $47, {firstName}. `V1`
>
> That includes the charged volcanic stone shipped directly to your door. `V1`
>
> Most women I turn a cup for have me do this as well, because the quiet days are where it gets lost.
>
> Shall I put your stone on the altar tonight?

Buttons: **Yes, guard my quiet days** (also posted as her reply) · price line `$47 includes charged stone + free shipping` · **Not right now**

**ACCEPT → SUCCESS** — then the shipping form (04 collects no address at booking)

> Beautiful choice, {firstName}. `V1`
>
> Your reading and your protection are both confirmed now.
>
> I'll do your stone tonight. Your reading still comes within 24 hours.
>
> Your charged volcanic stone will ship within 48 hours. `V1`
>
> I just need to know where to send it. `V1`

**ACCEPT → after the address**

> Perfect. Your protection stone is on its way, {firstName}. `V1`
>
> Remember — when it arrives, hold it and say: 'I am protected. I am transforming.' `V1`
>
> That seals the bond. `V1`
>
> Tonight, as I work, you may feel warmth or have vivid dreams. That's normal. That's me. `V1`
>
> Watch your inbox — your reading arrives within 24 hours.
>
> Thank you for trusting me with this sacred work, {firstName}. `V1`
>
> The universe is already responding to your decision. I can feel it shifting. `V1`

**DECLINE ("Not right now")**

> I understand, {firstName}. It's your journey to walk. `V1`
>
> Just... when somebody tells you to stop overthinking and be honest with him, remember that it's already in your days.
>
> Don't argue with them, and don't explain. If it starts to get to you, I'm here.
>
> The protection ritual is always available if you change your mind. `V1`
>
> For now, watch your inbox. Your reading will be with you within 24 hours.
>
> Take care of yourself, dear.

---

## U2 — the Manifestation Bracelet


**OPENING · Path A — she took the stone**

> {firstName}... both are confirmed. Your reading and your stone.
>
> Your stone goes on my altar tonight. Your twenty-one days will be with you within 24 hours.
>
> But I want to say one more thing while I've got you, and it's about the butterfly.
>
> It's the leaf I told you to hold on to. A change that finishes inside before anybody sees it, and yours has already begun.
>
> The sequence gives you the words and the weeks. The stone keeps what shouldn't reach you from reaching you.
>
> Neither one of them does anything about what goes OUT from you, {firstName}. That's the piece that's still missing, and on the quiet days it's the piece that counts.

**OPENING · Path B — she declined the stone**

> {firstName}... I won't push the stone. Your twenty-one days will be with you within 24 hours either way.
>
> Before I turn your cup, there's one leaf I want to say a bit more about.
>
> It's the butterfly, the one leaf in your cup that's only about you.
>
> And it isn't about him. The butterfly is a change that finishes on the inside before it shows, and yours has already started.
>
> Here's why I'm telling you now, {firstName}. The sequence I'm about to send you tells you what to say and when to say it. Every word of it is about your timing.
>
> It doesn't do anything about what goes out from you on all the days you're saying nothing. And over three weeks, that matters as much as the wording does.

Both paths continue from here, identically, except the one line marked *Path A only*.

**GAP**

> Your twenty-one days will tell you when to say nothing, and when to say the one thing. That part's settled.
>
> But saying nothing to him doesn't mean nothing goes out from you, {firstName}.
>
> Something goes out from a woman whether she types it or not. For weeks now, what's gone out from you is waiting. Checking the phone. Going over his last message. Steering by whatever he did that day.
>
> Holding back keeps you safe, dear. It doesn't put anything of yours out there.

**QUESTION 1** — shared V1 text — not overridable

> {firstName}... can you feel the difference between removing something and calling something in? Between being safe... and actually having what you want?

Quick replies: `Yes, I feel it` · `I think so` · `What do you mean?`

**AFTER Q1 · `yes`**

> Good. Then you already know what's missing.
>
> The quiet keeps the wrong words in. Something else has to carry the steady part of you out while you say nothing.

**AFTER Q1 · `maybe`**

> It's quiet, and you'll feel it more once your days start.
>
> There'll be an evening when you've sent nothing, and done it well, and you're still sat there waiting. That's the moment this is for.

**AFTER Q1 · `what`**

> Think of it this way. Saying nothing to him is one thing. Sitting there waiting for him to say something is another.
>
> Your days take care of the first one. The second needs different work.

**AFTER Q1 · `default`**

> You understand more than you realise.
>
> Let me show you what I mean. `V1`

**INTRODUCE** — then the bracelet photo

> That's why I created something specific for this moment. `V1`
>
> Not for protection. Not for pulling him back. For what goes out from you.
>
> A bracelet of eight stones, each one chosen for a different part of what you give off.
>
> I call it a Manifestation Bracelet. And I only offer it to seekers whose energy is ready to receive. `V1`
>
> Yours is, {firstName}. I knew it when I saw the butterfly in your cup.

**STONES**

> Eight stones, {firstName}. Each one does a different job on what goes out from you.
>
> Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The good things you've walked straight past because you were watching your phone.
>
> Citrine — the merchant's stone. It's been carried by traders and seekers of abundance for centuries. It doesn't just attract wealth... it attracts the confidence to receive it. The feeling that you deserve what's coming. `V1`
>
> Amethyst — your intuition amplifier. Signs and synchronicities are easy to miss when you're busy going over his last message. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.
>
> Tiger's Eye — the stone of bold action. It attracts the opportunities that require courage. The ones you'd normally hesitate on. And then it gives you the nerve to say yes. `V1`
>
> And four more working together — Clear Quartz to amplify every intention you set... Hematite to ground your manifestations into physical reality... Pyrite to broadcast abundance frequency outward... and Malachite to pull transformation and growth toward you like a magnet. `V1`
>
> Eight stones. Eight signals. All tuned to you while your cup's in front of me.

**QUESTION 2** — shared V1 text — not overridable

> Eight stones, each pulling something different toward you. {firstName}... did any of them stand out? Did one feel like it was speaking directly to you?

Quick replies: `Yes, one stood out` · `They all resonate` · `Tell me more`

**AFTER Q2 · `yes`**

> I'm not surprised. The stone that calls to you loudest is the one doing the most work for your energy right now. `V1`
>
> Keep that one in mind. Now let me tell you what I charge it to, and which wrist it goes on.

**AFTER Q2 · `all`**

> That tells me something powerful, {firstName}. When all eight stones speak to you... it means your energy is ready for all of it. `V1`
>
> Now let me tell you what I charge them to, and which wrist they go on.

**AFTER Q2 · `more`**

> Of course. Every one of them works on what goes out from you. None of them works on him.
>
> And what I charge them to matters just as much. Let me tell you.

**AFTER Q2 · `default`**

> The connection between you and these stones is already forming, {firstName}. `V1`
>
> Let me tell you what I charge them to.

**RITUAL INSTRUCTION — the three leaves, right wrist**

> You'll wear this on your right wrist, {firstName}. Always the right. `V1`
>
> Your right side is your broadcasting side. It's how your energy flows outward into the world — into every room you enter, every person you meet, every intention you set. `V1`
>
> I charge it to the three good leaves in your cup. The bridge, the lighthouse and the butterfly.
>
> The lighthouse is your own fixed point, the one that isn't him. On your wrist it keeps you steering by that, and not by whatever he did today.
>
> The bridge is your side of the way across. The bracelet keeps you standing on your side of it — open, and not crossing the whole way yourself.
>
> And the butterfly is the change in you that's already started. The bracelet holds it, whatever he does.
>
> It won't walk him across that bridge, {firstName}. Nothing does, and I'm not going to pretend otherwise. What it does is make sure that what goes out from you on the quiet days is those three leaves, and not the waiting.

**Path A only**

> And with your lava stone on your left, filtering what comes IN... and the manifestation bracelet on your right, amplifying what goes OUT... you'll have a complete circuit. Receiving and broadcasting in perfect harmony. `V1`

**WHAT YOU RECEIVE**

> I do the charging while your cup's in front of me. By the time the bracelet reaches you, those three leaves are already in it.
>
> You'll also receive a manifestation guide — a daily 3-minute ritual to activate the bracelet each morning. It's simple. But my seekers tell me it's the most powerful part of their day. `V1`
>
> Most of them start noticing shifts within the first week. Small things at first — a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger. `V1`

**QUESTION 3** — shared V1 text — not overridable

> {firstName}... I've shown you the stones. I've told you how they work. But I need to ask you something before we go further. Are you ready to stop waiting for what you want... and start calling it in?

Quick replies: `Yes, I'm ready` · `I think so` · `What exactly will I receive?`

**AFTER Q3 · `yes`** — V1, inherited

> I felt that, {firstName}. Your energy just shifted. You're ready. `V1`
>
> Let me tell you exactly what happens next. `V1`

**AFTER Q3 · `maybe`** — V1, inherited

> That's honest. And honesty is a kind of readiness too. `V1`
>
> Let me make this simple for you. `V1`

**AFTER Q3 · `what`** — V1, inherited

> A fair question. Let me be completely clear. `V1`

**AFTER Q3 · `default`** — V1, inherited

> I can feel your energy leaning forward, {firstName}. That's enough. `V1`
>
> Here's what you'll receive. `V1`

**SOCIAL PROOF**

> I've sent these to hundreds of seekers now. The ones who wear them daily... their stories still give me chills. `V1`
>
> They don't just tell me something changed. They tell me everything changed. Like the universe finally heard them. `V1`

**PRICE**

> The Manifestation Bracelet, fully charged and attuned to your desire, is $47. Shipped directly to you. `V1`
>
> Same 30-day guarantee. If you don't feel the difference in yourself, every penny back.
>
> I've never had anyone return one. `V1`

**URGENCY** — then the buttons

> I can only charge the stones while your cup's in front of me, {firstName}. Once I've turned it and written your days, that's done.
>
> Your reading will be just as good either way. I promise you that.
>
> But if you want those three leaves on your wrist for the quiet days... this is the moment.

Buttons: **Yes, send me the Manifestation Bracelet** · price line `$47 includes attuned bracelet + manifestation guide + free shipping` · **Not right now** (shared component, unchanged)

**"Not right now" → DOWNSELL**

> {firstName}... I hear you. `V1`
>
> Let me do something I don't normally do. `V1`
>
> I have a bracelet that's already been cleansed and prepared — it just hasn't been charged to anyone yet. It won't carry your cup the way a fresh one would...
>
> But I can still connect it to your energy before I begin. It won't be as deeply bonded to your specific desire, but the stones themselves are powerful attractors on their own. `V1`
>
> I can send it to you for $30 instead. Same eight stones. Same manifestation energy. Just prepared differently. `V1`
>
> This is the lowest I can offer, dear. The stones alone cost me nearly that. `V1`

Buttons: **Yes, send it to me for $30** · **No thanks, just my reading**

**ACCEPT (full or $30) · Path A — address already given on U1**

> Beautiful choice, {firstName}. `V1`
>
> Your Manifestation Bracelet gets charged while your cup's in front of me.
>
> Eight stones, carrying the bridge, the lighthouse and the butterfly.
>
> I'll ship it to the same address as your protection stone. `V1`

**ACCEPT (full or $30) · Path B — then the shipping form**

> Beautiful choice, {firstName}. `V1`
>
> Your Manifestation Bracelet gets charged while your cup's in front of me.
>
> Eight stones, carrying the bridge, the lighthouse and the butterfly.
>
> It will ship within 48 hours. `V1`
>
> I just need to know where to send it. `V1`

**ACCEPT → after the address**

> Perfect. Your Manifestation Bracelet is on its way, {firstName}. `V1`
>
> Remember — wear it on your right wrist. Always the right. `V1`
>
> Each morning, hold it and set your intention for the day. Three minutes. That's all it takes. `V1`
>
> Watch your inbox — your reading arrives within 24 hours.
>
> Thank you for trusting me with this sacred work, {firstName}. `V1`
>
> The universe is already responding. I can feel it. `V1`

**DECLINE ("No thanks, just my reading")**

> I understand, {firstName}. Your reading stands on its own.
>
> Just know... the stones are patient. If you want them later, I'll be here.
>
> Watch your inbox — your reading arrives within 24 hours. `V1`
>
> Take care, dear. And don't send him anything until your days arrive.

---

## Changes from 04-U (and from V1), with reasons

### The U2 reframe

**What 04-U said:** *"the reading tells you what to say; the bracelet draws him back."* Path A
ended "Neither one of them gives him anything to walk toward… it's the piece that decides day
sixteen"; Path B ended "It doesn't do anything about what he's walking toward when he crosses that
bridge"; the `bridge` stone option was *"The bridge — I want him to cross"*, charged to "being
crossed toward"; the `lighthouse` branch called a woman who isn't waiting "the single most
attractive thing in this entire situation".

**What it says now:** the bracelet is for what goes OUT from her. On the quiet days she says
nothing, but something always goes out — and for weeks that's been waiting. The bracelet (right
wrist, the sending side) is charged to the bridge, the lighthouse and the butterfly, so what goes
out is those three leaves: steering by her own fixed point, standing on her side of the bridge
without crossing it all herself, and the change in her that holds whatever he does. It says
outright: *"It won't walk him across that bridge. Nothing does, and I'm not going to pretend
otherwise."*

**Why:** the letter says "I'm not going to promise you he comes back", and every reading holds that
line — "Recoverable doesn't mean he's coming back" (Divided Rim), "I won't promise you he's coming
back" (Turned Handle), "Nine days of silence may produce nothing" (Sunken Leaf). An upsell that sells drawing him back sells the one
thing the product refuses, seconds after she paid for the refusal.

Lines changed for it, beyond the two openings: U2 `GAP` (all four), `AFTER Q1` (all four; the
default is V1's reworded, with British "realise"), `INTRODUCE` 2–3 ("Not for pulling him back"; "what you give off" for V1's "draw specific energies
toward you"), `STONES` 1 ("a different job on what goes out from you") and 2
(Aventurine no longer "helps the things you've been asking for find you" — for this buyer that reads
as "he'll find you"), `RITUAL INSTRUCTION` — V1's lines 3–4 replaced by five lines on the three leaves (V1's "you'll be
speaking at full volume" argues against the quiet days), `PRICE` 2 (V1's guarantee "if nothing starts moving toward you" became "if
you don't feel the difference in yourself"), `SOFT DECLINE` 2 (no "calling in what's yours").

### The stone choice (04-U2b) became a statement

04-U2b asked *"which of your three good symbols do you want it charged to?"* with three quick
replies. **The upsell hook can't ask it:** `useUpsell2Chat` imports every U2 question's text and
replies straight from V1 (`UPSELL2_QUESTION_1/2/3`); a copy file can only override the answers. So
the bracelet is charged to **all three** leaves, each turned to her side, inside `RITUAL INSTRUCTION`.
To bring the choice back, the hook needs per-offer question text (see the build report).

### Day numbers cut (rule 1)

| 04-U | Now |
|---|---|
| "The first nine days are the ones that do it." / "nine days of quiet is not nine days of nothing" | "The quiet days are the ones that do it." / "quiet isn't nothing" |
| "They'll say it around day five… Day five is when you look like you're suffering" (RISK, AFTER Q1 `maybe`) | "a few days in… That's when the quiet starts to look like you're suffering" |
| "being honest with him is days sixteen to eighteen… you do it eleven days early" | "Being honest with him is IN the sequence. It has its own week, and that's what the bridge is for. What they're actually asking is that you do it now, on the wrong day." |
| "What it needs is nine days you don't get talked out of" | "What it needs is a woman who doesn't get talked out of the quiet days." |
| "the piece that decides day sixteen" (Path A) | "on the quiet days it's the piece that counts" |
| "without you having to say it in week two" (`bridge` branch) | gone with the branch |

⚠ **Day five is the one exception worth a decision.** 04-U's build note names it on purpose, and it
is in fact true for every cup: all three readings warn that her doubt peaks on day five. It is cut
here only because this build's rule and tests ban every day number. If you want it back, it is safe
to restore in RISK and AFTER Q1 `maybe` — and the test's day-number check needs a one-word allowance.

### Positions cut (rule 5)

"It sat at the rim — higher than anything else you had" (Path B) and "It sat highest in your cup —
the nearest thing in time you had" (Path A) are gone. The butterfly *is* the highest leaf in all
three cups, but the upsell runs before the turning — the letter says "What I have not done yet is
turn the cup", and the reading opens "Your cup's turned". Both openings now use what the letter
already told her: the butterfly is *"the one I'd have you hold on to"*. Path B's "there's one thing
in your cup I read and didn't put in the letter" became "there's one leaf I want to say a bit more
about" for the same reason, and "rather than in the reading" was cut (the reading does cover the
butterfly).

### Timing (rule 4)

- "Your cup goes on the table tonight… The twenty-one days will be with you by morning" (Path B, U1
  CONFIRMATION) → "I'll turn your cup, and your twenty-one days will be with you within 24 hours".
- "The turning happens tonight and your twenty-one days come with it" (Path A) → "Your stone goes on
  my altar tonight. Your twenty-one days will be with you within 24 hours."
- "You'll have the whole sequence by morning" → "You'll have the whole sequence."
- U1 `SOLUTION` now says the guard "starts the night I do the work, before your stone has even left
  me". Her days start within 24 hours; the stone ships within 48 hours and then travels. Without this
  line U1 would be selling cover for days the stone can't reach.

### Other 04-U lines adjusted

- **"His silence"** (U1 GAP) → "Whatever he sends, or doesn't." In the Turned Handle he still answers,
  flat — silence isn't true for every cup.
- **"It's nine days of everything reaching you with no reply going out"** → "Everything still reaches
  you. You just don't get to answer it the way you'd like to." All three readings tell her to answer
  him warmly and briefly if he writes, so "no reply going out" was wrong.
- **Aphorisms rewritten** (voice rule): "A woman holding a line she can't explain is the easiest woman
  in the world to talk out of it" → "When you're holding a line you can't explain, you're very easy to
  talk out of it"; "Good intentions have broken more sequences than rivals ever have" → "Bigger than
  anything he does"; "You don't have to win that conversation — you only have to not lose the week to
  it" → "You don't need to win that argument. You just need to still be on your days when it's over."
- **RISK gained one line**: "Then even the right words push him further off." It is
  the product's own answer to the friend, in all three cups.
- **Path B gained the decline acknowledgement** every other offer's Path B has: "I won't push the stone."
- **Contractions** added where the draft read as written rather than spoken ("who has watched" →
  "who's watched", "you will not be able" → "you won't be able").

### V1 lines replaced (rule 3, and lines false for this buyer)

| Block | Line | Why |
|---|---|---|
| U1 `SOLUTION` | all three | "a second ritual" assumes a first; "while your field rebuilds" is the clearing premise |
| U1 `LAVA STONE` | 4 | re-pointed from "what's happening in your energy" to the three weeks — the old way going, a new one setting |
| U1 `RITUAL` | 4 | "the energy signature from our conversation" — most 04 buyers never chatted; she has a cup and seven leaves |
| U1 stone block | 1, 3–5 | V1's four bucket blocks need a bucket 04 doesn't have. One block for everyone, built on expectation three and the product's "Don't argue with them. Don't tell them what you're doing." Line 2 is V1's left-wrist line, verbatim |
| U1 `DELIVERY` | 5 | "for your energy field to fully heal" |
| U1 `OFFER` | 3–4 | "both rituals together — clearing AND protection"; "tonight's ritual" |
| U1 `SUCCESS` | 2–3 | "Both rituals… clearing AND protection"; "perform them together tonight" |
| U1 after the address | 5 | "your clearing reading" |
| U1 `DECLINE` | 2, 3, 5, 6 | "next 30 days" / "old heaviness returning" (clearing); "your clearing reading"; "tonight during the work" |
| U2 `URGENCY` | all three | "inside your energy field tonight… the clearing" |
| U2 `DOWNSELL` | 3 | "the full personalized charge of tonight's clearing" |
| U2 `SUCCESS` ×3 | 2–3 | "attuned during tonight's clearing" |
| U2 after the address | 4 | "your clearing reading" |
| U2 `WHAT YOU RECEIVE` | 1 | "during tonight's clearing… what you told me you want most" |
| U2 `INTRODUCE` | 5 | "I felt it the moment we began talking" |
| U2 `STONES` | 4, 7 | "Once the block is cleared"; "during tonight's clearing" |
| U2 `DECLINE` | 1, 2, 4 | "The clearing alone"; "start calling in what's yours"; "Tonight's work begins soon" — now ends on the letter's own sign-off, de-dated: "don't send him anything until your days arrive" |
| U2 `AFTER Q2` | all | V1's promise a personalised stone read follows ("let me show you which one speaks loudest") — that stage is skipped, so each now hands off to the wrist |
| Labels | accept / downsell decline | "Yes, protect what we clear" → **Yes, guard my quiet days**; "No thanks, just the clearing" → **No thanks, just my reading** |

### What stays V1 on purpose

The ritual itself (2–4am, altar, sage, moonlight), `FEEL`, the left-wrist line, `DELIVERY` 1–4, the
prices, the eight stones' names, `SOCIAL PROOF`, U2 `AFTER Q3`, the manifestation guide, and the
lava-stone/bracelet "complete circuit" line (Path A). None of them mention a clearing, a day, or
him.

### Known limits — shared text the copy file can't reach

- **The six question texts are V1's.** `useUpsellChat` imports U1's Questions 2 and 3, and
  `useUpsell2Chat` all three U2 questions, directly. They contain no clearing line, but U2's lean on
  attraction ("calling something in", "each pulling something different toward you", "start calling
  it in"). 04's surrounding lines are written so they still land, but they can't be re-pointed
  without a hook change.
- **U1 `AFTER Q2` `yes` says "recognized"** (US spelling) — shared V1 text, same reason.
- **The CTA components' fixed lines** — "Yes, send me the Manifestation Bracelet", "$47 includes
  attuned bracelet + manifestation guide + free shipping", "Take your time. This is your journey." —
  are shared and unchanged.
