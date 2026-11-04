#!/usr/bin/env python3
"""Make the clean, unlabelled files a blind reader gets. Free.

    python3 docs/11/product/scripts/make-blind-copies.py <report.md> <control.md> <out_dir> [--swap]
            [--buyer "Faketta Ann Testerly" --dob 1962-11-05]

- report  = the fixed report under test (11-P3-su<N>-report.md, the template)
- control = the comparison arm: the previous approved version (a template, or an old tagged report
            such as `git show 774d291:…/11-P3-su9-report.md`), or a machine run (runs/11-run-*.md)
- out_dir = a scratch folder OUTSIDE the repo (the reader must not be able to find the repo)
- --buyer/--dob = who the reading is for (default Testina Rose Testerly, 1962-11-05). A template is
  filled for her real numbers, exactly as n8n would. An old tagged report or a run is re-named to her.
  Both arms always carry the same name and date, so only the writing differs.

Writes free-letter.md (11-E2, notes and links stripped, first name filled in), reading-A.md,
reading-B.md, and KEY-do-not-share.txt. By default A = control, B = report; --swap flips it, so
alternate between runs and position never decides the result.
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../n8n/scripts"))
import lib11_assemble as L

args = [a for a in sys.argv[1:]]
opt = lambda k, d: args[args.index(k) + 1] if k in args else d
report, control, out = args[0], args[1], args[2]
swap = "--swap" in args
birth = opt("--buyer", "Testina Rose Testerly"); dob = opt("--dob", "1962-11-05")
first = birth.split()[0]
E2 = os.path.join(HERE, "..", "..", "sales-emails", "11-E2-esl.md")
os.makedirs(out, exist_ok=True)
notes = []

def reading(path):
    t = open(path, encoding="utf-8").read()
    if "{{FIRST}}" in t:                                                  # a template: fill it for her
        r = L.reading_for(birth, dob, first, path=path)
        notes.append(f"{os.path.basename(path)}: SU {r['su']} · EX {r['ex']} · LP {r['lp']} · {r['keys']}")
        return L.as_text(r["sections"])
    _, _, _, dob_text = L.numbers(birth, dob)
    if "## The reading" in t: t = t.split("## The reading", 1)[1]          # a saved n8n run
    elif t.startswith("11-P3"): t = t.split("\n", 4)[4]                    # an old tagged report
    t = t.replace("Testina Rose Testerly", birth).replace("November 5, 1962", dob_text).replace("Testina", first)
    t = re.sub(r"\[\[/?[A-Z]+\]\]", "", t)
    t = re.sub(r"^\[OPENING\]\s*$", "", t, flags=re.M)
    t = re.sub(r"^\[CARD (\d+)\]\s*$", lambda m: f"— Card {m.group(1)} —", t, flags=re.M)
    t = re.sub(r"^\[LETTER\]\s*$", "— The letter —", t, flags=re.M)
    t = re.sub(r"^\[CLOSE\]\s*$", "", t, flags=re.M)
    notes.append(f"{os.path.basename(path)}: used as written, re-named to {birth}")
    return re.sub(r"\n{3,}", "\n\n", t).strip() + "\n"

lines = open(E2, encoding="utf-8").read().split("\n")
start = next(i for i, l in enumerate(lines) if l.startswith("<!-- BEAT 1"))
end = next(i for i, l in enumerate(lines) if l.startswith("## Build notes"))
e2 = "\n".join(l for l in lines[start:end] if not l.startswith("<!--"))
e2 = re.sub(r"\[([^\]]+)\]\(\{\{BOOKING_URL\}\}[^)]*\)", r"\1", e2).replace("%FIRSTNAME%", first)
open(os.path.join(out, "free-letter.md"), "w").write(re.sub(r"\n{3,}", "\n\n", e2).strip() + "\n")

a, b = (report, control) if swap else (control, report)
open(os.path.join(out, "reading-A.md"), "w").write(reading(a))
open(os.path.join(out, "reading-B.md"), "w").write(reading(b))
open(os.path.join(out, "KEY-do-not-share.txt"), "w").write(f"A = {a}\nB = {b}\nbuyer = {birth}, {dob}\n" + "\n".join(notes) + "\n")

LEAK = r"\[\[|\{\{|⟪|BEAT|BOOKING|n8n|gpt|Soul Urge|operator|11-P" + ("|Testina" if first != "Testina" else "")
leaks = [f for f in ("reading-A.md", "reading-B.md", "free-letter.md")
         if re.search(LEAK, open(os.path.join(out, f)).read())]
print(f"  wrote {out}  ·  A = {os.path.basename(a)}  ·  B = {os.path.basename(b)}  ·  for {birth}")
for n in notes: print(f"  {n}")
print("  ⛔ leaks: " + ", ".join(leaks) if leaks else "  no labels leak into the reader's files")
