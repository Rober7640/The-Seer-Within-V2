#!/usr/bin/env python3
"""Generate 07's daily spread photographs — one per weekday.

  python3 scripts/make-07-day-art.py             # every day whose PNG is missing
  python3 scripts/make-07-day-art.py mon fri     # just those
  python3 scripts/make-07-day-art.py --all       # regenerate everything, overwriting
  python3 scripts/make-07-day-art.py --print mon # show the composed prompt, generate nothing

⭐ THE DOC IS THE SOURCE. Every prompt is read out of docs/07-marcus/07-art-prompt.md:
   HEAD + that day's CARDS paragraph + TAIL. Nothing is stored here, so HEAD and TAIL are
   byte-identical across the seven days by construction. Edit the doc, not this file.

⛔ THE CARDS ARE NOT A CHOICE. Each day's face-up cards are fixed by the shipped .html in
   copy/07-marcus/daily/ — the email inlines that RWS scan and describes what is on it.
   Changing a card here silently contradicts the email.

⛔ Prompt length and stdin: see the header of scripts/gen-image.py. Both cost an hour.
"""
import re, sys, os, subprocess, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC  = os.path.join(ROOT, "docs/07-marcus/07-art-prompt.md")


def blocks():
    """-> (head, tail, {slug: (title, out_path, cards)}) straight out of the doc."""
    md = open(DOC).read()
    fence = r"```\n(.*?)\n```"

    def after(heading):
        i = md.index(heading)
        return re.search(fence, md[i:], re.S).group(1)

    head = after("### HEAD —")
    tail = after("### TAIL —")

    days = {}
    # ⛔ KEYED ON THE SPREAD KEY, NOT THE WEEKDAY. It used to match `^### (\w+day) · …` and index
    #    on the first three letters, which was fine while seven spreads owned seven weekdays.
    #    The 30-day test runs four or five spreads on every weekday, so a weekday heading would
    #    have silently overwritten four blocks with the fifth and shot one photograph for five
    #    different mornings.
    for m in re.finditer(r"^### ([a-z0-9][a-z0-9-]*) · ([^\n—]+) —[^\n]*→ `([^`]+)`", md, re.M):
        key, title, out = m.group(1), m.group(2).strip(), m.group(3)
        if key in days:
            raise SystemExit(f"07-art-prompt.md has two blocks for '{key}' — a key is one spread")
        days[key] = (f"{key} · {title}", out, re.search(fence, md[m.start():], re.S).group(1))
    return head, tail, days


def compose(head, tail, cards):
    return f"{head}\n\n{cards}\n\n{tail}"


def one(job):
    slug, title, out, prompt = job
    path = os.path.join(ROOT, out)
    full = (f"Generate one image and save it to exactly this path: {path}\n\n"
            f"{prompt}\n\nSave the image to {path} and then stop.")
    r = subprocess.run(["codex", "exec", "--sandbox", "workspace-write",
                        "--skip-git-repo-check", full],
                       stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=600)
    ok = os.path.exists(path)
    return slug, title, out, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-400:]


def main():
    argv = sys.argv[1:]
    show = "--print" in argv
    force = "--all" in argv
    want = [a for a in argv if not a.startswith("-")]

    head, tail, days = blocks()
    # ⛔ Zero blocks means the doc's headings no longer match the parser — which is exactly what
    #    happened when the headings were weekday-named and the parser went key-based. Silence
    #    there reads as "nothing to do" and you discover it when the emails have no art.
    if not days:
        sys.exit("07-art-prompt.md has NO spread blocks the parser recognises.\n"
                 "  Expected headings shaped:  ### <spread-key> · <Name> — N face up, M face down"
                 " → `assets/07-<spread-key>-rws.png`\n"
                 "  ⛔ The weekday headings (### Monday · …) are the RETIRED seven and no longer"
                 " match — the 30-day test runs several spreads per weekday.")
    bad = [w for w in want if w not in days]
    if bad:
        sys.exit(f"unknown day(s): {', '.join(bad)} — have {', '.join(days)}")

    order = want or list(days)
    jobs = []
    for slug in order:
        title, out, cards = days[slug]
        if not want and not force and os.path.exists(os.path.join(ROOT, out)):
            continue
        jobs.append((slug, title, out, compose(head, tail, cards)))

    if show:
        for slug, title, out, prompt in jobs:
            print(f"\n{'='*78}\n{slug}  {title}  ->  {out}\n{'='*78}\n{prompt}")
        return
    if not jobs:
        print("nothing to do — every PNG exists (use --all to regenerate)")
        return

    print(f"generating {len(jobs)}: {', '.join(j[0] for j in jobs)}\n")
    failed = []
    with cf.ThreadPoolExecutor(max_workers=len(jobs)) as ex:
        for slug, title, out, ok, size, tail_out in ex.map(one, jobs):
            print(f"{'✅' if ok else '❌'} {slug:<4} {title:<34} {out:<26} {size//1024 if ok else 0}KB")
            if not ok:
                print(f"     {tail_out.strip()[:300]}")
                failed.append(slug)

    # ⛔ EXIT NON-ZERO WHEN NOTHING WAS DRAWN. This used to return 0 after every image failed,
    #    so a run that produced no art at all looked like a run that worked — and the next step
    #    only finds out when an email has no picture in it.
    if failed:
        sys.exit(f"\n❌ {len(failed)} of {len(jobs)} produced NO image: {', '.join(failed)}\n"
                 "   Nothing was written. Read the error above — a 400 naming a model is the "
                 "local `codex` CLI being older than the model its config asks for, not a "
                 "problem with the prompt.")


if __name__ == "__main__":
    main()
