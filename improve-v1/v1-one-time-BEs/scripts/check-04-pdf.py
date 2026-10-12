#!/usr/bin/env python3
"""The B7 gate for backend offer 04 "The Turn" — run by build-04-pdf.mjs, or alone:

    python3 improve-v1/v1-one-time-BEs/scripts/check-04-pdf.py [divided-rim turned-handle sunken-leaf]

Per cup PDF (docs/04/product/pdf/04-the-turn-<cup>.pdf) it checks:
  - no leftover tokens or notes text ([IMG-, %, {{, <!--, spec/build-note phrases), no buyer name, no date
  - every image slot replaced, every <img> in the assembled HTML has alt text
  - the calendar appears once, as the last section, on exactly one page
  - layout heuristics: no heading at the foot of a page, no image alone at the top of a page,
    no near-empty page, the cover has no running header / page number
  - file size under 5MB
and renders every page to PNG (in the system temp dir, printed below) plus a contact sheet preview-<cup>.jpg.
The heuristics do not replace looking at the pages; they catch regressions on a rebuild.
Exits non-zero if any check fails.
"""
import os
import re
import sys
import tempfile

import pymupdf
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
BE = os.path.dirname(HERE)
OUT = os.path.join(BE, "docs/04/product/pdf")
BUILD = os.path.join(OUT, "build")
CUPS = ["divided-rim", "turned-handle", "sunken-leaf"]

FORBIDDEN = [
    "[IMG-", "%", "{{", "}}", "<!--", "-->", "`", "Build notes", "renders here", "04-P1", "04-P3",
    "Words before the calendar", "Bridge days", "Promised in", "Delivered", "Matches", "⚠", "§",
    "(rec.)", "FIRSTNAME", "AWEBER", "merge field", "Map |",
]
DATE_RE = re.compile(
    # full month names or exact abbreviations only — "Mar[a-z]*" matched "Mark 1" (the photo's marks)
    r"\b(20\d\d|(January|February|March|April|May|June|July|August|September|October|November|December|"
    r"Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? \d{1,2}|"
    r"\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December))\b"
)
CAL_FIRST = "And this is yours to put on a door"
CAL_ONLY = ["How to use it on a bad night", "One rule", "On the twenty-second day"]
TOP, BOTTOM = 72, 792 - 72  # content area (1in margins); header/footer live outside it


def page_blocks(page):
    """Content-area blocks as (y0, y1, kind, text, is_heading)."""
    out = []
    d = page.get_text("dict")
    for b in d["blocks"]:
        x0, y0, x1, y1 = b["bbox"]
        if y1 <= TOP - 2 or y0 >= BOTTOM + 2:
            continue  # running header / page number
        if b["type"] == 1:
            out.append((y0, y1, "image", "", False))
            continue
        spans = [s for l in b["lines"] for s in l["spans"] if s["text"].strip()]
        if not spans:
            continue
        text = " ".join(s["text"] for s in spans).strip()
        heading = (all("Playfair" in s["font"] for s in spans) and max(s["size"] for s in spans) >= 12.5
                   and not text.startswith("— Evelyn"))  # the sign-off is set in Playfair too
        out.append((y0, y1, "text", text, heading))
    out.sort(key=lambda t: t[0])
    return out


def contact_sheet(pngs, dest, cols=6, thumb_w=260):
    thumbs = [Image.open(p).convert("RGB") for p in pngs]
    ratio = thumbs[0].height / thumbs[0].width
    th = int(thumb_w * ratio)
    pad, label = 18, 22
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (thumb_w + pad) + pad, rows * (th + pad + label) + pad), (236, 232, 226))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15)
    except OSError:
        font = ImageFont.load_default()
    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        x = pad + c * (thumb_w + pad)
        y = pad + r * (th + pad + label)
        sheet.paste(t.resize((thumb_w, th), Image.LANCZOS), (x, y))
        draw.rectangle([x - 1, y - 1, x + thumb_w, y + th], outline=(180, 172, 160))
        draw.text((x, y + th + 4), f"p{i + 1}", fill=(80, 70, 60), font=font)
    sheet.save(dest, "JPEG", quality=82)


def check(cup):
    pdf_path = os.path.join(OUT, f"04-the-turn-{cup}.pdf")
    html_path = os.path.join(BUILD, f"{cup}.html")
    results = []  # (ok, label, detail)

    def res(ok, label, detail=""):
        results.append((ok, label, detail))

    doc = pymupdf.open(pdf_path)
    n = doc.page_count
    texts = [p.get_text() for p in doc]
    full = "\n".join(texts)
    size = os.path.getsize(pdf_path)

    # 1. leftovers / notes / personal data
    hits = [t for t in FORBIDDEN if t in full]
    res(not hits, "no leftover tokens or notes text", ", ".join(hits))
    dates = sorted({m.group(0) for m in DATE_RE.finditer(full)})
    res(not dates, "no date, no buyer name merge", ", ".join(dates))

    # 2. images: slots replaced + alt text
    html = open(html_path, encoding="utf8").read()
    imgs = re.findall(r"<img\b[^>]*>", html)
    no_alt = [i for i in imgs if not re.search(r'\balt="[^"]{8,}"', i)]
    pdf_imgs = sum(len(p.get_images(full=False)) for p in doc)
    # cover + the map + the 7 mark crops; [IMG-CUP] is deliberately text-only (the cover carries the photo)
    res(len(imgs) == 9 and not no_alt and "[IMG-" not in html,
        "every image slot replaced, every image has alt text",
        f"{len(imgs)} <img> in HTML (cover + map + 7 marks), {len(no_alt)} without alt; {pdf_imgs} image placements in PDF")

    # 3. calendar: once, last section, one page
    cal_pages = [i for i, t in enumerate(texts) if CAL_FIRST in t]
    cal_only_pages = sorted({i for i, t in enumerate(texts) for k in CAL_ONLY if k in t})
    last_text = texts[-1]
    ends_right = "calendar left up past its" in last_text.replace("\n", " ")
    res(full.count(CAL_FIRST) == 1 and cal_pages == [n - 1] and cal_only_pages == [n - 1] and ends_right,
        "calendar appears once, last, on one page",
        f"starts p{[p + 1 for p in cal_pages]}, calendar-only headings on p{[p + 1 for p in cal_only_pages]}, "
        f"last line on last page: {ends_right}")

    # 4. layout heuristics
    problems = []
    cover = texts[0]
    squash = lambda t: re.sub(r"\s+", "", t)
    if "THETURN" in squash(cover) or re.search(r"^\s*1\s*$", cover, re.M):
        problems.append("p1 cover carries the running header or a page number")
    for i, page in enumerate(doc):
        if i == 0:
            continue
        blocks = page_blocks(page)
        body_text = "".join(b[3] for b in blocks)
        has_img = any(b[2] == "image" for b in blocks)
        if blocks and blocks[-1][4]:
            problems.append(f"p{i + 1} ends on a heading: {blocks[-1][3][:50]!r}")
        if blocks and blocks[0][2] == "image":
            # an image may open a page only as part of a stretch card, i.e. with its heading beside it
            head_beside = any(b[4] and b[0] < blocks[0][1] for b in blocks[1:])
            if not head_beside:
                problems.append(f"p{i + 1} opens on an image with no heading beside it")
        if len(body_text) < 600 and not has_img and i != n - 1:
            problems.append(f"p{i + 1} is near-empty ({len(body_text)} chars)")
        # running header + page number present on every non-cover page
        if "THETURN" not in squash(texts[i]) or not re.search(rf"^\s*{i + 1}\s*$", texts[i], re.M):
            problems.append(f"p{i + 1} missing running header or page number")
    last_blocks = page_blocks(doc[-1])
    if len("".join(b[3] for b in last_blocks)) < 600:
        problems.append("final page is near-empty")
    res(not problems, "layout heuristics (heading at foot, lone image at top, near-empty pages, header/number)",
        "; ".join(problems))

    # 5. fonts: real embedded TrueType/OpenType, never Type3 (variable fonts print as Type3)
    fonts = {f[3]: f[2] for pg in doc for f in pg.get_fonts(full=True)}
    bad = sorted(n for n, t in fonts.items() if t == "Type3")
    res(not bad and any("Garamond" in n for n in fonts) and any("Playfair" in n for n in fonts),
        "fonts embedded (EB Garamond + Playfair Display, no Type3)", ", ".join(bad) or f"{len(fonts)} faces")

    # 6. size
    res(size < 5 * 1024 * 1024, "file size under 5MB", f"{size / 1024 / 1024:.2f} MB")

    # page PNGs + contact sheet
    page_dir = os.path.join(tempfile.gettempdir(), "04-the-turn-pages", cup)  # kept out of the repo
    os.makedirs(page_dir, exist_ok=True)
    for f in os.listdir(page_dir):
        if f.endswith(".png"):
            os.remove(os.path.join(page_dir, f))
    pngs = []
    for i, page in enumerate(doc):
        p = os.path.join(page_dir, f"p{i + 1:02d}.png")
        page.get_pixmap(dpi=110).save(p)
        pngs.append(p)
    preview = os.path.join(OUT, f"preview-{cup}.jpg")
    contact_sheet(pngs, preview)

    print(f"\n── {cup}: {n} pages, {size / 1024 / 1024:.2f} MB → {os.path.relpath(preview, os.getcwd())}  (pages: {page_dir})")
    for ok, label, detail in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  [{detail}]" if detail else ""))
    return all(ok for ok, _, _ in results)


if __name__ == "__main__":
    cups = sys.argv[1:] or CUPS
    ok = all([check(c) for c in cups])
    sys.exit(0 if ok else 1)
