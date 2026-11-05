# 12-U2a — U2 opening beats *(PATH_A and PATH_B → the Manifestation Bracelet)*

| | |
|---|---|
| **Product sold** | V1's **Manifestation Bracelet**, unchanged. $47, downsell $30 |
| **Comes after** | U1, **Evelyn's Wish Ritual + charged citrine bracelet** ([12-U1a](12-U1a-opening-beats.md)) |
| **Fit** | Good. V1 calls Green Aventurine "the luck stone", and the bracelet's "attractor" and "magnet" talk fits luck. V1's lines still say "clearing", "energy" and "the universe", so those lines are replaced |
| **Sells** | "Keep the luck your numbers bring." |
| **Engine** | shared `useUpsell2Chat.ts` + `LUCKY_NUMBERS_UPSELL2` in `client/src/lib/upsellCopy/luckyNumbers.ts` |
| **Hinge** | the letters' own line: luck "comes round, finds nobody home, and moves on." Her numbers show her the days. This bracelet is for going out to meet them |
| **Personal details** | none beyond `{firstName}` |

## Two bracelets: what each one does

Path A has just bought a citrine bracelet. So U2 says straight away what's different. The difference comes from V1's own bracelet copy: V1 puts the U1 stone on the **left** wrist, the side that receives, and the Manifestation Bracelet on the **right**, the side that goes out ("Your right side is your broadcasting side").

| | Citrine bracelet (U1) | Manifestation Bracelet (U2) |
|---|---|---|
| Wrist | left | right |
| Job | holds her **one wish**: what she's asking for | works on **what goes out from her**: getting out of the door, saying yes, noticing a chance |
| Stones | citrine alone | eight, citrine one of them |
| Evelyn's line | "One knows what you're asking for." | "The other makes sure you turn up." |

- **Path B has no citrine bracelet.** Nothing on her path names one.
- **Citrine is in both.** The `STONES` citrine line now reads the same on either path. On this bracelet it is "one of eight, with one small job".

**The trap.** Numbers + "attractor" reads as a win machine. So the bracelet says out loud that it wins nothing: *"It won't win you anything."* No sums, no tickets, no dates.

---

## Opening beats

**`PATH_A_OPEN`** *(took U1: she has a citrine bracelet coming)*

> {firstName}... both are booked. Your reading comes within 24 hours, and your citrine goes in the post once your ritual's done.
>
> Now, I'm about to offer you a second bracelet, and I know how that sounds. So let me tell you straight away what's different.
>
> Your citrine does one job. It sits on your left wrist and holds your one wish.
>
> It doesn't get you out of the door on your days. Your reading doesn't either. That part's still up to you.
>
> And I told you what happens on a lucky day you stay in. Luck comes round, finds nobody home, and moves on.

**`PATH_B_OPEN`** *(declined U1 and its downsell: no citrine)*

> {firstName}... that's your call, and I'll leave it there. Your reading will be with you within 24 hours either way.
>
> But there's one thing from my letter I want to say a bit more about.
>
> Most women's lucky days go by like any other day. They stay in. They put the call off till Monday.
>
> And luck comes round, finds nobody home, and moves on.

**`GAP`** *(both paths)*

> Your numbers tell you which days, {firstName}. They can't walk you out into them.
>
> And most of what's good on a lucky day happens out there. A call you return. A room you walk into. A yes you'd normally put off.
>
> Stay in, and the day's still lucky. There's just nobody there to meet it.

---

## The rest of the flow, so nothing old leaks

### Route (`chain`)

| Edge | V1 | 12 | Why |
|---|---|---|---|
| `PATH_A_OPEN`, `PATH_B_OPEN` → | `MANIFEST_REVEAL` | `GAP` | The AI reveal needs a bucket 12 doesn't have |
| `GAP` → | `QUESTION_1` | `INTRODUCE` | Q1's text ("removing something and calling something in") can't be overridden |
| `STONES` → | `QUESTION_2` | `RITUAL_INSTRUCTION` | Q2's text can't be overridden, and the personalise step needs a bucket |
| `WHAT_RECEIVE` → | `QUESTION_3` | `PRICE` | Q3's text is "start calling it in". `SOCIAL_PROOF` is skipped: "hundreds of seekers… their stories" is a testimonial claim |

**`pauses`:** `GAP`: *Go on* · `STONES`: *I'm listening*

### Lines

| Export · index | 12 |
|---|---|
| `INTRODUCE[0]` | V1 ("That's why I created something specific for this moment.") |
| `INTRODUCE[1]` | Not to guard you. Not to win you anything. For what goes out from you. |
| `INTRODUCE[2]` | Eight stones on one bracelet, and each one has its own job on the days your numbers mark. |
| `INTRODUCE[3]` | I call it a Manifestation Bracelet. And I only offer it to women who've just asked for their numbers. |
| `INTRODUCE[4]` | You have, {firstName}. That's why I'm offering it now. |
| `STONES[0]` | Eight stones, {firstName}. Each one does something different with the luck that comes near you. |
| `STONES[1]` | Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected chances. The good things you've walked past because your head was somewhere else. |
| `STONES[2]` | Citrine — the merchant's stone. Here it's one of eight, with one small job: it helps you feel you've earned the good things when they come, so you don't wave them off. |
| `STONES[3]` | Amethyst — your intuition stone. It helps you notice a good chance while it's in front of you, not a week later. |
| `STONES[4]` | Tiger's Eye — the stone of bold action. It goes to work on the chances that take courage, the ones you'd normally hesitate on, and it gets you to say yes. |
| `STONES[5]` | And four more working together. Clear Quartz to make every one of them stronger. Hematite to keep your feet on the ground. Pyrite to make you seen. And Malachite to pull growth toward you like a magnet. |
| `STONES[6]` | Eight stones. Eight signals. All charged while your numbers are on my table. |
| `RITUAL_INSTRUCTION[0]` | V1 ("You'll wear this on your right wrist, {firstName}. Always the right.") |
| `RITUAL_INSTRUCTION[1]` | Your right side is the side that reaches out. Every room you walk into, every call you make, every yes you say. |
| `RITUAL_INSTRUCTION[2]` | For a long time, what's gone out from that side is "not today" and "maybe next week". |
| `RITUAL_INSTRUCTION[3]` | I charge it to your numbers. So on the days that count, you go out and meet your luck instead of waiting in for it. |
| `RITUAL_INSTRUCTION[4]` *(new)* | It won't win you anything, {firstName}. It won't pick a ticket for you. I'm not going to pretend it does. It gets you out of the door on the days that count. |
| `RITUAL_PATH_A_EXTRA` *(Path A only)* | So your citrine on your left holds your one wish, and this one on your right gets you out to meet it. One knows what you're asking for. The other makes sure you turn up. |
| `WHAT_RECEIVE[0]` | I do the charging while your numbers are on my table. By the time the bracelet reaches you, it's done. |
| `WHAT_RECEIVE[1]` | You'll also get a short guide. It's a 3-minute ritual for the mornings, and it's simple. |
| `WHAT_RECEIVE[2]` | Wear it every day, and on your lucky days most of all. |
| `PRICE[0, 2]` | V1 |
| `PRICE[1]` | There's a 30-day guarantee. If you don't feel the difference in yourself, every penny back. |
| `URGENCY[0]` | I can only charge the stones while your numbers are on my table, {firstName}. Once your reading's sent, that's done. |
| `URGENCY[1]` | Your numbers work either way, bracelet or no bracelet. |
| `URGENCY[2]` | But if you want something on your right wrist when your days come... this is the moment. |
| `DOWNSELL[0, 1, 5]` | V1 |
| `DOWNSELL[2]` | I have a bracelet that's already been cleansed and prepared. It just hasn't been charged to anyone yet. It won't carry your numbers the way a fresh one would... |
| `DOWNSELL[3]` | But I can still tie it to you before I begin. The stones do their work on their own. |
| `DOWNSELL[4]` | I can send it to you for $30 instead. Same eight stones. Just prepared differently. |
| `SUCCESS[0, 3]` · `SUCCESS_NEEDS_SHIPPING[0, 3, 4]` · `SUCCESS_HAS_SHIPPING[0]` | V1 |
| `SUCCESS*[1]` | Your Manifestation Bracelet gets charged while your numbers are on my table. |
| `SUCCESS*[2]` | Eight stones, carrying your numbers. |
| `SUCCESS_HAS_SHIPPING[3]` | I'll send it to the same address as your citrine bracelet. |
| `SHIPPING_CONFIRMED[0–2]` | V1 |
| `SHIPPING_CONFIRMED[3]` | Watch your inbox. Your reading arrives within 24 hours. |
| `SHIPPING_CONFIRMED[4]` | Thank you for letting me do this, {firstName}. |
| `SHIPPING_CONFIRMED[5]` | Use your numbers the day they come, dear. Don't wait for the bracelet. |
| `SOFT_DECLINE[0]` | I understand, {firstName}. Your numbers do their job with or without it. |
| `SOFT_DECLINE[1]` | Just don't stay in on your days, dear. Go out and meet them. |
| `SOFT_DECLINE[2]` | V1 |
| `SOFT_DECLINE[3]` | Take care. And remember your promise: turn up, don't chase. |

**`downsellDeclineLabel`:** No thanks, just my numbers

**`downsellReassurance`:** empty — `DOWNSELL[4]` already says it

**`placeholderNames`:** `["Friend"]`

## Build notes

- **The second bracelet is named in Path A's second line**, before she can wonder. The job split (left holds the wish, right goes out) is V1's own left/right logic, so nothing new is invented.
- **No lava.** V1's Path A line and `RITUAL_PATH_A_EXTRA` both say "lava stone". Both are replaced. V1's `SUCCESS_HAS_SHIPPING[3]` says "your protection stone", and is replaced too. On 12 only Path A has an address (the reading is digital), so "the same address" is always the citrine's.
- **Path B never names the citrine.** The `STONES` citrine line reads the same with or without one.
- **No dates.** "Your lucky days", never "January" or "every month".
- **No win, no sum.** V1's citrine line ("attracts wealth") and `STONES[5]` ("abundance frequency") are replaced. The attractor and magnet lines stay, pointed at chances, not money.
- **No testimonials.** `SOCIAL_PROOF` is skipped, and V1's `WHAT_RECEIVE[1]` ("my seekers tell me…") is replaced.
- ⚠ **`DOWNSELL[4]` types "$30"**, as 11's does. The U2 engine has no `{downsellPrice}` token (U1's does now).
- ⚠ **`PRICE[0]` is V1's and types "$47"**, as on every offer.
- ⚠ **She may own the bracelet already.** The list is V1 buyers, as on 11.
