-- 2026-07-14 churn fix — mark "Continue Reading" context copies as copies.
--
-- "Continue Reading" / resume-after-purchase carries the last 4 messages of the
-- prior session into the new one so the model has context. Until now those were
-- inserted as indistinguishable new chat_messages rows — duplicating transcripts,
-- inflating message counts, and double-feeding memory extraction (72h audit §4.6).
--
-- Additive + safe to run BEFORE the code deploy (default false, no reads change).
-- Dev and prod share one DB: run once.

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS is_context_copy boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN chat_messages.is_context_copy IS
  'TRUE = row copied from a prior session for model context ("Continue Reading"), not words spoken in this session. Exclude from transcript analytics / message counts / memory extraction.';

-- Verify:
-- SELECT column_name, column_default FROM information_schema.columns
-- WHERE table_name = 'chat_messages' AND column_name = 'is_context_copy';
