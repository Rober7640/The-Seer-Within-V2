#!/usr/bin/env python3
"""Free checks for one fixed 11 report (11-P3-su<N>-report.md). No model, no network.

    python3 docs/11/product/scripts/check-report.py docs/11/product/11-P3-su9-report.md

Prints words per section against its weight, then every rule it can check by text.
Exit code 1 if any hard rule fails. Judgement (voice, blame, story) is the blind read's job.
"""
import re, sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()
body = raw.split("\n", 4)[4] if raw.startswith("11-P3") else raw     # drop the 3-line header
text = re.sub(r"\[\[/?[A-Z]+\]\]", "", body)                          # swap-in tags out
parts = re.split(r"^\[(OPENING|CARD \d+|LETTER|CLOSE)\]\s*$", text, flags=re.M)
sec = {parts[i]: parts[i + 1].strip() for i in range(1, len(parts), 2)}

BAND = {"OPENING": (150, 260), "LETTER": (400, 600), "CLOSE": (20, 90)}
for c in (1, 8, 9, 10, 12): BAND[f"CARD {c}"] = (450, 650)            # big
for c in (3, 5, 7, 11):     BAND[f"CARD {c}"] = (250, 350)            # medium
for c in (2, 4, 6):         BAND[f"CARD {c}"] = (100, 160)            # short

fails = []
def need(ok, msg):
    print(("  ok   " if ok else "  FAIL ") + msg)
    if not ok: fails.append(msg)

print("\nWORDS")
total = 0
for name in ["OPENING"] + [f"CARD {i}" for i in range(1, 13)] + ["LETTER", "CLOSE"]:
    n = len(sec.get(name, "").split()); total += n
    lo, hi = BAND[name]
    need(lo <= n <= hi, f"{name:9} {n:4}  (band {lo}-{hi})")
need(4000 <= total <= 5000, f"total {total} (4000-5000)")

print("\nREQUIRED LINES")
op, c12, last = sec.get("OPENING", ""), sec.get("CARD 12", ""), sec.get("CLOSE", "")
need("Your birth name and date set how I lay your twelve cards." in op, "opening: the birth-name sentence, as its own sentence")
need("this is someone living" in op.lower(), "opening: this is someone living")
need("you owe them no reply" in op, "opening: you owe them no reply")
need("you owe them no reply" in sec.get("CARD 11", ""), "card 11: you owe them no reply")
need(sec.get("CARD 1", "").startswith("**"), "card 1 opens in bold")
need(sec.get("CARD 9", "").startswith("**"), "card 9 opens in bold")
need(sec.get("CARD 10", "").startswith("**"), "card 10 opens in bold")
need("**Stop going back.**" in c12 and "**The one thing to do.**" in c12, "card 12: both bold labels")
need("five to seven days" in c12, "card 12: the five-to-seven-day window")
need(last.rstrip().endswith("It's back. What you do with it is on you."), "close: exact last line")
unsaid = re.search(r'"([^"]+)"', sec.get("CARD 11", ""))
need(bool(unsaid) and unsaid.group(1) in sec.get("LETTER", ""), "unsaid sentence word for word in card 11 and the letter")

print("\nBANNED")
low = text.lower()
banned = {
    "numerology words": r"numerolog|karmic|vowel|soul urge|life path|\bexpression\b|\bsum\b",
    "words for what they were": r"\bex\b|husband|boyfriend|girlfriend|partner|\blover\b|spouse",
    "hedges": r"\bperhaps\b|\bmaybe\b|\benergy\b|journey|the universe|\bi feel\b|\bi sense\b|it seems|the cards suggest",
    "therapy words": r"\btrauma\b|\bboundar|\bheal(ing)?\b|self-care|toxic|narcissis",
    "British words": r"\bround (you|to|the)\b|kitted|any more\b|whilst|colour|favour|\bmum\b|holiday|fortnight|car park|queue|cheque|they've no idea",
    "past clients": r"\bclient|another woman i read|a woman i read for",
    "how long the writing took": r"\b\d+ hours\b|all night writing|took me (hours|nights)",
}
for label, rx in banned.items():
    hits = sorted(set(m.group(0) for m in re.finditer(rx, low)))
    need(not hits, f"{label}: {', '.join(hits) if hits else 'none'}")
years_out = [k for k, v in sec.items() if k != "CARD 8" and re.search(r"\byears\b", v.lower())]
need(not years_out, f"'years' only in card 8 {years_out if years_out else ''}")
for card in ("hermit", "judgement", "devil"):
    need(not re.search(rf"(turned|laid|drew|fell)[^.]*\b{card}\b", low), f"the {card} never falls in this spread")

print("\nSWAP-IN TAGS")
for tag in ("EX", "LP", "EXCUSE", "REASON", "FORK"):
    o, c = body.count(f"[[{tag}]]"), body.count(f"[[/{tag}]]")
    need(o == c, f"[[{tag}]] opened {o}, closed {c}")

print(f"\n{'FAILED ' + str(len(fails)) if fails else 'ALL PASS'}\n")
sys.exit(1 if fails else 0)
