# 11-U1a — U1 opening beats *(The Unsent Letter → Protection Ritual)*

| | |
|---|---|
| **Product sold** | V1's **Protection Ritual + charged lava stone**, unchanged. Price from `{upsellPrice}` in V1's `UPSELL_OFFER[0]`, never typed |
| **Fit** | Strong. A guard on what comes in is exactly "Protect what's coming back to you" |
| **Sells** | "Protect what's coming back to you." |
| **Engine** | shared `useUpsellChat.ts` + a copy object in `client/src/lib/upsellCopy/` |
| **Runs** | right after payment, BEFORE she has read anything. Every line is true of every buyer |
| **Personal details** | none beyond `{firstName}`, which falls back to "dear". She gave her birth name and date, and they are not used here. The three free cards are fair: every buyer has them |
| **Hinge** | the product's own last line: *"It's back. What you do with it is on you."* The reading gets it back. Keeping it is a separate job |

**The trap, and how this avoids it**

| The product says | So the upsell must never say |
|---|---|
| It comes back when she reads it | the reading needs a stone to work |
| She never has to contact them | anything that leads her to them, or that they're coming |
| The last of her twelve holds what to stop and what to do | the stone gets her through the pull instead |
| What they took is named in cards 1–3 | any hint at it. Keep out: nerve, trust, laugh, safe, freedom, looked after, judgement, worth, softness |
| The fork is answered in Act 3 | which way it goes |

The threat is her own openness and "the ones who take", as a type. ⛔ Never them coming back.

---

## Opening beats

**`CONFIRMATION`**

> It's done, {firstName}. I'll lay your twelve and write out the letter myself, and your reading will be with you within 24 hours.
>
> You've got nothing to do for that. You don't write to anyone, and you don't look anyone up.
>
> Before I let you go, there's one thing your reading won't do for you, dear.

**`GAP`**

> Your reading gets it back to you. That part's settled, and it needs nothing else from you or from me.
>
> But here's what nobody tells you, {firstName}. Getting something back and keeping it are two different jobs.
>
> You've gone a long time without it. You've got no practice at holding on to it.
>
> The last time you had it, it left with someone, and nobody warned you it could.

**`RISK`**

> The weeks right after you read that letter are when it's easiest to lose.
>
> I told you that the next time someone reaches for you, there'd be someone there. I meant it.
>
> Now think what that means. Anyone who reaches will find you. The decent ones, and the ones who take.
>
> You've been hard to reach for a long time. It cost you plenty, but it also kept the takers off. That ends the day you read it.
>
> I've seen it too many times, {firstName}. A woman gets back what she lost, she feels it for the first time in years, and the first person who's kind to her walks off with it.
>
> And that's after the letter. Before it, you've got the Devil to get through. The closer your message comes, the harder you'll feel the pull.

**`QUESTION_1`**

> Tell me honestly, {firstName}. The last time you started to feel like yourself again, did someone come along and knock you straight back?

**`QUESTION_1_REPLIES`:** `Yes — that's happened to me` · `I think so, yes` · `I'm not sure`

**`AFTER_Q1` · `yes`**

> Then you know what I'm talking about.
>
> That wasn't bad luck, {firstName}. You'd only just got your feet under you, and nothing was standing guard.
>
> I don't want that twice.

**`AFTER_Q1` · `maybe`**

> Most women only see it looking back.
>
> You'd started going out again. You'd stopped checking. Then one person and one bad month, and you were back where you started.
>
> I'd rather you saw this one coming.

**`AFTER_Q1` · `unsure`**

> Then don't find out the hard way.
>
> You're about to get back something you've been without for a long time.
>
> I'd rather someone was keeping watch while you get used to it.

**`AFTER_Q1` · `default`**

> You know what I mean.
>
> Your reading gets it back. Keeping it is a separate job.
>
> Let me do that part.

**`SOLUTION`**

> That's why there's one more piece of work I do alongside a reading like yours. A Protection Ritual.
>
> It protects what's coming back to you. It's on you from the night I do the work, so your stone doesn't have to reach you first.
>
> And I anchor it to something you can hold, so it stays with you once the letter's read.

---

## The rest of the flow, so nothing old leaks

Every other line V1 would show her, and what happens to it. **Replace** = new line. **V1** = kept by reference, never retyped.

### Route (`chain`)

| Edge | V1 | 11 | Why |
|---|---|---|---|
| `RISK` → | `QUESTION_1` | same | Her own question, so it can be rewritten |
| `LAVA_INTRO` → | `QUESTION_2` | `RITUAL` | The hook hard-codes Q2's answers, and they say "Your energy recognized it" |
| `FEEL` → | `QUESTION_3` | `BUCKET` | Same problem: Q3 and its answers can't be overridden |

**`pauses`** (a tap to break the run, since two questions are gone): `RITUAL`: *I'm listening* · `BUCKET`: *Tell me*

**`bucketMessages`:** one block for everyone, below. 11 has no bucket, and V1's would return nothing.

### Lines

| Export · index | V1 line | 11 |
|---|---|---|
| `LAVA_INTRO[0–2]` | | V1 |
| `LAVA_INTRO[3]` | "…what's happening in your energy right now." | When a volcano erupts, it burns off the old ground and leaves new ground behind. That's what comes after your letter. |
| `LAVA_INTRO[4]` | "…absorbs negative energy…" | The stone is porous. It takes in what's coming at you before it gets to you. |
| `RITUAL[0, 2, 4, 5, 6, 7]` | | V1 |
| `RITUAL[1]` | "…when the veil between worlds is thinnest…" | Tonight, between 2 and 4am, when the house is quiet, I'll begin. |
| `RITUAL[3]` | "Using the energy signature from our conversation…" | I'll call you forward by your three cards. The Hermit, Judgement and the Devil are more than enough to find you by. |
| `FEEL[0]` | "You may feel something tonight…" | Some women feel it the night I work, {firstName}. |
| `FEEL[1]` | | Warmth in the chest. Dreams that stay with them after they wake. |
| `FEEL[2]` | "A sense of being watched over…" | Others feel nothing at all, and the work's done just the same. |
| `FEEL[3]` | "…working on your energy…" | If you feel it, that's me. Don't be alarmed. |
| `DELIVERY[0–3]` | | V1 |
| `DELIVERY[4]` | "…your energy field to fully heal." | The protection holds strong for at least 30 days, longer for most people. That covers the pull, and the first weeks after it's back with you. |
| `OFFER[0–1]` | | V1 |
| `OFFER[2]` | "…clearing AND protection…" | If you were at my table I'd tell you to have both. The letter gets it back. The stone helps you keep it. |
| `OFFER[3]` | "…tonight's ritual?" | Shall I do your stone tonight? |
| `SUCCESS[0, 3, 4]` | | V1 |
| `SUCCESS[1]` | "…clearing AND protection." | Your reading and your stone are both booked now. |
| `SUCCESS[2]` | "I'll perform them together tonight…" | I'll do your stone tonight. Your reading still comes within 24 hours. |
| `SHIPPING_CONFIRMED[0–2]` | | V1 |
| `SHIPPING_CONFIRMED[3]` | "…you may feel warmth…" | If you feel warmth tonight, or your dreams run vivid, that's me. |
| `SHIPPING_CONFIRMED[4]` | "…your clearing reading…" | Watch your inbox. Your reading arrives within 24 hours. |
| `SHIPPING_CONFIRMED[5]` | "Thank you for trusting me…" | Thank you for letting me do this, {firstName}. |
| `SHIPPING_CONFIRMED[6]` | "The universe is already responding…" | Now leave your phone alone. |
| `SOFT_DECLINE[0]` | "…your journey to walk." | I understand, {firstName}. That's your call. |
| `SOFT_DECLINE[1]` | "…next 30 days." | Just... be careful who you let close in the weeks after you read it. |
| `SOFT_DECLINE[2]` | "…old heaviness returning…" | And remember the Devil. When the pull comes, it's the chain, whatever it feels like. |
| `SOFT_DECLINE[3]` | "…always available if you change your mind." | Your reading's just as good without the stone. |
| `SOFT_DECLINE[4]` | "…your clearing reading…" | For now, watch your inbox. Your reading arrives within 24 hours. |
| `SOFT_DECLINE[5]` | "…thinking of you tonight during the work." | Take care of yourself, dear. And leave your phone where it is. |

### The stone block (`bucketMessages`, one for every buyer)

> Once your stone is charged, it stands between you and whatever comes at what's yours.
>
> `UPSELL_BUCKET_MESSAGES.love[1]` — V1's left-wrist line, kept because `DELIVERY` and U2 lean on it
>
> The left side takes things in. Every person who reaches for you, every kind word that wants something, passes through that hand first.
>
> The stone takes the weight of it before it gets to you. You'll still see who they are, {firstName}. You'll see them before they've got hold of anything.
>
> It doesn't do your twelve's job. They tell you what to stop and what to do. The stone stands on your left while you do it.

**`acceptLabel`:** Yes, protect what's coming back

**`placeholderNames`:** `["Friend"]`

---

## Build notes

- **Why every line was checked, not just the three banned terms.** The brief also bans "may", "energy", "journey" and "the universe", and V1 is full of them. Everything banned that a copy object can reach is replaced above.
- ⚠ **One line I can't reach.** `UpsellCTA.tsx` line 18 prints "Take your time. This is your journey." It's a shared component, so changing it needs code. The price line under the button ("includes charged stone + free shipping") is fine.
- **Reveal words in old V1.** "Thank you for trusting me" and "being watched over" sit close to two of the answers, so both went.
- **"The veil between worlds" went on purpose.** The list can't be filtered for widows (11-A), and this offer opens with someone at Evelyn's shoulder. One line after payment shouldn't blur "this is someone living".
- **"Always available if you change your mind" went.** Nothing in code keeps that promise.
- **No "most of my clients".** V1 says it and 04 says it. 11 has no clients yet.
- **Timing.** "Tonight" is only ever about the stone, as in 04. The reading is always "within 24 hours". The stone ships within 48 hours and then travels, so `SOLUTION` says the guard starts before it arrives.
- **Fits the operator's "no blame".** "The first person who's kind to her walks off with it" puts the act on the taker. "Nobody warned you" takes it off her.
- ⚠ **She has the stone already, in many cases.** The list is V1 buyers, so this repeats the problem parked in `02-C1`: Evelyn pitching a stone she sold her. Measure the overlap before the send.
- **`{firstName}` × 5** on any one path through the opening beats, close to 09.
- **To copy into `copy-check.cjs`:** an `'11'` entry with sla `24 hours` and prices `35`, `12.77`, `47`, `30`.
