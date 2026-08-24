-- Nine link codes for Evelyn cycle-1.
--
-- Codes are CSPRNG-generated, 7 chars, same shape and entropy as the ones
-- render-aweber.mjs mints (randomBytes(5) -> base64url). Deliberately NOT a
-- readable sequence: a guessable code lets anyone step through the set and
-- read campaign copy that has not been mailed yet.
--
-- WHERE TO RUN THIS (changed 2026-08-24). Originally development-only, because
-- hand-inserting rows on production leaves destinations no email points at.
-- That objection does not apply to cycle 1: the nine broadcasts are being built
-- BY HAND in the AWeber UI using exactly the codes below, so every row does have
-- an email pointing at it. Run it on production for cycle 1, and on development
-- for the dry-run. Future cycles should still go through render-aweber.mjs
-- (Step 6), which mints and writes the links into the HTML in one step.
--
-- Run it AFTER the runbook's structure statement — the table and the big_idea /
-- card_image_url columns must exist first. Safe to run twice.
--
-- The nine drafts in docs/aweber/evelyn-reframe-deck/sends/cycle-1/ each carry
-- their URL on a **Short Link:** line; those must match the codes below.
--
-- Your URLs (put the site's address in front of each):
-- /e/7AIKaoY  ->  reframe-01-changed
-- /e/R8g74v8  ->  reframe-02-fence
-- /e/4lHNqhw  ->  reframe-03-devil
-- /e/HKctN9o  ->  reframe-04-serious
-- /e/BOG73XY  ->  reframe-05-peace
-- /e/3-deu_I  ->  reframe-06-love-yourself
-- /e/fob6okE  ->  reframe-07-song
-- /e/ByMVKFU  ->  reframe-08-lighthouse
-- /e/rFuArrM  ->  reframe-09-stop-looking

INSERT INTO email_link_codes (code, persona_slug, campaign, continue_seed, reading_recap, open_loop, bucket, src)
VALUES
  ('7AIKaoY', 'evelyn-cross', 'reframe-01-changed', 'You came back about the list — the man who fixed everything he could think of to prove it to one person. Tell me the question you keep asking about them, and I''ll show you the truer one hiding underneath it.', 'You wrote to them about a man who wrote to you listing everything he''d fixed — sober now, at the gym, calling his mother every Sunday — all to prove to a woman he''d changed. You showed them the reframe: every fix on his list had her name written under it, so it wasn''t a life he was building, it was a case presented to a jury of one. You told them the truer question isn''t "how do I show her I''ve changed" but "would I still want to be this person if she never came back" — because change built for someone else to notice is just the old chasing in cleaner clothes.', 'You asked them to bring you the question they''re really asking about someone — the true one hiding under the one they keep repeating — so you could find the question they actually get to answer.', 'love', 'aweber'),
  ('R8g74v8', 'evelyn-cross', 'reframe-02-fence', 'You came back about the green fence — the one he repaints the same colour every spring. Tell me what you keep painting, and I''ll tell you what you''re really keeping alive.', 'You wrote to them about a widower on your street who repaints his fence the same soft green every spring — the color his wife chose the last spring she was alive, four years gone now. You showed them the reframe: he isn''t failing to let her go, he''s keeping alive the part of him that still shares a life, the part that considers another person and asks "what would you think?" — and that capacity didn''t go into the ground with her, it''s still his to use.', 'You asked them to notice which fence THEY keep painting — the ritual, the untouched side of the bed, the thing they keep exactly as it was — and come tell you what it is.', 'love', 'aweber'),
  ('4lHNqhw', 'evelyn-cross', 'reframe-03-devil', 'You came back about the Devil card — those chains, loose enough to lift off with two hands and a decision. Tell me the one you haven''t lifted yet, the thing you keep going back to, and we''ll look at what it''s actually tied to.', 'You wrote to them about the Devil card — how everyone flinches at the horns and the firelight, but you pointed them at the chains themselves: loose loops dropped over the two figures'' heads, no lock, wide enough to lift off with two hands and a decision. You showed them the reframe — the card isn''t a curse arriving, it''s a mirror asking why they haven''t taken off something that only looks locked, something familiar enough it''s started to feel like home.', 'You asked them to simply name the loop out loud — the one true sentence about what they keep going back to — without trying to lift it yet.', 'love', 'aweber'),
  ('HKctN9o', 'evelyn-cross', 'reframe-04-serious', 'You came back about the tell — the sentence said twice. I''ve been holding that line of yours since the letter went out. Tell me what it is, and I''ll tell you what it''s guarding.', 'You wrote to them about the tell — how a sentence said twice is not a preference but a flinch. You showed them that "I''m not looking for anything serious," said twice in one hour, is a wall built in advance so no one can watch them hope and lose. You named that the wall also keeps out the very person who takes them at their word and quietly backs away.', 'You asked them to tell you the line they catch themselves repeating — the one you''d read as guarding something.', 'love', 'aweber'),
  ('BOG73XY', 'evelyn-cross', 'reframe-05-peace', 'You came back about protecting your peace — good. So tell me honestly: is it still a door someone could knock on, or has it quietly become the wall?', 'You wrote to them about the phrase "protecting my peace" — how it can be a real boundary, or a wall wearing gentler words. You gave them the test: a boundary is aimed at the one person who hurt them; a wall is aimed at anyone who might get close enough to, keeping everyone out and calling the empty room serenity.', 'You gave them a truer sentence to test their peace against — "I''m keeping everyone at a distance so nothing can reach me" — and told them if it landed, not to sit with that alone.', 'love', 'aweber'),
  ('3-deu_I', 'evelyn-cross', 'reframe-06-love-yourself', 'You came back about that saying — that you can''t love anyone until you love yourself. Tell me where you''ve been turning love away because you decided you haven''t earned it yet, and we''ll look at what''s really locking that door.', 'You wrote to them about the phrase "you can''t love anyone until you love yourself" — how half of it is true (certain you''re worthless, you''ll take scraps and call them a feast) but the saying turns that truth into an entrance fee, locking the door on the very people still learning their worth. You showed them the reframe: self-love is rarely the finish line you cross before you''re allowed to be loved — far more often it''s what being chosen well, and stayed with, actually teaches you.', 'You gave them a truer question to sit with — "where am I turning love away because I''ve decided I haven''t earned it yet" — and asked them to come tell you where they''re standing outside that door.', 'love', 'aweber'),
  ('fob6okE', 'evelyn-cross', 'reframe-07-song', 'You came back about the song — the one that keeps finding you everywhere. Tell me what it is, and I''ll tell you what your attention is really flagging.', 'You wrote to them about the song that keeps finding them — in a café, a stranger''s car, a playlist they didn''t build — and the story everyone tells about it ("they''re thinking of you, it''s a sign, wait"). You showed them the reframe: the song isn''t a message FROM the person they''re missing, it''s a message about where their own attention still lives — their ear keeps catching it because a question is open in them, and the song is only the flag for it, not a leash but a lamp.', 'You asked them to tell you their sign — the thing that keeps finding them — so you could tell them what you think it''s really pointing at, what it''s asking OF them rather than what it''s promising.', 'love', 'aweber'),
  ('ByMVKFU', 'evelyn-cross', 'reframe-08-lighthouse', 'You came back about the lamp — the keeper lighting it every night for ships that rarely come. Tell me which of yours you''ve let go dark while you watched the water, and let''s light it.', 'You wrote to them about a lighthouse keeper who still lights her lamp every dusk on a coast the ships stopped visiting years ago. You showed them the reframe: she doesn''t climb those stairs for the ships — a lit lamp is a life still tended, and lighting it is for her, not to summon anyone; waiting done that way keeps a person whole instead of hollowing them out at the glass.', 'You asked them which lamp they''ve let go dark while watching the sea — the piece of their own life they keep saving for "once they come" — and to come tell you what it is.', 'love', 'aweber'),
  ('rFuArrM', 'evelyn-cross', 'reframe-09-stop-looking', 'You came back about that advice — that you''ll find love when you stop looking. Tell me where you''ve been auditioning instead of living, and we''ll find the difference.', 'You wrote to them about the line "you''ll find love when you stop looking" — how half of it is true (frantic scanning, auditioning every date like a job interview, does wear a person down and show) but the saying smuggles in a cruelty: hearing "stop looking" as "stop wanting, go numb, disappear." You showed them the reframe: stop auditioning, yes — but never stop wanting, showing up, being seen; the real shift is where their eyes point, not whether they want it at all.', 'You gave them a truer question to sit with — "where am I auditioning, when I could just be living" — and asked them to come tell you if they can feel the difference but can''t quite find it.', 'love', 'aweber')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- big_idea + card_image_url (added 2026-08-24)
--
-- The INSERT above predates both columns, so on its own it leaves them NULL.
-- Both are nullable and nothing errors when they are missing — the chat just
-- goes quietly generic (no subject anchor to lead with) and the Devil letter
-- shows no card. This block is idempotent and set-based: run it whether the
-- rows were just inserted or already existed. Values come from each draft's
-- **Big Idea:** / **Card Image:** frontmatter in sends/cycle-1/.
-- ---------------------------------------------------------------------------

UPDATE email_link_codes AS e
SET big_idea = v.big_idea,
    card_image_url = v.card_image_url
FROM (VALUES
    ('reframe-01-changed', 'the man''s list — every fix he made to prove he''d changed, with her name under it', NULL),
    ('reframe-02-fence', 'the widower''s green fence, repainted her colour every spring', NULL),
    ('reframe-03-devil', 'the Devil card, and how loose those chains actually are', '/tarot/rws-devil.jpg'),
    ('reframe-04-serious', 'the tell — a sentence said twice is a flinch, not a preference', NULL),
    ('reframe-05-peace', 'the phrase "protecting my peace", and whether it is a boundary or a wall', NULL),
    ('reframe-06-love-yourself', 'the myth that you cannot be loved until you love yourself', NULL),
    ('reframe-07-song', 'the song that keeps finding you, and what it is really flagging', NULL),
    ('reframe-08-lighthouse', 'the keeper''s lamp, lit for ships that rarely come', NULL),
    ('reframe-09-stop-looking', 'the advice that you will find love when you stop looking', NULL)
) AS v(campaign, big_idea, card_image_url)
WHERE e.campaign = v.campaign
  AND e.persona_slug = 'evelyn-cross';

-- Expect: UPDATE 9
