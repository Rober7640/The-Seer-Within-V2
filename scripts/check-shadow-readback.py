#!/usr/bin/env python3
"""Read-back sweep for the shadow drafts — the faults check-draft and check-collisions cannot see.
Every pattern below is a ban written in inherited-shadow-cut.md, natural-tarot-cut.md, the deck
symbols tables, or a live guard file. Nothing here is invented.

Usage:
  python3 scripts/check-shadow-readback.py                    # production shadow drafts
  python3 scripts/check-shadow-readback.py --dir shadow-review # approved review batch
"""
import json, glob, re, sys
DIR = 'shadow'
if '--dir' in sys.argv:
    i = sys.argv.index('--dir')
    if i + 1 >= len(sys.argv):
        print('usage: check-shadow-readback.py [--dir <draft-folder>]', file=sys.stderr)
        sys.exit(2)
    DIR = sys.argv[i + 1]
FILES = sorted(glob.glob(f'fb-tarot/docs/drafts/{DIR}/*.json'))
if not FILES:
    print(f'no JSON drafts found in fb-tarot/docs/drafts/{DIR}/', file=sys.stderr)
    sys.exit(2)
fails, warns = [], []

BANNED_SYMBOL = [
 (r'\bcliff|\bthe edge\b|\bover the edge\b|\bthe drop\b', 'BANNED SYMBOL: the Fool\'s cliff — never proves anything good'),
 (r'\bdog\b',            'BANNED SYMBOL: the little white dog is a WARNING, never a companion'),
 (r'\bsnake|\bbelt\b',   'BANNED SYMBOL: the Magician\'s snake belt reads as going round in circles'),
 (r'\bpomegranate|\bred fruit\b', 'BANNED SYMBOL: fertility, unusable for a 55+ audience'),
 (r'\bhis own choice\b|\bchose to hang\b|\bhe chose this\b', 'BANNED: the Hanged Man hangs by his own choice = "you chose this"'),
 (r'\bloop\b|\bcomes back round\b|\bround in circles\b|\btreadmill\b', 'INVERTS THE CARD: the lemniscate is unlimited potential, never a loop'),
]
SHADOW_INVENTS = [
 (r'\bcurse|\bhex\b|\bkarma|\bpast life|\bspell\b|\bevil eye', 'shadow-method ban: occult-harm language'),
 (r'\bfate\b|\bdestiny|\bmeant to be\b|\ba lesson\b|\bthe plan\b', 'shadow-method ban: inherited is not fated'),
 (r'\btrauma|\bepigenetic|\battachment style|\bancestral wound|\binner child|\bnervous system|\bshadow work\b', 'shadow-method ban: trauma/diagnosis language'),
 (r'\bgenerations?\b|\bcentur|\bgreat-grand|\b(two|three) (women|men|lives) back\b', 'shadow-method ban: never DATE the inheritance'),
 (r'\bpassed (it )?(on )?to your (children|kids|daughter|son)\b', 'shadow-method ban: never say she passed it on'),
]
AUTHORSHIP = [
 (r'\bsomeone close to you\b|\ba family member\b', 'AUTHORSHIP BAN: gestures at a real person as the block'),
 (r'\byour (mother|grandmother|father|sister|brother|son|daughter|husband|family)\b', 'AUTHORSHIP BAN: names a relative'),
 (r'\bsomeone (is )?(working against|holding|taking|blocking)\b', 'AUTHORSHIP BAN: an unnamed enemy'),
 (r'\bfamily line\b|\bdown the line\b|\bhanded (it )?down\b|\bran in your\b', 'family-line language does not belong on a lander (open thread)'),
]
CHECKABLE = [
 (r'\bmore than once\b|\bmore than one\b|\btwice\b|\bthree times\b|\bevery night\b|\beach morning\b', 'COLD READ: a count she can catch'),
 (r'\byou still (cook|make|set|pour|lay)\b|\byou go through the numbers\b', 'COLD READ: an invented behaviour'),
 (r'\b(january|february|march|april|june|july|august|september|october|november|december)\b|\bin may\b|\bmay \d{1,2}\b', 'a DATE'),
 (r'\bby (spring|summer|autumn|winter|christmas|new year)\b|\bwithin (a|the|\d+) (day|week|month|year)|\bin (a few|the next) (day|week|month|year)', 'a dated prediction'),
 (r'\b(your|at) (fifty|sixty|seventy|eighty)\b|\byou(\'re| are) \d\d\b|\bat your age\b', 'AGE BAND IN THE COPY — it lives in the ad set'),
]
MEDIUM = [
 (r"\bhe (is|would be) (at peace|at rest|in a better place)\b|\bhe (is|has been) watching\b", 'mediumship'),
 (r"\bhe would (want|have wanted)\b|\bhis spirit\b|\bfrom the other side\b|\bhis blessing\b", 'mediumship'),
 (r"\bhe (knows|sees|hears) (you|that|this)\b|\bhe (is|stays|remains) (with|beside|near) you\b", 'mediumship'),
]
GRIEF = [
 (r'\b(move on|let go of him|let him go|say goodbye|close this chapter)\b', 'grief directive'),
 (r"\byou (are|'re) (not )?ready\b|\byou need (more )?time\b|\bit(\'s| is) too soon\b", 'readiness verdict'),
 (r'\breplace|\byou deserve (better|more)\b', 'ranks the two loves'),
]
MAN_EXISTS = {'cards-will-commit','cards-wont-commit','cards-ready-commit','cards-soulmate-closer','cards-where-soulmate','cards-missed-chance'}
AFTER_LOSS = {'cards-new-soulmate','cards-soulmate-out-there','cards-ready-to-love'}
WHERE = {'cards-where-soulmate','cards-soulmate-closer','cards-not-found-yet'}
GOD = [
 (r'\byour prayers (were|have been|are) (heard|answered|unanswered|ignored|refused)\b', 'rules on her prayers'),
 (r'\b(god|the lord|heaven|spirit) (has|is|wants|said|says|knows)\b', 'speaks for God'),
 (r"\b(god|divine|heaven)('s)? (plan|will|timing)\b", 'a plan is at work'),
]
PRAYER_HOOKS = {'cards-prayed-years','cards-prayers-unanswered'}
ORIGIN = re.compile(r"\bI don't think (?:it|this|any of it) (?:began|started) with you\b", re.I)
LOOP_PROPERTY = re.compile(
    r'\b(?:before|first|older|duration|back then|whole time|steady|shifted|slacken|loosen|'
    r'varies|constant|firmly|lightly|strain|pressure|eased?|give|close|squarely)\b|'
    r'\b(?:in that gap|between the two|in front of that step|at that point|on the way through|'
    r'at the front of it|at that spot|standing in that place|in that space|standing in between|'
    r'sitting in that space|standing in that gap|between you and it|in the way of that step|'
    r'sits in between)\b', re.I)
FIGURE_AFTER_PROOF = re.compile(r'\b(?:face|ankle|body|head|foot|feet|hand|hands|arm|arms|leg|legs|man|figure)\b', re.I)

for f in FILES:
    d = json.load(open(f)); h = d['hook']
    for c, bubbles in d['decks']['return-mhf'].items():
        whole = ' '.join(bubbles).lower()
        argument = ' '.join(bubbles[2:]).lower()          # beats 3-6: she is the subject here
        for pats, scope in ((BANNED_SYMBOL, whole), (SHADOW_INVENTS, whole), (AUTHORSHIP, whole),
                            (CHECKABLE, whole), (MEDIUM, whole)):
            for rx, why in pats:
                m = re.search(rx, scope)
                if m: fails.append(f'{h}/{c}: {why} — "{m.group(0)}"')
        if h in AFTER_LOSS:
            for rx, why in GRIEF:
                m = re.search(rx, whole)
                if m: fails.append(f'{h}/{c}: after-loss {why} — "{m.group(0)}"')
        if h in PRAYER_HOOKS:
            for rx, why in GOD:
                m = re.search(rx, whole)
                if m: fails.append(f'{h}/{c}: God ban — {why} — "{m.group(0)}"')
        # Hanged Man: no hang/hung/neck AFTER beat 2; figure retired after beat 2
        if c == 'b':
            m = re.search(r'\bhang|\bhung\b|\bneck\b', argument)
            if m: fails.append(f'{h}/b: hang/neck language after beat 2 — "{m.group(0)}"')
            m = FIGURE_AFTER_PROOF.search(argument)
            if m: fails.append(f'{h}/b: Hanged Man figure returns after beat 2 — "{m.group(0)}"')
        # She is the subject in beats 3-6 and the CARD FIGURE is a prop — never given intent or
        # motion toward her, or a soulmate lander silently becomes reunion copy.
        # ⚠ Scoped to landers where NO MAN EXISTS. On the commitment hooks and cards-soulmate-closer
        # a real man IS in the headline, so beat 4 has to say what he has not done — that is the
        # ad's man, not the figure on the card, and banning it would break the beat.
        if h not in MAN_EXISTS:
            m = re.search(r"\bhe(\'s|\s+(is|was|walks|steps|comes|moves|reaches|waits|stands|holds))\b", argument)
            if m: fails.append(f'{h}/{c}: CARD FIGURE ACTING in beats 3-6 — "{m.group(0)}"')
# ── BEATS 5–6 — handle + origin, then neutral pointer ─────────────────────────────────
# inherited-shadow-cut.md §"Beat 5 is the OFFER": beat 5 is the thing she is being asked to pay
# to remove, so it must carry one position/timing/manner handle PLUS the mandatory measured
# origin finding. Beat 6 is a neutral pointer and carries no property of its own.
BLANK_BLOCK = re.compile(
    r"(something|one thing)(\'s|s)?\s+"
    r"(is\s+|has\s+|'s\s+|)?"
    r"(in the way|standing in the way|has hold of (it|this)|had hold of (it|this)|"
    r"holds? (it|this)|holding (it|this)|has (it|this) held|got hold of (it|this)|"
    r"else is in the way|'s in the way)\s*\.?\s*$", re.I)
for f in FILES:
    d = json.load(open(f)); h = d['hook']
    for c, bubbles in d['decks']['return-mhf'].items():
        beat5 = bubbles[4].strip()
        if not ORIGIN.search(beat5):
            fails.append(f'{h}/{c}: BEAT 5 HAS NO MANDATORY ORIGIN — "{beat5}"')
        handle = ORIGIN.sub('', beat5).strip(' .')
        if BLANK_BLOCK.search(handle):
            fails.append(f'{h}/{c}: BEAT 5 IS A BLANK — "{handle}" names no handle she can '
                         f'picture. See §Beat 5 is the OFFER; pre-flight step 4.')
        m = LOOP_PROPERTY.search(bubbles[5])
        if m:
            fails.append(f'{h}/{c}: BEAT 6 CARRIES A PROPERTY — "{m.group(0)}" in "{bubbles[5]}"')

print(f'read-back sweep over {len(FILES)} landers × 3 cards = {len(FILES)*3} reads\n')
for x in fails: print('  🔴', x)
for x in warns: print('  ⚠ ', x)
print(f'\n{len(fails)} failure(s), {len(warns)} warning(s)')
sys.exit(1 if fails else 0)
