# Phase 3 prose evidence baseline

**Sprint:** 0 — evidence only  
**Recorded:** 2026-09-10  
**Scope:** Freeze and grade the two current Phase 3 readings before further prompt work. This document records output evidence; it does not prescribe prompt prose, and no gold-standard sentence belongs in a production prompt.

## Completion record

- [x] Preserved the v1 Markdown, PDF, HTML, and draw JSON by recording SHA-256 hashes.
- [x] Preserved the v2 Markdown, PDF, HTML, and draw JSON by recording SHA-256 hashes.
- [x] Recorded total and per-house word counts, page counts, cross-references, numbered dates, first-person markers, repeated eight-grams, sentence length, paragraph length, and teaching conditionals.
- [x] Recorded the v1 repeated opener family in rooms 2, 9, and 11.
- [x] Recorded the v2 unsupported duration claim in room 5.
- [x] Selected six representative passages from each reading and graded them blind.
- [x] Identified the corresponding structural moves in all three gold readings.
- [x] Kept the estimated customer recommendation score explicitly separate from measured customer data.

## Frozen artifacts

The files were read in place and were not copied, edited, or regenerated.

| Arc | Artifact | SHA-256 |
|---|---|---|
| v1 | `docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.md` | `f07bba0eb825dfa0e38c97b79bcb0218c7d812ba391a219bbc3761d2f894b382` |
| v1 | `docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.pdf` | `730fe6f4fe5854f3b8b34b6332ee46b1f800819872721b551ec4a9adfb52499e` |
| v1 | `docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.html` | `7b650d86a2f74617356c51315f33d87bd7edfc19384a4179329e17c7f8f1dfa4` |
| v1 | `docs/02/dryrun-02-draw-cs_phase3_v1_20260910_c.json` | `388aa3b455fc9a7f0035fe84918dc87d5bbc6574969d14058a2d9111041ad2a4` |
| v2 | `docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.md` | `6774162ec5b2d2f792ba918d45fec71bba8cc31eb1ca3b0037c64db5fee5fdcf` |
| v2 | `docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.pdf` | `61a4b28db6e264c1af664e5569d50543d74f220cf35ddbca2f1e6305d75c8357` |
| v2 | `docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.html` | `0f3882a8bc4ca511df946b1caea8e7109b74a82ddf3c1b75a5d2354bb4ee5c3f` |
| v2 | `docs/02/dryrun-02-draw-cs_phase3_v2_20260910_b.json` | `a1921149ed78cad78163862276e785d589c76f078c1be78fc2d18146a6107dd2` |

Command used:

```bash
shasum -a 256 docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.{md,pdf,html} docs/02/dryrun-02-draw-cs_phase3_v1_20260910_c.json docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.{md,pdf,html} docs/02/dryrun-02-draw-cs_phase3_v2_20260910_b.json
```

## Baseline measurements

The current-reading measurements reproduce the metric definitions in `KEEP_READING_JS`: whitespace words; sentence boundaries after `.`, `!`, or `?`; blank-line paragraphs; teaching conditionals `may|might|could|perhaps|if`; exact whole-word `I` and `dear`; and case-sensitive names of other cards in the draw. Sentence and paragraph standard deviations are added here to show rhythm dispersion. Gold PDF text includes Waite quotations and toolbox material, so its paragraph statistics are useful context rather than a release gate.

| Measure | Current v1 | Current v2 | Gold TWS | Gold PSC | Gold MHW |
|---|---:|---:|---:|---:|---:|
| Words | 8,138 | 8,125 | 8,011 | 8,150 | 8,948 |
| PDF pages | 32 | 34 | 32 | 32 | 34 |
| Opening words | 340 | 315 | — | — | — |
| Close words | 347 | 321 | — | — | — |
| Mean sentence words | 17.2 | 17.7 | 18.7 | 17.8 | 19.7 |
| Sentence-word SD | 11.7 | 11.4 | 10.8 | 9.7 | 11.9 |
| Mean paragraph words | 83.9 | 82.1 | 54.5 | 56.2 | 61.8 |
| Paragraph-word SD | 34.0 | 36.4 | 46.6 | 49.2 | 54.9 |
| Teaching conditionals | 19 | 17 | 72 | 70 | 82 |
| Whole-word `I` | 15 | 13 | — | — | — |
| Refusal-shaped first person | 1 | 1 | — | — | — |
| `dear` | 13 | 12 | 1 | 0 | 0 |
| `woman` or `women` | 26 | 30 | 1 | 0 | 0 |
| Fog nouns | 17 (2.1/1k) | 17 (2.1/1k) | — | — | — |
| Houses naming another dealt card | 4/12 | 4/12 | — | — | — |
| Cross-house duplicate eight-grams | 6 strings, one opener family | 0 | — | — | — |
| Artifact's saved grade | `FAIL — line 8` | `PASS` | — | — | — |

Gold word counts are raw `pdftotext` counts. Gold style metrics remove the repeated copyright/page footer before counting. Commands used:

```bash
pdftotext ~/Downloads/grandtarottws.pdf /tmp/tsw-review-pdf/gold/grandtarottws.txt
pdftotext ~/Downloads/grandtarotpsc.pdf /tmp/tsw-review-pdf/gold/grandtarotpsc.txt
pdftotext ~/Downloads/grandtarotmhw.pdf /tmp/tsw-review-pdf/gold/grandtarotmhw.txt
wc -w /tmp/tsw-review-pdf/gold/grandtarot{tws,psc,mhw}.txt
pdfinfo docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.pdf
pdfinfo docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.pdf
pdfinfo ~/Downloads/grandtarot{tws,psc,mhw}.pdf
python3 /tmp/phase3_baseline.py docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.md docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.md
python3 /tmp/date_scan.py docs/02/dryrun-02-reading-cs_phase3_v1_20260910_c.md docs/02/dryrun-02-reading-cs_phase3_v2_20260910_b.md
```

The two temporary Python programs were read-only counters. The first mirrors the `KEEP_READING_JS` formulas and additionally computes standard deviation and normalized eight-grams. The second ports the current numbered-date regular expression verbatim and reports its house marker.

### Per-house interpretation words

| House | v1 | v2 |
|---:|---:|---:|
| 1 | 577 | 599 |
| 2 | 629 | 659 |
| 3 | 603 | 582 |
| 4 | 601 | 577 |
| 5 | 696 | 692 |
| 6 | 581 | 628 |
| 7 | 608 | 592 |
| 8 | 629 | 615 |
| 9 | 599 | 562 |
| 10 | 587 | 576 |
| 11 | 591 | 608 |
| 12 | 629 | 674 |

All 24 interpretations satisfy the 500–800-word constraint. The narrow band is also evidence of uniform construction: v1 spans only 119 words and v2 only 130 words across twelve different cards and duties.

### Cross-card references

- **v1:** house 2 names the Sun; house 5 the Devil; house 8 Judgment; house 12 the Empress. No other house names another dealt card.
- **v2:** house 2 names Justice; house 5 names the Magician, Hanged Man, Hierophant, and Temperance; house 8 names the Magician and Wheel of Fortune; house 12 the Nameless One. No other house names another dealt card.

The v2 count is four passages but eight named references. House 5 carries half of them, which contributes to its feeling of assembled evidence rather than a single developing thought.

### Numbered clocks found by the current detector

| Arc | House | Detector class | Exact phrase |
|---|---:|---|---|
| v1 | 5 | dated | `the third week` |
| v1 | close | dated | `inside the next six or seven days` |
| v1 | close | dated | `the third week` |
| v2 | 5 | dated | `the eleventh and the eighteenth day` |
| v2 | 5 | dated | `the second week` |
| v2 | 7 | dated | `the second month` |
| v2 | close | promised first sign | `Within five to seven days` |
| v2 | close | dated | `the eleventh to the eighteenth day` |

This exposes two baseline discrepancies worth preserving for the implementation sprint. The v1 close says **six or seven days**, so the detector does not recognize it as the promised five-to-seven-day first sign. The v2 room 7 instruction introduces a numbered second-month deadline outside the one dated room. These are output facts even though the v2 saved model grade says `PASS`.

### Repeated v1 opener family

The normalized eight-gram scan finds six overlapping strings belonging to one sentence family:

- House 2: “The line in the printed description that decides this room is the one about the two hands…”
- House 9: “The line that decides this room is the one about the tree…”
- House 11: “The detail in the printed description that decides this room is the one about the chains…”

The longest family common to all three is `that decides this room is the one about`. V2 has no exact duplicate eight-gram, but its openings still repeatedly perform the same function with phrases such as “The line worth holding,” “The detail worth stopping on,” and “Reason from the strangest line.” Exact n-gram absence therefore does not prove structural variation.

## Blind prose evidence: current v1

These judgments use only the delivered reading. “Missing source” means the delivered material supplies no buyer fact, card fact, house meaning, or stated promise sufficient for the extra detail.

| # | Source | Quotation | Function | Blind verdict | Gold-standard counterpart |
|---:|---|---|---|---|---|
| V1-1 | House 2, PDF pp. 6–7 | “Idle is not spoiled. Deferred is not forfeited.” | Removes shame after explaining unused resources. | **Strength.** It is plain, memorable, and earned by the cupboard analogy. The personal forecast follows an intelligible general idea. | G1 makes the same general-to-specific descent: isolate a Waite idea, define it, test it against an ordinary example, widen it, normalize the difficulty, then assign action. |
| V1-2 | Houses 2, 9, 11 | “The line in the printed description that decides this room…” / “The line that decides this room…” / “The detail in the printed description that decides this room…” | Opens from a selected source detail. | **Mechanical opening.** Three rooms expose the same selection operation. The customer hears the writer processing a brief. Several endings are equally task-shaped imperatives: “Ask early,” “Move on that one,” “Act before that happens.” | G1 quotes the source first, then begins in a different rhetorical place; its later sections do not announce the same extraction operation card after card. |
| V1-3 | House 7, PDF pp. 17–18 | “Fill that in from your own life, because the shapes are various…” followed later by “You have probably suspected which of these it is…” and “Here is the answer to the room, dear…” | Category expansion → normalization → claim. | **Repeated argument transition.** The individual moves are useful, but their signposting makes the ladder visible. By room 7 the customer can predict the next paragraph's job. | G2 varies sequence and pace: it enters the person early, digresses into an end-of-life analogy, gives several actions, then returns to the stage claim. |
| V1-4 | House 1, PDF pp. 4–5 | “Most women carry some version of this and have been taught to apologize for it.” | Normalizes solitude through a demographic statement. | **Patronizing risk.** It addresses a type of woman from outside rather than this buyer. The corpus count—26 woman/women terms versus 0–1 in each gold reading—shows this is systematic. | G3 tends to use the reader, the writer's own experience, or inclusive “we/us” as the bridge; it does not repeatedly explain women to a woman. |
| V1-5 | House 7, PDF p. 18 | “The one you are bound to is already known to you… someone with a place in your life and a history in it, and what is between you is a live crop.” | Converts card/house imagery into personal biography. | **Unsupported personal claim.** The card can support nurture, continuity, or an existing bond; the delivered evidence does not establish a shared history or unnamed mutual growth. **Missing source:** a buyer fact or explicit promise establishing that history. | G2 spends most of its card on general meaning and possibilities before saying how it bears on the buyer; hard detail is not created merely to make the application feel personal. |
| V1-6 | House 8, PDF pp. 19–20 | “Accept it.” Then: “possibly a smaller net figure for a faster clean break,” followed by “When the paperwork reaches you, sign it…” | Turns an inferred windfall into legal/financial action. | **Disproportionate instruction.** The reading invents an administrator, settlement mechanics, paperwork, and a trade between amount and speed, then tells her to sign. **Missing source:** an actual settlement, document, adviser, or buyer-supplied financial context. | G3's action move is exploratory and reversible—observe, research, meditate, list, or try a bounded exercise—rather than transact on invented facts. |

### V1 reading-level observation

The opening previews the product answers before the houses earn them: “The second house names the door… the eighth carries the second one into your love life; the fifth chooses between the two branches…” It orients efficiently, but it reduces discovery and makes the following rooms feel like twelve proofs of an index already supplied.

## Blind prose evidence: current v2

| # | Source | Quotation | Function | Blind verdict | Gold-standard counterpart |
|---:|---|---|---|---|---|
| V2-1 | House 2, PDF p. 7 | “Ease is what mastery feels like from the inside. It is not evidence of low value…” | Reframes an easy skill before applying the money promise. | **Strength.** This teaches a useful distinction and removes a believable objection. The claim grows out of the analogy rather than arriving first. | G1 similarly pulls a compact source idea into a plain definition, extends it to everyday categories, normalizes the mismatch, and only then prescribes a next step. |
| V2-2 | Houses 3, 4, 5, 9 | “The line worth holding…” / “The detail worth stopping on…” / “The sentence to hold onto…” / “The line to reason from…” | Repeatedly announces the source-detail opener. | **Mechanical opening.** Lexical rotation avoids duplicate eight-grams but preserves the same visible operation. It reads as controlled variation rather than a person choosing how to begin each thought. | G3 can begin with a personal heuristic and bodily analogy before returning to the card; the source block does not force a second source-extraction announcement. |
| V2-3 | House 10, PDF pp. 23–24 | “Think of a bakery…” then “Standing works the same way…” then “There is nothing small-minded…” then “In this house, the card says…” | Analogy → categories → normalization → her. | **Repeated argument transition.** This is a competent ladder, but it is the same ladder heard in most rooms. The prose has more air than Phase 2 while retaining worksheet predictability. | G1 uses this full ladder where it helps Temperance; other gold cards change scale, dwell time, and order rather than repeating it as a per-card contract. |
| V2-4 | House 6, PDF p. 17 | “The shapes this takes in a woman's week are various.” Later: “a woman who learned early that correctness buys safety…” | Applies the card through a generalized female profile. | **Patronizing risk.** It tells the customer what women have been trained to do, then supplies her presumed fatigue. Thirty woman/women terms make this a voice habit, not a single relevant observation. | G2 normalizes with “human beings” and turns quickly back to the buyer's choices; it avoids making age or gender the evidence for a private state. |
| V2-5 | House 5, PDF pp. 14–15 | “He has already arrived; he arrived years ago and you did not look.” The paragraph also assigns him an “unhurried” manner and places him “mid-task.” | Makes the promised known-man answer feel vividly specific. | **Severe trust failure.** “Already known” does not establish years, her failure to notice, his manner, or the scene. **Missing source:** duration of acquaintance, observed behavior, and meeting circumstances. The specificity is synthetic. | G2 uses conditional branches and examples to let the buyer recognize herself before narrowing; it does not convert an illustration into a remembered event. |
| V2-6 | House 7, PDF p. 19 | “The tie you are strongest inside now is finishing.” Then: “Begin… to untangle… the shared money, the standing commitments…” | Gives a firm relationship verdict and operational response. | **Disproportionate instruction.** It asserts that another person's decision is made, presumes shared money, and instructs disentanglement by the second month. **Missing source:** a buyer-reported ending, shared accounts, legal tie, or corroborating evidence. | G3 turns difficult material into observation and bounded practice. It lets explanation carry seriousness without ordering irreversible action on invented circumstances. |

### V2 reading-level observation

V2 has no exact duplicate cross-house eight-gram, yet the role sequence remains easy to forecast. A common room proceeds from selected Waite detail to plain gloss, announced analogy, category list, shame removal, “dear,” hard verdict, and imperative. This is why lexical repetition metrics can be green while a customer still feels the template.

## Gold structural counterparts

The following are analytical references, not copy for the generator.

### G1 — `grandtarottws.pdf`, Temperance, PDF pp. 5–7

The writer selects one Waite sentence, defines balance in ordinary language, uses abstaining from alcohol as a concrete analogy, widens into ethics/religion/lifestyle categories, says the mismatch is common, and then applies it to the buyer's restructuring. Two short textual anchors are “apply this on a much broader scale” and “Nearly all of us suffer from it.” The movement is source → definition → example → categories → normalization → her.

### G2 — `grandtarotpsc.pdf`, High Priestess, PDF pp. 5–7

The writer begins with a plain governing adjective, explains inner versus external measures, moves through an end-of-life analogy, normalizes the problem as human, offers several possible practices, and then returns to the buyer's stage. Its compact normalization is “natural for human beings,” and its action section begins “Spend time quietly and alone.” The card is taught before the buyer is pinned to a claim.

### G3 — `grandtarotmhw.pdf`, Moon, PDF pp. 5–7

The writer starts with her own heuristic—“everything is more complicated than it seems”—uses the body as an extended analogy for the mind, defines the subconscious, widens into memories/feelings/cultural bias, removes blame, and offers multiple exploratory actions. The digression is doing interpretive work; it does not announce each ladder stage or funnel to a single invented biography.

### What the gold comparison does and does not prove

- It proves that length alone is insufficient: the current readings now match the gold documents in gross words and pages.
- It shows a much larger conditional teaching range in the gold readings: 70–82 versus 17–19.
- It shows the gold voice rarely uses `dear` or gender categorization. The current readings use both approximately once or twice per room.
- It demonstrates that the full ladder is effective when chosen for a card, but becomes visible machinery when required twelve times.
- It does not establish that every gold sentence is desirable, or that gold prose should be pasted into a prompt.

## Baseline customer hypothesis

No customer panel has rated these PDFs. The current working hypothesis is:

- likely recommendation rating: **about 5/10**;
- estimated promoter/passive/detractor split: **15% / 30% / 55%**;
- implied hypothesis NPS: **−40**.

This is an expert forecast, not observed NPS. It must never be presented as customer research. The likely positive drivers are substance, length, design, clear tarot teaching, and firm answers. The likely detractor drivers are visible formula, demographic lecturing, invented intimacy, and consequential advice built on invented facts.

## Sprint 0 conclusion

The current Phase 3 work solved the dominant Phase 2 starvation problem: both readings are full-length, all houses meet the word budget, the prose contains real explanations, and the PDFs match the paid products in gross scale. Length is no longer the main defect.

The highest-leverage remaining defect is repeated rhetorical architecture. It is reinforced by two trust failures: demographic claims are used as a shortcut to intimacy, and illustrative possibilities harden into the buyer's biography or instructions. A future sprint should therefore vary room-level intellectual work and enforce claim provenance; merely rotating opener wording or increasing word count cannot solve the recorded failures.

