#!/usr/bin/env python3
"""Free checks for one fixed 11 report (11-P3-su<N>-report.md). No model, no network.

    python3 docs/11/product/scripts/check-report.py docs/11/product/11-P3-su9-report.md

Fills the report for EVERY buyer it can meet: her Expression (11 lines) × her Life Path (11 lines)
× both paths = 242 readings, from the shared list (n8n/scripts/11-swapins.json). Every rule runs on
every reading. A rule that fails prints how many readings broke it and the first one.
Exit code 1 if anything fails. Judgement (voice, blame, story) is the blind read's job.
"""
import os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../n8n/scripts"))
import lib11_assemble as L

path = sys.argv[1]
SU = int(re.search(r"su(\d+)-report", os.path.basename(path)).group(1))
# v2 shape (operator, 2026-11-05: "the letter is the main thing"): each card is short and brings back
# one part of the letter, quoted; the letter itself is the long centrepiece. Marked by "letter-first shape"
# on the report's first line. Reports without it keep the v1 bands.
V2 = "letter-first shape" in open(path, encoding="utf-8").readline()
if V2:
    BAND = {"opening": (100, 240), "letter": (1100, 1700), "close": (40, 200)}
    for c in (1, 9, 10, 12): BAND[str(c)] = (180, 340)             # the bold answers + the instructions
    for c in (2, 4, 5, 6, 8, 11): BAND[str(c)] = (70, 190)
    for c in (3, 7): BAND[str(c)] = (90, 230)                 # + Evelyn's praise line
    TOTAL = (2600, 3900)   # +the personal read before card 1, +praise lines, +the letter's memory/admiration/last compliment
else:
    BAND = {"opening": (150, 260), "letter": (400, 600), "close": (20, 90)}
    for c in (1, 8, 9, 10, 12): BAND[str(c)] = (450, 650)            # big
    for c in (3, 5, 7, 11):     BAND[str(c)] = (250, 350)            # medium
    for c in (2, 4, 6):         BAND[str(c)] = (100, 160)            # short
    TOTAL = (4000, 5000)
# Question shape (operator, 2026-11-05): every card answers ONE question, asked in her words as the card's
# first line in bold, with the flat answer in bold right under it. Same 12 questions, same order, in every report.
# The close answers a 13th, after the letter. Marked by "question shape" on the first line.
QS = "question shape" in open(path, encoding="utf-8").readline()
QUESTIONS = ["What did they take from me?", "Did they ever really love me?", "Was it my fault?",
             "Why have they still got it?", "Why has it taken this long?", "What do they regret?",
             "Why does nobody new get close?", "Is it too late for me?", "Are they giving it back, or trying to get me back?",
             "Will they ever do anything about it?", "What did they never say?", "What do I do now?"]
CLOSE_Q = "Will I be happy again?"
if QS:
    BAND = {"opening": (300, 460), "letter": (1300, 1800), "close": (80, 260)}   # opening carries the contents list
    for c in (1, 9, 10, 12): BAND[str(c)] = (180, 340)
    for c in (2, 3, 4, 5, 6, 7, 8, 11): BAND[str(c)] = (80, 230)   # +the "Card N, name:" label
    TOTAL = (2800, 4250)   # +the contents list in the opening
BANNED = {
    "numerology words": r"numerolog|karmic|vowel|soul urge|life path|\bexpression\b|\bsum\b",
    "words for what they were": r"\bex\b|husband|boyfriend|girlfriend|partner|\blover\b|spouse",
    "hedges": r"\bperhaps\b|\bmaybe\b|\benergy\b|journey|the universe|\bi feel\b|\bi sense\b|it seems|the cards suggest",
    "therapy words": r"\btrauma\b|\bboundar|\bheal(ing)?\b|self-care|toxic|narcissis",
    "British words": r"\bround (you|to|the)\b|kitted|any more\b|whilst|colour|favour|\bmum\b|holiday|fortnight|car park|queue|cheque|they've no idea",
    "past clients": r"\bclient|another woman i read|a woman i read for",
    "how long the writing took": r"\b\d+ hours\b|all night writing|took me (hours|nights)",
    "planning words": r"low point|the turn of the whole|swap-in|fill-in",
}

def rules(sec):
    """Yield (rule, ok) for one filled reading."""
    text = "\n".join(sec.values()); low = text.lower()
    op, c12, last = sec["opening"], sec["12"], sec["close"]
    yield "opening: the birth-name sentence, as its own sentence", "Your birth name and date set how I lay your twelve cards." in op
    yield "opening: this is someone living", "this is someone living" in op.lower()
    yield "opening: you owe them no reply", "you owe them no reply" in op
    yield "card 11: you owe them no reply", "you owe them no reply" in sec["11"]
    for c in ("1", "9", "10"): yield f"card {c} opens in bold", sec[c].startswith("**")
    yield "card 12: both bold labels", "**Stop going back.**" in c12 and "**The one thing to do.**" in c12
    yield "card 12: the five-to-seven-day window", "five to seven days" in c12
    # The old last line read cold to every reader; SU 5 tries the new one (2026-11-05). Either passes until rolled out.
    yield "close: exact last line", last.rstrip().endswith(("It's back. What you do with it is on you.", "It's back. Go and use it."))
    yield "card 5: the excuse line in quotes", '"' in sec["5"]
    yield "letter: I told myself (the excuse, echoed)", "I told myself" in sec["letter"]
    if SU == 4: yield "card SU 4: says once that if she isn't safe, that comes first", "safe where you are" in low or "not safe" in low
    unsaid = re.search(r'"([^"]+)"', sec["11"])
    yield "unsaid sentence word for word in card 11 and the letter", bool(unsaid) and unsaid.group(1) in sec["letter"]
    for label, rx in BANNED.items():
        hits = sorted(set(m.group(0) for m in re.finditer(rx, low)))
        yield f"banned, {label}" + (f": {', '.join(hits)}" if hits else ""), not hits
    out = [k for k, v in sec.items() if k != "8" and re.search(r"\byears\b", v.lower())]
    yield "'years' only in card 8" + (f" (also in {out})" if out else ""), not out
    for card in ("hermit", "judgement", "devil"):
        yield f"the {card} never falls in this spread", not re.search(rf"(turned|laid|drew|fell)[^.]*\b{card}\b", low)
    if V2:
        # Every card hands over one part of the letter: a paragraph that is only *"..."*, found word for word in the letter.
        for c in map(str, range(1, 13)):
            got = re.findall(r'^\*"(.+?)"\*$', sec[c], re.M)
            yield f"v2 card {c}: quotes a line of the letter as its own *\"...\"* paragraph", bool(got)
            yield f"v2 card {c}: its quoted line is in the letter word for word", bool(got) and all(g in sec["letter"] for g in got)
    if QS:
        for i, q in enumerate(QUESTIONS, 1):
            paras = [x.strip() for x in sec[str(i)].split("\n\n") if x.strip()]
            want = f"**Card {i}, {CARD_NAMES[i-1]}: {q}**"
            yield f"q card {i}: first line names the card and its question ({want})", bool(paras) and paras[0] == want
            yield f"q opening: the contents list has card {i} and its question", f"\n\nCard {i}, {CARD_NAMES[i-1]}: {q}\n\n" in op
            yield f"q card {i}: the flat answer, in bold, right under it", len(paras) > 1 and paras[1].startswith("**") and paras[1].rstrip().endswith("**")
        yield f"q close: **{CLOSE_Q}** then a bold answer", f"**{CLOSE_Q}**\n\n**" in last
        yield f"q opening: the contents list ends with the question after the letter", f"\n\n{CLOSE_Q}\n\n" in op
    total = sum(len(v.split()) for v in sec.values())
    yield f"total words {TOTAL[0]}-{TOTAL[1]}", TOTAL[0] <= total <= TOTAL[1]
    for k, (lo, hi) in BAND.items():
        yield f"words in {k} within {lo}-{hi}", lo <= len(sec[k].split()) <= hi

fails = []
print(f"\n{os.path.basename(path)}")
try:
    tpl = L.parse_report(path)
except ValueError as e:
    print(f"  FAIL the report won't parse: {e}\n"); sys.exit(1)
if tpl["gaps"]:
    print(f"  FAIL {tpl['gaps']} gap(s) still marked ⟪WRITE⟫\n"); sys.exit(1)

# The shared lines only fit if every report sets them in the same frame (0-REPORT-WORKFLOW-11.md).
FRAMES = {"{{EX.saw}}": "They saw something in you: {{EX.saw}}.", "{{EX.use}}": "They kept {{EX.use}},",
          "{{EX.letter}}": "When I first knew you, {{EX.letter}} I liked that.", "{{EX.kept}}": "I kept {{EX.kept}}.",
          "{{LP.then}}": "[CARD 7]\n\n{{LP.then}}\n\n", "{{LP.now}}": "Someone decent turns up and {{LP.now}}.",
          "{{LP.letter}}": "\n\n{{LP.letter}}\n\n",
          "{{REASON.headline}}": "because {{REASON.headline}}.**",
          "{{REASON.letter}}": "I'm never going to send this. {{REASON.letter}} So it stays here."}
if QS:   # card 7 now opens on its question and answer, so {{LP.then}} is its own paragraph, not the card's first
    FRAMES["{{LP.then}}"] = "\n\n{{LP.then}}\n\n"
if V2:   # the personal read before the first card (operator, 2026-11-05)
    FRAMES["{{EX.trait}}"] = "your name and date told me who I was laying them for. {{EX.trait}} {{LP.trait}}"
    FRAMES["{{LP.trait}}"] = "{{EX.trait}} {{LP.trait}}\n"
    # flattery from the same traits (operator, 2026-11-05): Evelyn in cards 3 and 7, the one who left in the letter
    FRAMES["{{EX.praise}}"] = "They saw something in you: {{EX.saw}}. {{EX.praise}} "
    FRAMES["{{LP.praise}}"] = "{{LP.then}}\n\n{{LP.praise}} "
    FRAMES["{{EX.never}}"] = "I liked being around it. {{EX.never}}\n"
    # the letter, personal and flattering (operator, 2026-11-05: "the actual letter lacks the personality traits")
    FRAMES["{{EX.moment}}"] = "{{EX.never}}\n\n{{EX.moment}}\n\n"
    FRAMES["{{LP.admire}}"] = "\n\n{{LP.admire}}\n\n{{LP.letter}}\n\n"
    FRAMES["{{EX.last}}"] = "\n\n{{EX.last}}\n\nI won't call"
raw = open(path, encoding="utf-8").read()
CARD_NAMES = re.findall(r"\d+ ((?:the )?[A-Z][a-z]+(?: [A-Z][a-z]+)?)", raw.split("\n")[2])   # header line 3, as written

# The deal: each card from its act's pool, the must-cards at 8/10/12, Death only at 8 or 10, none twice.
import json
acts = json.load(open(os.path.join(os.path.dirname(L.BANK_PATH), "11-acts.json"), encoding="utf-8"))
slugs = [n.lower().replace(" ", "-") for n in tpl["cards"]]
pool = {i: acts["pools"][f"act{(i - 1) // 3 + 1}"] for i in range(1, 13)}
bad = [f"{i} {s}" for i, s in enumerate(slugs, 1) if s not in pool[i]]
bad += [f"{i} {slugs[i-1]} (needs {'/'.join(m)})" for i, m in ((int(k), v) for k, v in acts["deal_rules"]["must"].items()) if slugs[i-1] not in m]
bad += [f"{i} death" for i, s in enumerate(slugs, 1) if s == "death" and i not in acts["deal_rules"]["death_only_at"]]
bad += [f"twice: {s}" for s in set(slugs) if slugs.count(s) > 1]
print("CARDS")
print(f"  {'ok  ' if not bad else 'FAIL'} " + (" · ".join(bad) if bad else "all 12 legal: " + ", ".join(tpl["cards"])))
if bad: fails.append("cards")
print()
print("FRAMES")
for spot, frame in FRAMES.items():
    n, f = raw.count(spot) - raw.split("\n", 3)[1].count(spot), raw.count(frame)
    ok = n == 1 and f == 1
    print(f"  {'ok  ' if ok else 'FAIL'} {spot:20} used {n}×, in its frame {f}×")
    if not ok: fails.append(f"frame {spot}")
print()

bank = L.load_bank()
PYS = [str(i) for i in range(1, 10)]     # her year ahead, when the report uses {{PY.ahead}}
held = set()
counts, first_bad, holds, words = {}, {}, {}, {k: [] for k in L.SECTIONS}
n = 0
for ex in L.NUMBER_KEYS:
    for lp in L.NUMBER_KEYS:
        for fork, py in [(f, p) for f in ("get_back", "giving") for p in (PYS if "{{PY." in raw else ["1"])]:
            keys = L.keys_for(SU, int(ex), int(lp)); keys["FORK"] = fork
            keys.update({"PY": py, "NEXT_BDAY": "March 14"})
            who = f"EX {ex} · LP {lp} · {fork}"
            n += 1
            try:
                sec = L.fill(tpl, bank, keys, "Testina", "Testina Rose Testerly", "November 5, 1962")
            except L.Hold as e:
                msg = str(e)
                if msg.startswith("no shared line yet for: "):
                    for item in msg.split(": ", 1)[1].split(" · "): holds.setdefault(item, who)
                else: holds.setdefault(msg, who)
                held.add(who); continue
            for k in L.SECTIONS: words[k].append(len(sec[k].split()))
            for rule, ok in rules(sec):
                base = rule.split(":")[0] if rule.startswith("banned") else rule
                counts.setdefault(base, 0)
                if not ok:
                    counts[base] += 1; first_bad.setdefault(base, (rule, who))

print(f"  {n} readings: every Expression × every Life Path × both paths" + (" × every year ahead" if "{{PY." in raw else "") + "\n")
if holds:
    print(f"  FAIL {len(held)} of {n} readings HOLD. Missing from the shared list ({len(holds)}):")
    print("       " + " · ".join(sorted(holds, key=lambda s: (s.split()[0], int(s.split()[1]) if s.split()[1].isdigit() else 0, s))))
    fails.append("holds"); print()
if words["opening"]:
    print("WORDS (fewest–most across the readings)")
    for k in L.SECTIONS:
        lo, hi = BAND[k]; a, b = min(words[k]), max(words[k])
        print(f"  {'ok  ' if lo <= a and b <= hi else 'FAIL'} {k:8} {a:4}–{b:<4} (band {lo}-{hi})")
    tot = [sum(x) for x in zip(*words.values())]
    print(f"  {'ok  ' if TOTAL[0] <= min(tot) and max(tot) <= TOTAL[1] else 'FAIL'} total    {min(tot):4}–{max(tot):<4} ({TOTAL[0]}-{TOTAL[1]})\n")
    print("RULES")
    for rule, bad in counts.items():
        if rule.startswith("words in ") or rule.startswith("total"):
            if bad: fails.append(rule)
            continue
        if bad:
            shown, who = first_bad[rule]
            print(f"  FAIL {shown}  — {bad} of {len(words['opening'])} readings, first: {who}"); fails.append(rule)
        else:
            print(f"  ok   {rule}")
print(f"\n{'FAILED ' + str(len(fails)) if fails else 'ALL PASS'}\n")
sys.exit(1 if fails else 0)
