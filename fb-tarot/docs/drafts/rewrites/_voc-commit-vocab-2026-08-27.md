# VOC — commitment age-matrix + connection-vocab, pulled 2026-08-27

Read-only pull against **production** (`aws-1` / `pqolqzddzxubquukxnhk`), READ ONLY transaction,
canary rejected SQLSTATE 25006 ✔, emails and numbers masked by the tool. Raw output is in
`audit-runs/v1-funnel-live-audit/` and is gitignored — **PII, never commit it**.

> 🔴 **The `--live` flag reads `.env`, and `.env` has not been production since the dev/prod split
> on 2026-08-05.** The first run reported `matched 0` for the word "commit" while printing
> "LIVE / SHARED PRODUCTION DB". That is the wrong database, not an absent theme — dev holds a
> handful of test conversations. Re-run against `.env.prod.local` it returned **658**. The tool
> now takes `VOC_ENV_FILE`; the banner is still wrong for anyone who does not pass it.

| label | pattern theme | matched | buyers | verdict |
|---|---|---|---|---|
| `cv-expecting` | expecting/asking too much · should have committed by now | 5 | 3 | **thin** |
| `cv-wife2` | wife · married · engaged · propose · ring | 7567 | 100 | ok |
| `cv-connection` | connection | 1759 | 100 | ok |
| `cv-stopping` | stopping/holding him back · keeping him from | 59 | 6 | ok |

---

## 1 · `cards-expecting-too-much` — *"Am I expecting too much, or should he have committed by now?"*

**verdict `thin`** — 5 matched, 3 buyers. `why`: almost nobody phrases it as "expecting too much";
the corpus carries the same fear under *"what am I doing wrong"*, which is already solved live on
`cards-doing-wrong-wont-commit`. Inheriting that finding is allowed and is what this does.

⭐ **The buyer who typed it is exact, and she indicts herself TWICE:**
> *"We've been in a relationship for 3 years but still live separately… can't grasp his commitment
> as a true couple. **Am I expecting too much? Did I jump in too soon?**"*

**The word doing the work:** *too*. Not "am I expecting" — whether her wanting is excessive.

**The fear under it:** not "when will he commit". It is **is my wanting the problem** — and the
pull adds a second self-blame route the headline does not show: **her timing** (*"did I jump in
too soon"*). The read must refuse BOTH without ruling on him.

🔴 **Ban carried in from the live commitment guard:** `too much` is a whole-beat banned phrase
(blames her, unavailable even inside a refusal). Beat 2 says her question back ⇒ **paraphrase it,
never quote the ad.**

---

## 2 · `cards-played-the-wife` — *"I've played the wife without the commitment. Why?"*

**verdict ok on volume, but the pull says the headline selects an audience it cannot serve.**
🔴🔴 **RECOMMEND HOLDING THIS ONE.** Three groups dominate, and none is the cohabiting-no-ring
woman the headline pictures:

1. 🔴 **A rival who holds the wife role in fact.** *"There is another woman in his life. They are
   not married; she started working for him 40+ years ago… **practically married in everything but
   name.** She knows about me, and forbids him to have anything to do with me. She even attacked…"*
   This reader is the single best match for the headline and she is `his-other-life` territory. A
   read that names or rules on that woman is the harm.
2. 🔴 **Marriages that ended after decades.** *"62 years old… four adult children and five
   grandchildren… one day he says I want a divorce. He is living with her now."* She would click
   this ad. The read must never promise he "comes to his senses".
3. 🔴 **Active legal and financial disentanglement.** *"…the house is conjugal property and the
   savings I heavily contributed on… I have been affording the mortgage since we separated…"*
   Money and legal position must not enter the read at all.

Also present: women married to one man and in love with another, and a stroke survivor writing
*"I'm alive but this is not living"* — the soft-crisis surface.

**If it is built anyway**, the bans are: never name or rule on another woman · never predict a
marriage or a proposal · never touch money, property or legal standing · never rule on whether
the years were wasted. What is left for the read is her **position** — that she has been holding a
role nobody named — which is sayable without any of the above.

---

## 3 · `cards-instant-connection-commit` · `cards-connection-without-commitment` · `cards-connection-heading-commit`

**verdict ok** — 1759 matched, 100 buyers. The vocabulary is genuinely hers, not the ad's:
> *"We had an **instant connection** when we met"* · *"From the first time we met, the connection
> was **strong** — attraction, passion, warmth"* · *"I felt a connection with, but he's very
> **noncommittal**"*

🔴 **The finding that changes the copy: "this connection" is very often NOT a current
relationship.** The corpus uses the word for an ex, and for men not seen in years:
> *"having that strong connection still after 15–16 years"* · *"that connection remains strong in
> my heart though **there has been no contact between us for 20 years**"*

⇒ **The read may never presume an ongoing relationship, contact, or that they have met recently.**
"Is this connection heading for commitment?" must work for a woman with no contact at all.

⚠ One buyer's own verdict is *"he uses women"* — the read must not convict him either.

---

## 4 · `cards-stopping-him-committing` — *"Something is stopping him from committing. What is it?"*

**verdict ok** — 59 matched, 6 buyers. 🎯 **A buyer types the headline almost verbatim:**
> *"i feel that i am with my soulmate right now but **something is stopping him from committing**"*

⭐ **The fear is NOT "what is the obstacle".** The very next buyer says it plainly:
> *"I want to know what is holding him back. **Am i not good enough?**"*

⇒ Cut 3 answers **it isn't you**. It does not name his obstacle — naming a man's motive is banned
across this funnel, and the Shadow method's beat 5 already carries the shape ("something sits
between… I don't think it began with you") without supplying a motive.

🔴 **Two harm groups in the pull:**
- *"I'm in communication online with a man who has told me… I want to believe that and believe
  **he's real**"* — the online-only shape. Never affirm he is real or that he is coming.
- *"the relationship he is in is stopping him leaving as he feels guilty"* — "something" is often
  another woman. Never rule on a third party's relationship.
- One reader cites a previous reading (*"You told me last that I have generational weight"*) —
  never confirm what another reader told her.
