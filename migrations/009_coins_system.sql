-- Migration 009: Coin System
-- Transforms the per-minute billing model into a coin-based economy.
-- 60 coins = 1 minute of chat time.

-- 1. Users table: rename credit columns and convert values (x60)
ALTER TABLE users RENAME COLUMN credit_minutes TO coin_balance;
ALTER TABLE users RENAME COLUMN total_minutes_used TO total_coins_used;

UPDATE users SET coin_balance = coin_balance * 60 WHERE coin_balance > 0;
UPDATE users SET total_coins_used = total_coins_used * 60 WHERE total_coins_used > 0;

-- 2. Chat sessions: rename minutes_charged -> coins_charged, convert values (x60)
ALTER TABLE chat_sessions RENAME COLUMN minutes_charged TO coins_charged;

UPDATE chat_sessions SET coins_charged = coins_charged * 60 WHERE coins_charged > 0;

-- 3. Credit purchases: rename minutes_purchased -> coins_purchased, add bonus_coins, convert values (x60)
ALTER TABLE credit_purchases RENAME COLUMN minutes_purchased TO coins_purchased;
ALTER TABLE credit_purchases ADD COLUMN IF NOT EXISTS bonus_coins INTEGER NOT NULL DEFAULT 0;

UPDATE credit_purchases SET coins_purchased = coins_purchased * 60 WHERE coins_purchased > 0;

-- 4. Personas: rename free_minutes -> free_coins, convert values (x60)
ALTER TABLE personas RENAME COLUMN free_minutes TO free_coins;

UPDATE personas SET free_coins = free_coins * 60 WHERE free_coins > 0;
-- Default was 3 minutes = 180 coins; new default handled by schema
ALTER TABLE personas ALTER COLUMN free_coins SET DEFAULT 180;
