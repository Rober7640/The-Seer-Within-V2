-- Migration 009 DOWN: Revert coin system back to minutes

-- 1. Personas: revert free_coins -> free_minutes
UPDATE personas SET free_coins = free_coins / 60 WHERE free_coins > 0;
ALTER TABLE personas ALTER COLUMN free_coins SET DEFAULT 3;
ALTER TABLE personas RENAME COLUMN free_coins TO free_minutes;

-- 2. Credit purchases: revert coins_purchased -> minutes_purchased, drop bonus_coins
UPDATE credit_purchases SET coins_purchased = coins_purchased / 60 WHERE coins_purchased > 0;
ALTER TABLE credit_purchases DROP COLUMN IF EXISTS bonus_coins;
ALTER TABLE credit_purchases RENAME COLUMN coins_purchased TO minutes_purchased;

-- 3. Chat sessions: revert coins_charged -> minutes_charged
UPDATE chat_sessions SET coins_charged = coins_charged / 60 WHERE coins_charged > 0;
ALTER TABLE chat_sessions RENAME COLUMN coins_charged TO minutes_charged;

-- 4. Users: revert coin_balance -> credit_minutes, total_coins_used -> total_minutes_used
UPDATE users SET coin_balance = coin_balance / 60 WHERE coin_balance > 0;
UPDATE users SET total_coins_used = total_coins_used / 60 WHERE total_coins_used > 0;
ALTER TABLE users RENAME COLUMN coin_balance TO credit_minutes;
ALTER TABLE users RENAME COLUMN total_coins_used TO total_minutes_used;
