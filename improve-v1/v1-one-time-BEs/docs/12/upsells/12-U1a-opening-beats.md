# 12-U1a — U1 opening beats *(Lucky Numbers → Evelyn's Wish Ritual + charged citrine bracelet)*

| | |
|---|---|
| **Product sold** | **Evelyn's Wish Ritual + charged citrine bracelet** *(new product: code and supplier to settle)*. Replaces V1's Protection Ritual + lava stone for this offer, in the same shape: Evelyn does the work, the stone carries it. Price from `{upsellPrice}`, never typed |
| **Price** | **$47, downsell $30** if she declines (operator, 2026-11-02). Both reach the copy as tokens, `{upsellPrice}` and `{downsellPrice}`. ⚠ `{downsellPrice}` doesn't exist yet: see "Settle before code" |
| **Fit** | Strong. Her reading gives her twelve dated days and nothing to ask for on them. Evelyn's ritual readies a stone to carry one wish into them |
| **Sells** | "One wish, twelve days for it to land." |
| **Engine** | shared `useUpsellChat.ts` + the copy object `LUCKY_NUMBERS_UPSELL1` in `client/src/lib/upsellCopy/luckyNumbers.ts` (a placeholder today), shaped like `unsentLetter.ts` |
| **Runs** | right after payment, BEFORE she has read anything. Every line is true of every buyer, under both letter arms (A and B) |
| **Personal details** | none beyond `{firstName}`, which falls back to "dear". Evelyn works the ritual with the birth name and date the buyer has already given. The copy says they exist, and never prints them. She also has 3 lucky numbers, 6 ticket numbers, a PIN, 12 open days and a number to stop using: named as things only, never their values |
| **Hinge** | the bridge: *"Your numbers tell luck when to find you. They can't tell it what you want."* The reading gives the days. The ritual carries her wish into them |
| **Who does what** | **Evelyn** does the ritual, charges the citrine and posts the bracelet. **She** puts it on and makes one wish. That's all |
| **When** | the ritual is done **before the bracelet is posted**, and it ships within 48 hours. No moon date, no "tonight" |
| **Promise level** | arm B's: no win, no cheque, no sum. The wish is steered off money ("the thing itself, not the money for it") |

**The trap, and how this avoids it**

| The product says | So the upsell must never say |
|---|---|
| Her twelve open days are hers, worked out by code from her birth name and date | the reading needs the ritual or the bracelet to work, or the days are weaker without them |
| Code works out every number and date | the ritual adds, moves or changes a day or a number |
| No win is promised (arm B level, used for both arms) | the wish comes back as a win, a cheque or a sum. Any money outcome |
| She promised not to chase (in the letter) | the ritual makes tickets pay, or "buy on your days and wear it" |
| The reading names a number to stop using | the ritual cancels it, or she can keep using it now |
| Evelyn has her birth name and date already | either value printed, or a request to send them again. Nor a request for the wish: it stays hers |
| One wish | more than one wish, a list, or a new wish each month |

The gap is hers to fill, not the reading's to fix: *"Luck doesn't know what you're hoping for. You've never told it."* ⛔ Never "your reading is missing something".

---

## Opening beats

**`CONFIRMATION`**

> It's done, {firstName}. Your numbers are booked, and your reading will be with you within 24 hours.
>
> Your three lucky numbers, your six for a ticket, your PIN, the number to stop using, and your twelve open days. All of it from your birth name and date.
>
> Before I let you go, there's one thing your reading can't do for you, dear.

**`GAP`**

> Your reading gives you the days. Twelve of them, one in every month. That part's settled, and it needs nothing else from you or from me.
>
> But here's what nobody tells you, {firstName}. Your numbers tell luck when to find you. They can't tell it what you want.
>
> Luck will turn up on each of your open days. Luck doesn't know what you're hoping for. You've never told it.
>
> So it brings whatever's nearest. A nice afternoon. A good parking space. And the thing you really wanted goes on waiting.

**`RISK`**

> A lucky day with nothing asked for goes to waste.
>
> You've got twelve of them coming in 2027. Twelve days when luck can reach you, and most women walk through every one with their hands empty.
>
> They don't ask, because nobody told them to. Then the year's gone, and they say it was a nice enough year.
>
> And January's comes first. You'll have the date within a day. What you won't have yet is something to ask it for.

**`QUESTION_1`**

> Tell me honestly, {firstName}. Is there one thing you've wanted for a long time, and stopped saying out loud?

**`QUESTION_1_REPLIES`:** `Yes — there's one thing` (`yes`) · `Maybe there is` (`maybe`) · `I'm not sure` (`unsure`)

> ⚠ *Build note (A7):* the engine reads her branch from the reply's **words**, not its value. "There might be" matched no pattern and fell to `default`, so the middle reply is wired as "Maybe there is". The test checks each reply reaches its own branch.

**`AFTER_Q1` · `yes`**

> Then you already know your wish.
>
> Keep it to yourself. Don't tell me, and don't type it here. I don't need it for what I do.
>
> Just hold on to it. You'll need it.

**`AFTER_Q1` · `maybe`**

> Most women have one. It's just gone quiet.
>
> The house. The trip. The yes from someone who keeps saying later.
>
> Whatever came to mind just now, hold on to that one.

**`AFTER_Q1` · `unsure`**

> All right. Don't force it.
>
> When your reading comes and you see your twelve days, one thing will come to mind.
>
> I'd just hate for January's day to get here before you've got it.

**`AFTER_Q1` · `default`**

> You know what I mean.
>
> Your reading gives you the days. What you ask for on them is up to you.
>
> Let me help with that part.

**`SOLUTION`**

> So there's one more piece of work I do alongside a reading like yours. A Wish Ritual.
>
> I work it for you, with the birth name and date you've just given me, and I charge a citrine bracelet in it.
>
> Then I post the bracelet to you. You put it on and make your one wish. That's all you do. One wish, and twelve days for it to land.

---

## The rest of the flow, so nothing old leaks

Every other line V1 would show her, and what happens to it. **Replace** = new line. **V1** = kept by reference, never retyped. V1's U1 is the lava stone, so more is replaced here than in 11. The ritual's shape is V1's own: the altar, the two hours, the stone left out till dawn.

### Route (`chain`)

| Edge | V1 | 12 | Why |
|---|---|---|---|
| `RISK` → | `QUESTION_1` | same | Her own question, so it can be rewritten |
| `LAVA_INTRO` → | `QUESTION_2` | `RITUAL` | Q2 is about lava ("Transformation through fire…"), and its answers say "Your energy recognized it". It can't be overridden |
| `FEEL` → | `QUESTION_3` | `BUCKET` | Q3 asks "Are you ready to be protected?" and can't be overridden |

Same as 11. **`pauses`**: `RITUAL`: *I'm listening* · `BUCKET`: *Tell me*

**`bucketMessages`:** one block for everyone, below. 12 has no bucket, and V1's would return nothing.

### Lines

`LAVA_INTRO` keeps its engine name but holds the citrine.

| Export · index | V1 line | 12 |
|---|---|---|
| `LAVA_INTRO[0]` | "For your protection, I use volcanic lava stone." | For your wish, I use citrine. |
| `LAVA_INTRO[1]` | | V1 ("It's not a random choice, {firstName}.") |
| `LAVA_INTRO[2]` | "Lava is born from the Earth's core…" | Citrine's a yellow stone, the colour of late sun. Shopkeepers used to call it the merchant's stone, and kept a piece in the till. |
| `LAVA_INTRO[3]` | "…what's happening in your energy right now." | I use it for a plainer reason. Citrine is the stone for asking. |
| `LAVA_INTRO[4]` | "…absorbs negative energy…" | Citrine holds one thing at a time, and holds it well. So it's one wish, not a list. |
| `RITUAL[0]` | | V1 ("Here's exactly what I'll do for you, {firstName}...") |
| `RITUAL[1]` | "Tonight, between 2 and 4am…when the veil between worlds is thinnest…" | Before your bracelet's posted, I'll wait till the house is quiet, and I'll begin. |
| `RITUAL[2]` | | V1 ("I'll place your stone on my altar, beside a white candle and a vessel of blessed water.") |
| `RITUAL[3]` | "Using the energy signature from our conversation…" | I'll call you forward by your birth name and your birth date. They're all I need to find you by. |
| `RITUAL[4]` | "…the protection invocation…" | Then I'll speak the old words for asking over your citrine, so it's ready to carry one wish. |
| `RITUAL[5]` | "…sealing your frequency into it." | I'll pass it through sage smoke seven times, and from then on it's yours. |
| `RITUAL[6]` | | V1 ("The ritual takes about two hours. It drains me... but for those who are ready, it's necessary work.") |
| `RITUAL[7]` | | V1 ("When I'm done, I'll place your stone under moonlight until dawn to lock the charge.") |
| `FEEL[0]` | "You may feel something tonight…" | Some women feel it the night I work, {firstName}. |
| `FEEL[1]` | "Warmth spreading through your chest…" | Warm hands. A dream that's still there in the morning. |
| `FEEL[2]` | "A sense of being watched over…" | Others feel nothing at all, and the work's done just the same. |
| `FEEL[3]` | "…working on your energy…" | If you feel it, that's me. Don't be alarmed. |
| `DELIVERY[0–1]` | | V1 ("Once the ritual is complete, I'll ship your charged stone directly to you." · velvet pouch with a card). The card is V1's, unchanged: the citrine is in stock and ships with the exact same instructions as the lava stone (operator, 2026-11-02). So the copy never says what the card says about the wish |
| `DELIVERY[2]` | "…say: 'I am protected. I am transforming.'" | When it arrives, follow the card in the pouch to put it on, and make your one wish as you do. |
| `DELIVERY[3]` | "That phrase activates the bond…" | Then just wear it. The stone does the carrying. |
| `DELIVERY[4]` | "…your energy field to fully heal." | Your bracelet will be with you before your first open day in January, {firstName}. |
| `OFFER[0]` | "The Protection Ritual is {upsellPrice}…" | Your Wish Ritual is {upsellPrice}, {firstName}. |
| `OFFER[1]` | "…charged volcanic stone shipped…" | That includes your charged citrine bracelet, shipped straight to your door. |
| `OFFER[2]` | "…clearing AND protection…" | If you were at my table I'd tell you to have both. Your reading gives you the days. The ritual carries your wish into them. |
| `OFFER[3]` | "…tonight's ritual?" | Shall I do your Wish Ritual? |
| `SUCCESS[0]` | | V1 ("Beautiful choice, {firstName}.") |
| `SUCCESS[1]` | "Both rituals are now confirmed…" | Your reading and your Wish Ritual are both booked now. |
| `SUCCESS[2]` | "I'll perform them together tonight…" | I'll do your ritual before your bracelet's posted. Your reading still comes within 24 hours. |
| `SUCCESS[3]` | "Your charged volcanic stone will ship within 48 hours." | Your charged citrine bracelet ships within 48 hours. |
| `SUCCESS[4]` | | V1 ("I just need to know where to send it.") |
| `SHIPPING_CONFIRMED[0]` | "…Your protection stone is on its way…" | Perfect. Your bracelet goes in the post as soon as your ritual's done, {firstName}. |
| `SHIPPING_CONFIRMED[1]` | "…'I am protected. I am transforming.'" | Remember, when it arrives, put it on and make your one wish. |
| `SHIPPING_CONFIRMED[2]` | | V1 ("That seals the bond.") |
| `SHIPPING_CONFIRMED[3]` | "Tonight, as I work, you may feel warmth…" | If you feel warmth the night I work, or your dreams run vivid, that's me. |
| `SHIPPING_CONFIRMED[4]` | "…your clearing reading…" | Watch your inbox. Your reading arrives within 24 hours. |
| `SHIPPING_CONFIRMED[5]` | "Thank you for trusting me…" | Thank you for letting me do this, {firstName}. |
| `SHIPPING_CONFIRMED[6]` | "The universe is already responding…" | Now go and think about that wish. |
| `SOFT_DECLINE[0]` | "…your journey to walk." | I understand, {firstName}. That's your call. |
| `SOFT_DECLINE[1]` | "…next 30 days." | Your reading's just as good without the ritual. Your twelve days are yours either way. |
| `SOFT_DECLINE[2]` | "…old heaviness returning…" | Just don't let them go by empty. Pick one thing you want, and on each open day, ask for it. |
| `SOFT_DECLINE[3]` | "…always available if you change your mind." | For now, watch your inbox. Your reading arrives within 24 hours. |
| `SOFT_DECLINE[4]` | "…your clearing reading…" | Take care of yourself, dear. |
| `SOFT_DECLINE[5]` | "…thinking of you tonight during the work." | *(dropped: 12 has five lines, not six)* |

### The downsell *(new for U1: $47 → $30)*

Modelled on V1's U2 (`useUpsell2Chat.ts`: decline → `OBJECTION_1` → `DOWNSELL` → `DOWNSELL_CTA`, and a second decline → `SOFT_DECLINE`). U1's engine has no such stage today, so this needs code (see "Settle before code").

**Route:** decline at the offer → **`DOWNSELL`** → downsell button → accept = `SUCCESS` (the same lines, nothing in them names a price) · decline again = `SOFT_DECLINE`.

**Nothing is different at the lower price.** Same ritual, same citrine, same posting. So Evelyn just meets her halfway and says so. V1 U2's devices are left out on purpose: "Let me do something I don't normally do", a pre-made bracelet "not attuned to anyone yet", and "the stones alone cost me nearly that" are each a reason that isn't true here.

**`DOWNSELL`**

> `UPSELL2_DOWNSELL[0]` — V1's "{firstName}... I hear you."
>
> I don't want the price to be the reason your days go by empty.
>
> So let me meet you halfway.
>
> Same Wish Ritual, the same citrine charged the same way, and posted to you the same way. Nothing's left out.
>
> I'll do it for {downsellPrice} instead.

**Downsell accept label** *(new prop, see below)*: Yes, do my Wish Ritual for {downsellPrice}

**`downsellDeclineLabel`:** No thanks, just my reading

**`downsellReassurance`:** "" *(empty, as 11's U2: the bubble above already says it's the same, and V1's line says "Same manifestation energy")*

### The bracelet block (`bucketMessages`, one for every buyer)

> Once your citrine's charged, it carries my work, and it's waiting for one wish.
>
> `UPSELL_BUCKET_MESSAGES.love[1]` — V1's left-wrist line ("Wear it on your LEFT wrist — your receiving hand."), kept as 11 kept it
>
> When it arrives, sit somewhere quiet. Think of your one wish, the thing itself and not the money for it. Then put it on.
>
> Your part ends there. Don't tell me the wish, and don't tell anyone else.
>
> On each of your open days, touch the stone. Once is enough.
>
> The bracelet doesn't do your reading's job. Your reading gives you the twelve days, and they're yours either way. The bracelet carries what you're asking for on them.

**`acceptLabel`:** Yes, do my Wish Ritual

**`ctaReassurance`:** Take your time. *(as 11: V1's shared line says "This is your journey")*

**`placeholderNames`:** `["Friend"]`

---

## Build notes

- **Evelyn's ritual is the hero; the bracelet goes with it** (operator, 2026-11-02). `SOLUTION` sells "a Wish Ritual" first, and the bracelet is what she charges in it. `OFFER`, `SUCCESS` and `acceptLabel` all name the ritual. Her part is two acts: put it on, make one wish. The open-day touch is one light line in the block. Drop it if it clutters.
- **The ritual is V1's, with the wrong words swapped.** V1's altar, two hours and dawn lines (`RITUAL[2, 6, 7]`) are kept by reference. Only the 2–4am "veil" line, "our conversation", the "protection invocation" and "frequency" are replaced.
- **When.** "Before your bracelet's posted" (`RITUAL[1]`, `SUCCESS[2]`, `SHIPPING_CONFIRMED[0]`) is true for every buyer, because it ships within 48 hours. There's no "tonight" and no moon date. `RITUAL[7]` (V1's "until dawn") and "the night I work" imply a night, which is still true.
- **Her details are named, never shown.** "With the birth name and date you've just given me" (`SOLUTION`) and "I'll call you forward by your birth name and your birth date" (`RITUAL[3]`). She typed both on the booking page before paying, so the line is true for every buyer. The values never appear, and she's never asked for them, or for the wish.
- **One wish, held to the end.** "One wish" appears in `SOLUTION`, `LAVA_INTRO[4]`, `RITUAL[4]`, `DELIVERY[2]`, `SHIPPING_CONFIRMED[1]` and the block. Nothing says "wishes", or a new wish each month.
- **The trap is closed in four places**: `GAP[0]` ("needs nothing else from you or from me"), `OFFER[2]`, `SOFT_DECLINE[1]` ("just as good without the ritual") and the block's last line. `SOFT_DECLINE[2]` gives the woman who declines the asking for free. It's true without the ritual, and it keeps the reading whole.
- **Money is steered out, not banned out loud.** The block: "the thing itself and not the money for it". The examples in `AFTER_Q1 · maybe` are a house, a trip and a yes. Nothing promises a win, a cheque or a sum, so it's safe under both letter arms.
- **The hook line opens `RISK` on its own**: "A lucky day with nothing asked for goes to waste." It's the one aphorism kept, on purpose.
- **Citrine folklore is two lines** (`LAVA_INTRO[2–3]`): the merchant's stone, a piece in the till. Told as what shopkeepers did, not as a claim about money.
- **Banned words checked.** No "energy", "energy field", "clearing", "our conversation", "the universe", "journey", "may" in any new line. No testimonials, no invented people, no "most of my clients". Every V1 line that carries one is replaced above.
- **`{firstName}`** appears 3 times in the opening beats on any path (`CONFIRMATION`, `GAP`, `QUESTION_1`), then about once per stage. Close to 11.

### ⚠ Settle before code

1. **The January claim (`DELIVERY[4]`).** "With you before your first open day in January" holds for orders now (early November): the ritual, up to 48 hours to ship, then travel. It fails for a late-December order if her January day falls early in the month. Two fixes: the code never puts January's day before about Jan 10, or this upsell is switched off after a cut-off, about Dec 10 (earlier for overseas).
2. ~~The bracelet must tie.~~ Settled (operator, 2026-11-02): the citrine bracelet is in stock, the same kind as the lava one, so the copy says "put it on".
3. ~~The card in the pouch.~~ Settled (operator, 2026-11-02): exact same instructions as the lava stone. ⚠ So the one wish is Evelyn's spoken ask in the chat only. Never claim the card mentions it.
4. ⚠ **Two bracelets, and citrine twice.** U2 is still V1's Manifestation Bracelet (12-U2a). She'd be offered a bracelet straight after a bracelet, and U2's eight stones include citrine. U2's Path A also leans on V1's "lava stone on your left" line, and the left wrist is now the citrine's. U2 needs a different product or new beats before this goes live.
5. **Code outside the copy object.** Today U1's accept button always charges `be_protection_ritual`. The Wish Ritual needs its own product code and price ($47) in `BACKEND_UPSELLS` (`server/lib/backendCustomerList.ts`), its own upsell tag, a shipping path and a picture (12-DELIVERABLES, U1 row).
5a. ⚠ **The U1 downsell is new code, not just copy.** `Upsell1Copy` has no `DOWNSELL`, and `useUpsellChat.ts` goes straight from a decline to `SOFT_DECLINE`. It needs: a `DOWNSELL` array and `downsellDeclineLabel` / `downsellReassurance` / an accept-label prop on `Upsell1Copy`; a decline → `DOWNSELL` → downsell-CTA step in the hook (copy U2's `OBJECTION_1` path); a $30 charge on the Wish Ritual's product code; and a `{downsellPrice}` token. **No `{downsellPrice}` token exists anywhere yet.** V1's U2 types "$30" into its copy and its hard-coded accept label ("Yes, send me the bracelet for $30"), and 11's U2 copied that with a ⚠. Add the token beside `{upsellPrice}` in `upsellMessages.ts` (fed from the server, like `upsell1PriceCents`), so the number is never typed. Until then, offers without a U1 downsell must render exactly as today.
6. **`UpsellCTA.tsx`'s price line** ("includes charged stone + free shipping") is shared code. It now reads true ("charged stone"), but a per-offer "charged citrine bracelet" would be cleaner.
7. **To copy into `copy-check.cjs`:** a `'12'` entry with sla `24 hours` and prices `35`, `12.77`, `47`, `30`, plus U2's prices once U2 is settled.
8. **`SOFT_DECLINE` now follows two declines**, not one. Its lines still read right after the downsell ("I understand, {firstName}. That's your call.").
