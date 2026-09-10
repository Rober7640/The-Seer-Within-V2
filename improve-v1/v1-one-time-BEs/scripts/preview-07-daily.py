#!/usr/bin/env python3
"""Rebuild the *-preview.html twins by inlining every remote image as a data: URI.

  python3 scripts/preview-07-daily.py            # all seven
  python3 scripts/preview-07-daily.py mon sun    # just those

The preview is the shipped .html with nothing left to fetch, so it renders the same in a
browser, offline, a year from now. ⛔ It is a VIEWING copy — never the thing that sends.

Why not build-07-daily.py: that script is stale and regenerating from it would drop the
shipped copy. This derives the preview FROM the .html, so the two can never disagree.
"""
import base64, json, os, re, sys, urllib.request

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAILY = f"{ROOT}/copy/07-marcus/daily"

# ⭐ The seven days come from scripts/07-spreads.json, THE registry. Nothing is restated here.
with open(f"{ROOT}/scripts/07-spreads.json", encoding="utf-8") as _f:
    _REG = json.load(_f)
_STEM = {s["day"]: os.path.splitext(os.path.basename(s["built_email"]["email_md"]))[0]
         for s in _REG["spreads"].values()}
STEMS = {d: _STEM[d] for d in _REG["days"]}
cache = {}

def inline(url):
    if url not in cache:
        with urllib.request.urlopen(url, timeout=60) as r:
            raw = r.read()
        mime = "image/png" if url.endswith(".png") else "image/jpeg"
        cache[url] = f"data:{mime};base64," + base64.b64encode(raw).decode()
    return cache[url]

def main():
    days = [a for a in sys.argv[1:] if a in STEMS] or list(STEMS)
    for d in days:
        src = f"{DAILY}/{STEMS[d]}.html"
        s = open(src).read()
        urls = sorted(set(re.findall(r'src="(https://[^"]+)"', s)))
        for u in urls:
            s = s.replace(f'src="{u}"', f'src="{inline(u)}"')
        out = f"{DAILY}/{STEMS[d]}-preview.html"
        open(out, "w").write(s)
        print(f"✅ {os.path.basename(out)}  {len(urls)} images inlined  {len(s)//1024}KB")

if __name__ == "__main__":
    main()
