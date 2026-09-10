# 08 Marcus — audio upsell scope


> **Latest confirmed decisions:** standard delivery within 24 hours; +$12.77 bump within 12 hours, both measured from confirmed main payment. Audio shares that order deadline. Use Replicate Chatterbox with the Marcus voice Joel will supply. Create a NEW Marcus n8n workflow; existing workflows must remain untouched. See the delivery policy and Chatterbox setup in the n8n folder. These decisions supersede older open-timing/provider notes below.

Status: proposed product and copy for review, 2026-09-10. Joel approved the audio direction and a local-first build. Price, delivery terms, and narration method remain open. This brief does not authorize live payments, publishing, or customer delivery.

Related: [copy shape](SHAPE.md) · [n8n build plan](../n8n/AUDIO-BRANCH.md) · [funnel checklist](../FUNNEL-BUILD-CHECKLIST.md) · [booking scope](../booking-page/SCOPE.md).

## Confirmed context

- [x] Journey: AWeber daily email → booking page and main payment → bridge page → Upsell 1 → thank-you. n8n fulfills purchased products in the background.
- [x] Main reading costs $35. The optional +$12.77 speed upgrade appears on the booking page and changes delivery from 24 hours to 12 hours.
- [x] Face-up cards remain fixed to the purchased daily edition. Previously face-down positions are drawn separately for each buyer and saved for reuse.
- [x] A separate personal card comes from the buyer’s first and last name. The written report interprets the spread through that card’s lens.
- [x] Upsell 1 is an audio recording of that buyer’s personalized spread.
- [x] Build and test locally first. Product refinement and simulated flows can proceed without live services.

## The reason to buy audio

**Direction approved for a new writing round:** lead with a firm warning about skipping straight to the conclusion, explain what that loses, then why listening in sequence helps. Follow [the argument brief](WRITING-BRIEF.md) and [SHAPE.md](SHAPE.md). The earlier softer framing below is background, not the lead.

When someone has a question on her mind, it is understandable to look for the answer first. The value of audio is a different way to spend time with the reading: hear the explanation in order, follow how one card relates to another, and pause or replay a passage that matters.

This is a proposed customer motivation, not a measured claim about buyer behavior. Do not claim that most buyers skip the report, that listening guarantees understanding, or that audio requires someone to absorb everything. A player should allow seeking, pausing, and changing speed.

**Offer promise:** Hear your personal reading, card by card, with the connections and reflection intact.

The written reading must already deliver the complete purchased interpretation. Audio adds a listening format; it must not contain withheld answers, a better draw, stronger personalization, or another charge to complete the original promise. Speed belongs to the booking-page upgrade, so the audio offer should sell listening and replay rather than faster fulfillment.

## Proposed product definition

- [ ] One narrated version of the buyer’s completed and approved written reading, using the same question, edition, fixed face-up cards, saved buyer draw, and name-derived personal card.
- [ ] Narrate the report’s explanation in an order that makes sense when heard. Light spoken-language edits are allowed; new card interpretations or changed advice are not.
- [ ] Include the personal card’s name and explain how its themes shape this reading. Do not merely insert the buyer’s name into an otherwise generic script.
- [ ] Include the context needed to understand the face-up cards without turning the free email into the bulk of the paid audio.
- [ ] Preserve the main interpretation, relationships between positions, and closing reflection from the report. Confirm the exact written-report structure before freezing the narration template.
- [ ] Proposed access: a private listening page with play/pause, seek, playback speed, and an accessible text alternative. Downloadable audio is a separate decision.
- [ ] Proposed production default: clear narration without music. Avoid background sound that competes with the words. Music, if later chosen, needs appropriate rights and a separate volume/accessibility review.
- [ ] Duration follows the approved reading length. Measure sample recordings before stating minutes in the offer; do not pad the script to meet an invented length.

The product is an adaptation of the purchased report, not a fresh reading. The report is the source of truth. Audio generation waits for an approved report artifact and uses its stored version; retries never redraw cards or regenerate the underlying report merely to make audio.

## The shape of the Upsell 1 copy

[audio copy shape](SHAPE.md) is the craft authority, just as [the daily SHAPE.md](../daily-email/SHAPE.md) is for the daily. It includes the writing brief, page movement, rules for the close, stage-aware facts, two complete worked examples, and an editorial checklist.

**The movement:** confirm the written purchase → stay with her question → explain a connection worth hearing → offer the audio format → finish that thought with a question-specific invitation → state the additional price and a clear decline.

The key difference from the daily is her purchase state: she already owns the written interpretation. The page gives her a reason to listen to that reading. It does not restart the argument for buying the reading or imply the written answers are incomplete.

The whole argument must grow out of the question. For healing, connect self-blame with the support she could accept and a passage she may want to revisit. For commitment, connect her own needs with a next step she may want to think through before a conversation. A generic paragraph plus one swapped topic sentence is no longer the approved writing approach.

Keep Marcus’s cream paper, dark serif, restrained red and consistent readable body text. Product facts stay here; wording and complete examples live in the copy shape to avoid two competing templates.

### Purchase controls

- [ ] Show the approved additional price beside the audio offer, with one-time payment wording.
- [ ] Proposed accept CTA: **Add my audio reading — [approved price]**. The actual label must match the action: if it opens a payment review, say **Continue with audio — [approved price]** instead.
- [ ] Decline: **No thanks, continue to my order.** Make this a visible readable control, without shaming the customer or hiding it beneath a long page.
- [ ] Show the additional charge and existing purchase separately. Do not present the previously paid $35 or $47.77 as another charge.
- [ ] Add precise delivery and voice information once decided. Keep internal “pending” notes in this document; never put “Review placeholder” into customer copy.
- [ ] While the price is undecided, the local harness uses $17 as a clearly labeled provisional test value. Simulated acceptance creates only a local fixture entitlement; it is not a real payment or an approved commercial price.

## Decisions required before a real audio sale

| Decision | What needs choosing | Proposed direction for review |
|---|---|---|
| Price | One-time audio price and currency | Keep configurable and unset until Joel approves it. |
| Narrator | Human narration, licensed synthetic voice, or an authorized voice clone | State the actual method truthfully. “An audio version of your reading” works during exploration; “recorded personally by Marcus” requires that to be true. |
| Voice rights | Rights to the chosen voice, commercial usage, any cloning permission, attribution/disclosure obligations | Record permissions and provider terms before use. Do not clone a real person’s voice without authorization. |
| Provider | Narration provider, costs, supported language, pronunciation controls, retention and data-processing terms | Compare using a short fictional sample after provider evaluation is authorized. No provider is selected here. |
| Delivery | Audio timing, delivery channel, listening-page access, and download/retention policy | Deliver against the same verified order. Audio should not block delivery of the written reading. |
| Same-day coverage | Whether +$12.77 also accelerates subsequently purchased audio; timezone/cutoff and missed-deadline remedy | Do not assume the reading’s speed bump includes audio. State the approved audio deadline separately. |
| Script approval | How spoken edits are checked against the report; who resolves failed QA | Require content parity before release. Save report and narration-script versions. |
| Support | Audio generation failure, refund/cancellation remedy, and customer contact path | Preserve the paid written reading; resolve audio independently. Do not promise an unapproved refund policy. |

## What needs to be built in n8n

See [audio n8n build plan](../n8n/AUDIO-BRANCH.md) for the proposed node-by-node build, supporting backend operations, data records, and test matrix.

**Audio is a chain off the main 08 n8n flow**, after the written report is approved. It is not a separate audio workflow. The chain prepares the spoken script, generates and checks the recording, stores it privately, then queues its listening-link delivery.

The main flow queues written delivery independently before entering the audio chain. If an audio purchase arrives later, a verified audio-purchase event re-enters the same workflow at an audio-resume route, loading the saved report rather than generating another reading. If the report is not ready yet, save waiting state for the report-complete path to pick up. Atomic job claims prevent two events from generating the same recording twice.

The written report is the source of truth. Audio waits for its approval; written delivery does not wait for audio. Persist each stage outside n8n execution memory so a restart does not mean a fresh draw, fresh report, or duplicate narration bill.

This requires more than an added text-to-speech node. Backend job/entitlement records, script QA, a media assembly/check service, private file storage, a player, and a delivery adapter are part of the build. Existing local audio output is only a fixture script; it is not a recording or proof of n8n execution.

- [ ] Freeze report-to-audio source/version contract.
- [ ] Build durable job, segment, artifact and delivery records and backend operations.
- [ ] Extend the main n8n workflow with audio entry/reconciliation, generation, delivery, and recovery branches; export the main flow as inactive JSON.
- [ ] Build and test script adaptation and content parity checks.
- [ ] Select and configure narrator/provider; test pronunciation and spoken quality using a permitted sample.
- [ ] Build media assembly, playable-file QA, and private storage.
- [ ] Build the listening page, transcript access, and captured audio-ready email.
- [ ] Prove both event arrival orders, retries, restarts, late audio purchases, and independent written delivery locally.

## Local build and fulfillment contract

- [ ] Use a local sample with fictional customer details. Production voice generation and real delivery are outside the local mockup step.
- [ ] Main purchase success can lead to this offer while the report is processing. Main fulfillment starts independently of the customer’s upsell decision.
- [ ] Track audio entitlement separately against the verified parent order. A view, accept click, return URL, or pending charge is not payment proof.
- [ ] Narration job loads the immutable order draw, personal-card method/result, approved report ID/version, narration-script version, and chosen voice/config version.
- [ ] Give narration jobs a stable identity so payment replays and retries do not create duplicate work. Keep every attempt’s status without discarding successful assets.
- [ ] Store audio privately with restricted customer access. Keep names and reading content out of analytics and public URLs.
- [ ] Record the audio asset, duration, generation result, quality verdict, delivery state, and provider reference. Do not mark delivered when only generation has completed.
- [ ] Proposed product states: purchased → waiting for approved report → generating → QA → ready → delivered, with explicit failed/review states. Confirm exact names with the shared contract owner.
- [ ] Test adapters may return a clearly identified sample asset; they must not claim a personalized recording has been generated or sent.

## Failure behavior and acceptance checks

- [ ] Both upsell accept and decline lead to a usable thank-you/order page. Decline and abandonment do not cancel, delay, or alter the main reading.
- [ ] Pending or failed audio payment shows a recoverable state. Never retry a charge automatically because audio generation failed.
- [ ] Refresh, repeated clicks, webhook replay, and job retry produce one purchased audio entitlement and reuse the same saved cards and report.
- [ ] Audio has exactly the same question, card identities/orientations, positions, personal-card lens, and substantive conclusions as the report. No extra draw or unrelated advice appears.
- [ ] Pronunciation checks cover card names and representative customer names. Do not invent a nickname when pronunciation is uncertain; define a reviewed fallback that preserves the personalized content.
- [ ] Check for missing paragraphs, truncation, silent/corrupt files, harsh joins, unacceptable volume, and playback compatibility before marking ready.
- [ ] Bounded generation retries reuse the source script. Exhausted retries create a visible support/review task; no broken recording is sent to meet a timer.
- [ ] Report delay or failed report QA leaves audio waiting and visible to operations. It never triggers an independently invented reading.
- [ ] If the written reading is ready but audio is delayed, deliver the written reading under its agreed terms and show audio’s separate status. Send delay notices only through an authorized delivery workflow.
- [ ] Delivery retries reuse the approved asset. A resend does not regenerate the voice, cards, or report.
- [ ] Refund/cancellation handling follows the approved policy and cancels undispatched work when appropriate. Audio failure never silently revokes the valid main purchase.
- [ ] Desktop and mobile preserve readable copy, clear price/action semantics, obvious decline, keyboard access, and accurate order status.
- [ ] Final review includes offer copy, one complete sample report/script/recording, mobile/desktop screenshots, purchase/decline/failure evidence, and approved terms before any launch decision.
