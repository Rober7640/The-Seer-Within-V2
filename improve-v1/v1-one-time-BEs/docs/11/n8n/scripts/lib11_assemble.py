"""How a fixed 11 report becomes one buyer's reading. Shared by the n8n builder, check-report.py,
make-blind-copies.py and check-11-assemble.py, so there is one reading of the format.

The report file (product/11-P3-su<N>-report.md):
  line 1  what it is · line 2  the fill-ins it uses · line 3  "Cards: 1 the Empress · 2 …" · line 4 blank
  then [OPENING] [CARD 1] … [CARD 12] [LETTER] [CLOSE] on their own lines.

Inside the prose:
  {{FIRST}} {{BIRTH_NAME}} {{DOB}}                 her name and date
  {{EX.saw}} {{LP.then}} …                          a line from the shared list (11-swapins.json)
  [[FORK get_back]]…[[/FORK]][[FORK giving]]…[[/FORK]]   versions written in the report. A run of
      adjacent blocks of one tag (only whitespace between) is one choice; she gets exactly one block.
      REASON needs 0 1 2, FORK needs get_back giving. A block may be empty.
  ⟪WRITE: …⟫                                         a gap still to write: the report can't ship.

The order-time half (fill) is mirrored in JS in build-11-assemble.py (FILL_JS);
check-11-assemble.py proves both give the same text for every combination.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCT = os.environ.get("ELEVEN_PRODUCT_DIR") or os.path.normpath(os.path.join(HERE, "../../product"))  # env: test copies only
BANK_PATH = os.path.join(HERE, "11-swapins.json")
SECTIONS = ["opening", *map(str, range(1, 13)), "letter", "close"]
CHOICES = {"REASON": ["0", "1", "2"], "FORK": ["get_back", "giving"]}
BANK_FIELDS = {"EX": ["trait", "saw", "praise", "use", "letter", "never", "moment", "kept", "last"], "LP": ["trait", "then", "praise", "now", "admire", "letter"],
               "REASON": ["headline", "letter"], "PY": ["ahead"]}
NUMBER_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "22"]   # 33 uses 6

class Hold(Exception):
    """The order must stop and wait for a person. Never guess."""

BLOCK = re.compile(r"\[\[(REASON|FORK) ([a-z0-9_]+)\]\](.*?)\[\[/\1\]\]", re.S)

def report_path(su):
    return os.path.join(PRODUCT, f"11-P3-su{su}-report.md")

def written_reports():
    found = {}
    for f in os.listdir(PRODUCT):
        m = re.fullmatch(r"11-P3-su(\d+)-report\.md", f)
        if m: found[m.group(1)] = os.path.join(PRODUCT, f)
    return dict(sorted(found.items(), key=lambda kv: int(kv[0])))

def _parts(text, where):
    """Prose → list of str and {"tag", "opts"} choices."""
    out, pos, last = [], 0, None
    for m in BLOCK.finditer(text):
        tag, key, body = m.group(1), m.group(2), m.group(3).strip("\n")
        gap = text[pos:m.start()]
        if last is not None and last["tag"] == tag and gap.strip() == "" and key not in last["opts"]:
            last["opts"][key] = body                      # same run: another version
        else:
            if gap: out.append(gap)
            last = {"tag": tag, "opts": {key: body}}
            out.append(last)
        pos = m.end()
    if text[pos:]: out.append(text[pos:])
    for p in out:
        if isinstance(p, str):
            if re.search(r"\[\[|\]\]", p):
                raise ValueError(f"{where}: a [[tag]] that isn't a closed version block: {p[p.find('[['):][:60]!r}")
        elif sorted(p["opts"]) != sorted(CHOICES[p["tag"]]):
            raise ValueError(f"{where}: {p['tag']} versions {sorted(p['opts'])}, needs {CHOICES[p['tag']]}")
    return out

def parse_report(path, cards_by_name=None):
    raw = open(path, encoding="utf-8").read()
    lines = raw.split("\n", 4)
    if len(lines) < 5 or not lines[2].startswith("Cards:"):
        raise ValueError(f"{os.path.basename(path)}: line 3 must be 'Cards: 1 the … · 2 …'")
    names = [re.sub(r"^\d+\s+", "", c.strip()) for c in lines[2].split(":", 1)[1].strip(" .").split("·")]
    if len(names) != 12: raise ValueError(f"{os.path.basename(path)}: line 3 lists {len(names)} cards, needs 12")
    cards = [cards_by_name[n.lower().replace("the ", "")] for n in names] if cards_by_name else names
    split = re.split(r"^\[(OPENING|CARD \d+|LETTER|CLOSE)\]\s*$", lines[4], flags=re.M)
    sec = {split[i].replace("CARD ", "").lower(): split[i + 1].strip() for i in range(1, len(split), 2)}
    if sorted(sec) != sorted(SECTIONS): raise ValueError(f"{os.path.basename(path)}: sections {sorted(sec)}")
    base = os.path.basename(path)
    return {"cards": cards, "sections": {k: _parts(sec[k], f"{base} [{k}]") for k in SECTIONS},
            "gaps": raw.count("⟪")}

def load_bank():
    return json.load(open(BANK_PATH, encoding="utf-8"))

def one(n):
    return {11: 2, 22: 4, 33: 6}.get(n, n)

def keys_for(su, ex, lp):
    return {"EX": str(6 if ex == 33 else ex), "LP": str(6 if lp == 33 else lp),
            "REASON": str(one(lp) % 3),
            "FORK": "get_back" if (one(su) + one(ex) + one(lp)) % 3 == 0 else "giving"}

FILL = re.compile(r"\{\{(EX|LP|REASON|PY)\.(\w+)\}\}")

def fill(tpl, bank, keys, first, birth_name, dob_text):
    missing, out = set(), {}
    def line(m):
        got = bank.get(m.group(1), {}).get(keys.get(m.group(1), ""), {}).get(m.group(2))
        if not got: missing.add(f"{m.group(1)} {keys.get(m.group(1), '?')} {m.group(2)}"); return ""
        return got
    for k, parts in tpl["sections"].items():
        s = "".join(p if isinstance(p, str) else p["opts"][keys[p["tag"]]] for p in parts)
        s = FILL.sub(line, s)
        s = s.replace("{{FIRST}}", first).replace("{{BIRTH_NAME}}", birth_name).replace("{{DOB}}", dob_text)
        s = s.replace("{{NEXT_BDAY}}", keys.get("NEXT_BDAY", "{{NEXT_BDAY}}"))
        out[k] = re.sub(r"\n{3,}", "\n\n", s).strip()
    if missing: raise Hold("no shared line yet for: " + " · ".join(sorted(missing)))
    left = sorted(set(re.findall(r"\{\{[^}]*\}\}|\[\[|\]\]|⟪", "\n".join(out.values()))))
    if left: raise Hold("unfilled spot(s) left in the reading: " + " ".join(left))
    return out

# ─── her numbers (same sums as NUMBERS_JS in build-11-assemble.py) ─────────────
LV = dict(zip("ajsbktcludmvenwfoxgpyhqzir",
              [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9]))
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]

def _sd(n): return sum(int(c) for c in str(abs(n)))
def _reduce(n):
    while n > 9 and n not in (11, 22, 33): n = _sd(n)
    return n

def numbers(birth_name, dob_iso):
    letters = [c for c in birth_name.lower() if "a" <= c <= "z"]
    su = _reduce(sum(LV[c] for c in letters if c in "aeiou")) or _reduce(sum(LV[c] for c in letters if c == "y"))
    ex = _reduce(sum(LV[c] for c in letters))
    yy, mm, dd = map(int, dob_iso.split("-"))
    lp = _reduce(_reduce(mm) + _reduce(dd) + _reduce(_sd(yy)))
    if not su or not ex: raise Hold("name gives no Soul Urge or Expression: test with another name")
    return su, ex, lp, f"{MONTHS[mm - 1]} {dd}, {yy}"

def year_ahead(dob_iso, today=None):
    """Her next birthday (the day her new year starts) and that year's number, 1-9.
    The year runs birthday to birthday: number = month + day + the year it starts in, reduced to one digit."""
    import datetime as _dt
    today = today or _dt.date.today()
    yy, mm, dd = map(int, dob_iso.split("-"))
    if mm == 2 and dd == 29: dd = 28
    start = today.year if (mm, dd) >= (today.month, today.day) else today.year + 1
    n = _reduce(mm) + _reduce(dd) + _reduce(_sd(start))
    while n > 9: n = _sd(n)
    return {"PY": str(n), "NEXT_BDAY": f"{MONTHS[mm - 1]} {dd}"}

def reading_for(birth_name, dob_iso, first=None, path=None, bank=None, today=None):
    su, ex, lp, dob_text = numbers(birth_name, dob_iso)
    path = path or report_path(su)
    keys = keys_for(su, ex, lp); keys.update(year_ahead(dob_iso, today))
    sec = fill(parse_report(path), bank or load_bank(), keys, first or birth_name.split()[0], birth_name, dob_text)
    return {"su": su, "ex": ex, "lp": lp, "keys": keys, "sections": sec}

def as_text(sections):
    """A filled reading as plain text, the way a reader sees it (no labels)."""
    out = []
    for k in SECTIONS:
        if k.isdigit(): out.append(f"— Card {k} —")
        elif k == "letter": out.append("— The letter —")
        out.append(sections[k])
    return "\n\n".join(out) + "\n"
