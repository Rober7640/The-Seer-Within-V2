# Writer brief — Evelyn V2 storytelling emails (give this to every writer subagent)

> Moved into the repo 2026-10-12 from a session scratchpad (scratchpads get wiped). Sections: the common brief, then the batch rules. The README is still the source of truth; where they differ, the README wins.

Draft + preview only. Do NOT write to any database, do NOT upload to S3, do NOT schedule/send, do NOT commit or touch git. Other writers are working in the same folder at the same time: **do NOT edit `README.md`** or any file not listed in your Deliverable (the coordinator adds your sends-log row).

Folder: `/Users/joel/tsw-preview/docs/aweber/evelyn-storytelling/`

## Read first
1. `README.md` — the workflow and every shared rule: Subject + preheader, **Substance devices**, **Pitch shapes**, CTA rules, truth/voice/formatting, pictures, **Reading brief** fields, source-file format, build.
2. Your format file in `formats/` (named in your prompt) + `formats/devices.md`.
3. Gold emails for voice, formatting and CTA mechanics (not structure): `emails/01-grandma-moses.md`, `emails/04-book-of-fate.md` (content rated "fantastic"), `emails/03-five-frogs.md` (permission pitch), `emails/07-burning-ears.md`.
4. Furey's source (search the title your format file cites): ``~/Downloads/Tao-of-Email-Copywriting.pdf` (extract with `pdftotext` into your own scratch folder)`
5. Evelyn's chat prompt — closest repo copy: `~/tsw-preview/improve-v2/specs/evelyn-v2-prompt-B16.md` (may differ from live; grep it). Promise nothing beyond: she types, Evelyn reads and replies, new users get 3 free minutes — mark anything else UNVERIFIED in Notes. Never promise the chat does something it doesn't.

## Operator rules learned so far (all non-negotiable)
- **Substance:** every email gives a real takeaway, using the ONE substance device assigned in your prompt.
- **Pitch:** use the ONE pitch shape assigned in your prompt. Avoid the retired template lines: "So here's my invitation", "Just you and me, one to one", "Then I'll tell you plainly what I see", "I won't promise…", "Type it the way you'd say it to a friend", button "Start my 1:1 conversation with Evelyn". Write your own button label (short, tied to the email, clearly a chat with Evelyn).
- **CTA:** a bold underlined `[LINK]` text link mid-pitch, FIRST PERSON, **NO PRECONDITION** (must work for a reader who did nothing / has no one) + ONE button at the end (`**→ Label**`) + a P.S. callback. **Never side by side: 3–5 short lines of empathy go between the link and the button** (README "CTA rules"; sample: `emails/16-the-reflection.md`). Columbo close: button ends the body, link ends the P.S. A **true** free-minutes line (new users only get 3 free minutes) in your own wording, e.g. "New here? The first 3 minutes are on me." A **true** reason not to wait — never fake urgency or fake scarcity. No promised outcomes. Never imply Evelyn knows the reader personally. Avoid the word "broke" (it trips the chat's price-objection rule).
- **Truth:** every fact and quote sourced in `## Sources` (URL + exact wording). No invented clients, testimonials, memories, results or dialogue for real people. Evelyn may share a thought, never an invented event.
- **Voice:** Evelyn — warm, plain, spoken, a touch playful; grade 3–5; short sentences; "dear" 0–1; contractions; one smile. Love first (~95% of the list came in with love questions; mostly women 40+).
- **Subject — LAST:** 3–4 VERY different direct-response options (different techniques). **Default: name FIRST + a one-line story with a twist, or a pain question** (open data 2026-10-12: those win at 31–33%; object/no-name subjects slid to 18% — README "Subject + preheader"). Lead with HER pain or desire — ⛔ never describe the object ("the 1822 book that…" was "terrible"). ≤120 bytes measured with `len(s.encode())`. Paid off in the first lines. Pick + challenger (the challenger must work with the SAME preheader) + a `_Subject history_` line. Preheader clarifies, never a second puzzle.
- **Picture:** people beat objects. Pencil sketch via `scripts/sketch-prompt-template.txt` + `codex exec` (`perl -e 'alarm shift; exec @ARGV' 330 codex exec --skip-git-repo-check -s workspace-write -C <outdir> - < prompt.txt`, outdir in the session scratchpad). LOOK at it before using; no text; never a likeness of a real private person; never copyrighted characters. Save `assets/<slug>-sketch.jpg` (560–640px, JPEG q≈72) + `-original.png`; `[IMAGE] … | alt |  | 260–320 | noborder`.
- **Reading brief:** draft the 4 header fields (Big Idea, Reading Recap, Open Loop, Continue Seed). Continue Seed must work for a reader who skipped/did nothing. Do NOT mint; leave out `**Short Link:**`.

## Deliverable (only these files)
- `emails/<NN>-<slug>.md` in the exact source-file format (Campaign `story-<NN>-<slug>`, Bucket `love` unless told otherwise), with `## Sources` and `## Notes` (record `Substance device:` and `Pitch shape:`).
- Preview: `cd /Users/joel/tsw-preview/docs/aweber/evelyn-storytelling/scripts && python3 -I build-email.py ../emails/<NN>-<slug>.md` (the Short Link warning is expected).
- `assets/<slug>-sketch.jpg` + `-original.png`.
- Your format file: add `## Stress test result` (Truth, Repeatable — ≥5 more real ideas for this format, Effort; Read + Chat = pending) and update its `**Status:**` line.

## Reply — SHORT (under 150 words)
File paths; the idea in one line; device + pitch shape; subject pick + challenger (bytes); word count + split; anything unverified or any chat-capability claim you couldn't confirm. Do NOT paste the email body.

---

## Batch rules (several writers at once)

Several writers may work in the same folder at the same time, one email each.

- **Files you may write:** ONLY `emails/<NN>-<slug>.md`, its preview `.html`, and `assets/<slug>-*` (sketch or photo + original). Do NOT edit `README.md`, any `formats/*.md` file (they are already stress-tested), `DEV-HANDOFF.md`, or anything another writer owns.
- **Format:** follow your format file's shape + rules + "what we learned" notes exactly. Read the gold email for your format (named in your prompt) before writing — it is the approved bar.
- **Device + pitch shape** are assigned in your prompt — use exactly those (they rotate across the batch so no two neighbours match). Record both in `## Notes`.
- **Entertaining first.** Simple words, short lines, one laugh. The operator rejects "intellectual"/abstract copy and template-sounding pitches. Story in time order: setup → plot → moral (the moral = what the plot proved).
- **Truth:** every fact/quote sourced in `## Sources` with URL + exact wording, verified from the primary/public-domain text (Gutenberg/archive.org scans) where one exists. No invented people, memories, dialogue, clients or results. No "Picture this" second-person scenes (that format was dropped).
- **Pictures:** a real public-domain/CC0 image where the format calls for one (e.g. a historical portrait — check the licence on the file page and record it), otherwise a pencil sketch via the template + `codex exec`. No likeness of real private people. LOOK at it before using.
- **Subject:** 4 very different options; the prompt says whether your PICK should use the name (we're mixing with/without across the batch). Measure bytes.
- **Not minting, no S3, no AWeber, no git.**
