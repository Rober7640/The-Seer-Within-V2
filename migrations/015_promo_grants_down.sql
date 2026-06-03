-- Down migration 015: Promo Grants

ALTER TABLE chat_sessions DROP COLUMN IF EXISTS promo_coins_charged;

DROP INDEX IF EXISTS idx_promo_grants_unique;
DROP INDEX IF EXISTS idx_promo_grants_user_persona;
DROP TABLE IF EXISTS promo_grants;
