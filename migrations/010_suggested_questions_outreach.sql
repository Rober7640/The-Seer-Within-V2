-- Migration 010: Add outreach_messages table for blurred teaser messages
-- Note: suggested_questions is stored in personas.personality JSON (no column needed)

-- Create outreach_messages table for blurred teaser messages
CREATE TABLE IF NOT EXISTS outreach_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id varchar NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  expires_at timestamp NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_messages_user_persona_idx
  ON outreach_messages(user_id, persona_id);
