# Database Fields - Conversations Table

This document lists all fields stored in the `conversations` table.

## User Information

| Field | Type | Description |
|-------|------|-------------|
| `id` | varchar | Unique conversation ID |
| `email` | text | User's email address |
| `first_name` | text | User's first name |
| `location` | text | User's location (detected) |
| `time_of_day` | text | Time of day when conversation started |

## Conversation Context

| Field | Type | Description |
|-------|------|-------------|
| `bucket` | text | Main topic category (love, money, purpose, someone) |
| `sub_bucket` | text | Specific sub-category within bucket |
| `person_name` | text | Name of person mentioned (for "someone" bucket) |
| `concern` | text | User's initial concern/question |
| `deeper_response` | text | User's follow-up response after first reading |
| `vision` | text | User's desired future/vision |
| `emotional_response` | text | User's emotional response to vision question |
| `block_source` | text | Where user believes their block originated |
| `commitment_response` | text | User's response to commitment/value question |

## Conversation State

| Field | Type | Description |
|-------|------|-------------|
| `conversation_state` | text | Current state in the conversation flow |
| `messages` | text | JSON string of all conversation messages |
| `objection_count` | integer | Number of objections raised by user |

## Purchase Information

| Field | Type | Description |
|-------|------|-------------|
| `purchased` | boolean | Whether user completed a purchase |
| `purchase_type` | text | Type of purchase (main, downsell) |
| `main_purchase_amount` | integer | Amount paid for main purchase (cents) |
| `upsell_offered` | boolean | Whether upsell was offered |
| `upsell_purchased` | boolean | Whether user purchased upsell |
| `upsell_payment_id` | text | Stripe payment ID for upsell |
| `upsell_amount` | integer | Amount paid for upsell (cents) |

## Stripe Integration

| Field | Type | Description |
|-------|------|-------------|
| `stripe_session_id` | text | Stripe checkout session ID |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_payment_method_id` | text | Saved payment method for 1-click upsell |

## Shipping Address

| Field | Type | Description |
|-------|------|-------------|
| `shipping_name` | text | Recipient name |
| `shipping_line1` | text | Address line 1 |
| `shipping_line2` | text | Address line 2 |
| `shipping_city` | text | City |
| `shipping_state` | text | State/Province |
| `shipping_postal` | text | Postal/ZIP code |
| `shipping_country` | text | Country code |

## Timestamps

| Field | Type | Description |
|-------|------|-------------|
| `created_at` | timestamp | When conversation was created |
| `updated_at` | timestamp | When conversation was last updated |
