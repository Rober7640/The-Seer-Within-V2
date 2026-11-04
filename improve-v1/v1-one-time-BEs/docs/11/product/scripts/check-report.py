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
BAND = {"opening": (150, 260), "letter": (400, 600), "close": (20, 90)}
for c in (1, 8, 9, 10, 12): BAND[str(c)] = (450, 650)            # big
for c in (3, 5, 7, 11):     BAND[str(c)] = (250, 350)            # medium
for c in (2, 4, 6):         BAND[str(c)] = (100, 160)            # short
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
    yield "close: exact last line", last.rstrip().endswith("It's back. What you do with it is on you.")
    unsaid = re.search(r'"([^"]+)"', sec["11"])
    yield "unsaid sentence word for word in card 11 and the letter", bool(unsaid) and unsaid.group(1) in sec["letter"]
    for label, rx in BANNED.items():
        hits = sorted(set(m.group(0) for m in re.finditer(rx, low)))
        yield f"banned, {label}" + (f": {', '.join(hits)}" if hits else ""), not hits
    out = [k for k, v in sec.items() if k != "8" and re.search(r"\byears\b", v.lower())]
    yield "'years' only in card 8" + (f" (also in {out})" if out else ""), not out
    for card in ("hermit", "judgement", "devil"):
        yield f"the {card} never falls in this spread", not re.search(rf"(turned|laid|drew|fell)[^.]*\b{card}\b", low)
    total = sum(len(v.split()) for v in sec.values())
    yield f"total words 4000-5000", 4000 <= total <= 5000
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
          "{{LP.letter}}": "\n\n{{LP.letter}}\n\n", "{{EXCUSE.quote}}": 'the line was "{{EXCUSE.quote}}"',
          "{{EXCUSE.letter}}": "I told myself {{EXCUSE.letter}}.",
          "{{REASON.headline}}": "because {{REASON.headline}}.**",
          "{{REASON.letter}}": "I'm never going to send this. {{REASON.letter}} So it stays here."}
raw = open(path, encoding="utf-8").read()
print("FRAMES")
for spot, frame in FRAMES.items():
    n, f = raw.count(spot) - raw.split("\n", 3)[1].count(spot), raw.count(frame)
    ok = n == 1 and f == 1
    print(f"  {'ok  ' if ok else 'FAIL'} {spot:20} used {n}×, in its frame {f}×")
    if not ok: fails.append(f"frame {spot}")
print()

bank = L.load_bank()
held = set()
counts, first_bad, holds, words = {}, {}, {}, {k: [] for k in L.SECTIONS}
n = 0
for ex in L.NUMBER_KEYS:
    for lp in L.NUMBER_KEYS:
        for fork in ("get_back", "giving"):
            keys = L.keys_for(9, int(ex), int(lp)); keys["FORK"] = fork
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

print(f"  {n} readings: every Expression × every Life Path × both paths\n")
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
    print(f"  {'ok  ' if 4000 <= min(tot) and max(tot) <= 5000 else 'FAIL'} total    {min(tot):4}–{max(tot):<4} (4000-5000)\n")
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
