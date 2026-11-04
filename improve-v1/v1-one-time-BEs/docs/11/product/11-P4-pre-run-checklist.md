# 11-P4 — Before the unattended run: what must be locked first

*2026-11-04. A1, A4 and all of B–D done the same day (see the end). The "unattended run" means writing the other 11 Soul Urge reports without the operator watching each one. Every item below has to be ticked first. If it isn't, one mistake gets copied into 11 reports.*

## A. Only the operator can do these

- [x] **A1. Read SU 9 v4 in full** (`11-P3-su9-report.md`) and approve it as the pattern. Voice, length, card shape and Evelyn's night all get copied 11 times.
- [ ] **A2. Open the test PDF** from n8n flow QFWXGBTBzdg0wiJL and check the layout: card images, headings, the letter page, page breaks. A layout bug repeats in all 12.
- [ ] **A3. Approve all 12 Soul Urge rows** in `../n8n/scripts/11-acts.json` → `soul_urge`: took, cover word, regret, unsaid sentence, and the one thing to do. Look hardest at the master numbers 11, 22 and 33.
- [x] **A4. Approve the swap-in design** (B1 below).
- [ ] **A5. Approve the 11 outlines in one sitting** (`11-P2-su<N>-spine.md`). After this, the run doesn't stop for the operator.
- [ ] **A6. Agree the pass bar and stop rules** (E below).

## B. Design, locked on SU 9 first

- [x] **B1. Swap-in spots become fixed.** "What they saw" (`[[EX]]`) and "her pattern" (`[[LP]]`) sit in the same few sentence frames in every report, so one shared list covers all 12. That is 11 numbers × 2 wordings (one for the reading, one for the letter) for each, about 44 lines. Without this, it's about 1,000 pieces.
- [x] **B2. Excuses, reasons and the two paths stay inside each report as written-out versions**: 3 excuses, 3 reasons, and the "get you back" and "giving it back" versions of each path passage. They're tied to that Soul Urge's story, so they can't be shared.
- [x] **B3. A new tag format that holds versions**, e.g. `[[FORK get_back]]…[[/FORK]][[FORK giving]]…[[/FORK]]`. Write it into the writer brief (Appendix A).
- [x] **B4. One card per slot, fixed.** The outline's "pick 1 of 2 by her other numbers" rotation doesn't fit a fixed report. Drop it.
- [x] **B5. Write SU 9's "giving it back" versions.** About 2 in 3 buyers are on this path.
- [x] **B6. Write the shared EX/LP list (B1)** in everyday words. Replace the two lines readers flagged: "someone who could run things and make them happen" (sounds like a form) and "take charge, get things done" (feels like a guess).

## C. Tools, so the run checks itself

- [x] **C1. Move the local runner and the round-trip check into the repo** (`n8n/scripts/`). They live only in the session scratchpad now and will be lost.
- [x] **C2. The assembler reads the new versions and the shared list.** Stop `build_bank()` rewriting the list from the report on every build. Add a test buyer for every Soul Urge, one per path.
- [x] **C3. check-report.py checks every version.** All 3 excuses, 3 reasons and both paths are present, and each filled-in reading stays inside the word bands.
- [x] **C4. A full-combination check, free.** Assemble every Soul Urge × "what they saw" × "her pattern" × path (12 × 11 × 11 × 2 = 2,904 readings) locally. Each one must not HOLD, must have no empty slot, must keep the unsaid sentence in card 11 and the letter, and must stay within 4,000–5,000 words.
- [x] **C5. A blind read of an assembled reading.** `make-blind-copies.py` must accept a filled-in reading, not only the tagged report, so readers see what a buyer gets.

## D. Prove it on SU 9 before the run

- [x] **D1. Run 3 different buyers through n8n:**
  - Testina (get you back)
  - Faketta (giving it back)
  - a buyer whose "what they saw" and "her pattern" are master numbers

  All three must be green with a PDF.
- [x] **D2. Blind-read Faketta's reading against v4.** Pass = the giving path reads as well as the get-back path.
- [x] **D3. Commit SU 9 final, the shared list and the tools.**

## E. Run rules, written into `0-REPORT-WORKFLOW-11.md` before starting

- [ ] **E1. Order:** batches of 3–4 Soul Urges: 1–4, 5–8, then 11, 22, 33.
- [ ] **E2. Per Soul Urge:**
  1. One writer
  2. check-report.py
  3. The full-combination check
  4. One blind read against SU 9 v4, switching which one is A and which is B each time
  5. Up to 2 fix rounds
  6. Commit
- [ ] **E3. Pass bar (proposed):** "worth $35" ≥ 7, and no score more than 1 below SU 9 v4 in the same read.
- [ ] **E4. Stop rule:** still failing after 2 fix rounds → park that Soul Urge, note why, and move on. Never ship a failing report.
- [ ] **E5. Budget:** about 35–45 subagent runs on the main model: 11 writers, 11–22 readers, and fix rounds. No paid API calls outside those runs.
- [ ] **E6. Hands off:** the run never touches live n8n, Stripe or AWeber, and never sends anything.
- [ ] **E7. End of run:** one page with all 12 score rows, the parked Soul Urges, and the list the operator must read.

## F. Not part of this run (needed for go-live later)

- The operator reads all 11 new reports (nothing ships unread).
- The live n8n nodes: Stripe webhook → intake → assemble → Supabase upload → AWeber send.
- Permanently delete the archived old flow p7F0ZQQWA1TI6w9g.

## Done 2026-11-04
- **A1:** the operator approved SU 9 v4. **A4:** "ok proceed" after the design was proposed.
- **B:** SU 9 is now a template (v5). Filled for the old test buyer it equals v4 word for word, bar one sentence changed on purpose ("You went on being useful to them" → "You went on giving them that"). Versions written: card 5 × 3 excuses, card 10 × 3 reasons, the whole giving path. Shared list (`11-swapins.json`) holds every Expression and Life Path line. EX 8's "saw" rewritten.
- **B4:** card 9's card is the Moon on both paths. The outline's 2-card rotation is dropped.
- **C:** `lib11_assemble.py` (one copy of the rules), `check-report.py` (all 242 readings plus the frame check), `check-11-assemble.py` (JS = Python for all 242, plus the three buyers end to end), `run-11-assemble.cjs` (local runner, moved out of the scratchpad), `make-blind-copies.py --buyer/--dob`.
- **D1:** n8n flow QFWXGBTBzdg0wiJL updated in place. Runs 51955 and 51956 are green: Testina (get back), Faketta (giving) and Gloria (EX 11 / LP 11, giving) each gave a 1.66 MB PDF.
- **D2:** blind read 5 (`11-P3-su9-blind-read-5.md`). The giving path matched or beat v4 on all five scores. Two fixes made.
- **Still the operator's:** A2 (open a PDF from run 51956 and check the layout), A3 (the 12 Soul Urge rows), A5 (the 11 outlines, once written), A6 (pass bar and stop rule).

