#!/usr/bin/env python3
"""Make the clean, unlabelled files a blind reader gets. Free.

    python3 docs/11/product/scripts/make-blind-copies.py <report.md> <control.md> <out_dir> [--swap]

- report  = the fixed report under test (11-P3-su<N>-report.md)
- control = the comparison arm: the previous approved version, or a machine run (runs/11-run-*.md)
- out_dir = a scratch folder OUTSIDE the repo (the reader must not be able to find the repo)

Writes free-letter.md (11-E2, notes and links stripped, first name filled in), reading-A.md,
reading-B.md, and KEY-do-not-share.txt. By default A = control, B = report; --swap flips it, so
alternate between runs and position never decides the result.
"""
import os, re, sys

report, control, out = sys.argv[1], sys.argv[2], sys.argv[3]
swap = "--swap" in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))
E2 = os.path.join(HERE, "..", "..", "sales-emails", "11-E2-esl.md")
os.makedirs(out, exist_ok=True)

def reading(path):
    t = open(path, encoding="utf-8").read()
    if "## The reading" in t: t = t.split("## The reading", 1)[1]          # a saved n8n run
    elif t.startswith("11-P3"): t = t.split("\n", 4)[4]                    # drop a report's header
    t = re.sub(r"\[\[/?[A-Z]+\]\]", "", t)
    t = re.sub(r"^\[OPENING\]\s*$", "", t, flags=re.M)
    t = re.sub(r"^\[CARD (\d+)\]\s*$", lambda m: f"— Card {m.group(1)} —", t, flags=re.M)
    t = re.sub(r"^\[LETTER\]\s*$", "— The letter —", t, flags=re.M)
    t = re.sub(r"^\[CLOSE\]\s*$", "", t, flags=re.M)
    return re.sub(r"\n{3,}", "\n\n", t).strip() + "\n"

first = re.search(r"^Testina|^(\w+),?\s*$", reading(report), flags=re.M)
name = (first.group(0).rstrip(",").strip() if first else "Testina")

lines = open(E2, encoding="utf-8").read().split("\n")
start = next(i for i, l in enumerate(lines) if l.startswith("<!-- BEAT 1"))
end = next(i for i, l in enumerate(lines) if l.startswith("## Build notes"))
e2 = "\n".join(l for l in lines[start:end] if not l.startswith("<!--"))
e2 = re.sub(r"\[([^\]]+)\]\(\{\{BOOKING_URL\}\}[^)]*\)", r"\1", e2).replace("%FIRSTNAME%", name)
open(os.path.join(out, "free-letter.md"), "w").write(re.sub(r"\n{3,}", "\n\n", e2).strip() + "\n")

a, b = (report, control) if swap else (control, report)
open(os.path.join(out, "reading-A.md"), "w").write(reading(a))
open(os.path.join(out, "reading-B.md"), "w").write(reading(b))
open(os.path.join(out, "KEY-do-not-share.txt"), "w").write(f"A = {a}\nB = {b}\n")

leaks = [f for f in ("reading-A.md", "reading-B.md", "free-letter.md")
         if re.search(r"\[\[|BEAT|BOOKING|n8n|gpt|Soul Urge|operator|11-P", open(os.path.join(out, f)).read())]
print(f"  wrote {out}  ·  A = {os.path.basename(a)}  ·  B = {os.path.basename(b)}")
print("  ⛔ leaks: " + ", ".join(leaks) if leaks else "  no labels leak into the reader's files")
