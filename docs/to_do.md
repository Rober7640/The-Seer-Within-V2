# The Seer Within — To-Do

## Supabase Integration

### Step 1: Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com) and sign up/login
- [ ] Click "New Project"
- [ ] Name it `the-seer-within`
- [ ] Set a database password (save it somewhere)
- [ ] Choose a region close to you
- [ ] Wait for project to be created (~2 min)

### Step 2: Get Your Credentials
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL** (looks like `https://xxxxx.supabase.co`)
- [ ] Copy **anon/public key** (starts with `eyJ...`)
- [ ] Add to `.env` file:
  ```
  SUPABASE_URL=your_project_url
  SUPABASE_ANON_KEY=your_anon_key
  ```

### Step 3: Create the Table
- [ ] Go to **SQL Editor** in Supabase
- [ ] Run the following SQL:

```sql
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- User info
  first_name TEXT,
  email TEXT,
  location TEXT,
  time_of_day TEXT,

  -- Conversation data
  bucket TEXT,
  sub_bucket TEXT,
  person_name TEXT,

  -- Their responses (the answers to our questions)
  concern TEXT,           -- What's on their mind
  deeper_response TEXT,   -- Follow-up answer
  vision TEXT,            -- Their desired future
  emotional_response TEXT,-- How it would feel
  block_source TEXT,      -- Where the block comes from
  commitment_response TEXT,-- Are they ready

  -- For cross-device restore
  conversation_state TEXT,
  messages JSONB,

  -- Outcome
  purchased BOOLEAN DEFAULT FALSE,
  purchase_type TEXT,     -- 'main' or 'downsell'
  objection_count INTEGER DEFAULT 0
);

-- Index for email lookups
CREATE INDEX idx_conversations_email ON conversations(email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Step 4: Integrate with App
- [ ] Provide credentials to Claude to add integration
- [ ] Test data saving
- [ ] Verify in Supabase dashboard

### Step 5: Cross-Device Session Persistence
- [ ] Save full conversation state to Supabase (linked to email)
- [ ] On return visit: if localStorage empty but email matches → restore from Supabase
- [ ] Show "I remember you..." message for returning users on different devices
- [ ] Handle edge case: user has both localStorage AND Supabase session (use most recent)

---

## AWeber Integration

### Step 1: Get AWeber API Credentials
- [ ] Log into [AWeber](https://www.aweber.com)
- [ ] Go to **Account** → **Integrations** → **API**
- [ ] Create a new app or use existing credentials
- [ ] Copy **Client ID** and **Client Secret**
- [ ] Generate an **Access Token** (OAuth 2.0)
- [ ] Add to `.env` file:
  ```
  AWEBER_ACCESS_TOKEN=your_access_token
  AWEBER_LIST_ID=your_list_id
  ```

### Step 2: Get Your List ID
- [ ] Go to **List Options** → **List Settings**
- [ ] Find the List ID (or use AWeber API to list all lists)

### Step 3: Integrate with App
- [ ] Add AWeber API call when email is captured (`/api/lead` endpoint)
- [ ] Include subscriber data:
  - Email
  - First name
  - Custom fields: bucket, location, time_of_day
- [ ] Handle duplicate subscribers gracefully
- [ ] Test subscription flow

### Step 4: Set Up Email Automation (in AWeber)
- [ ] Create welcome sequence for new subscribers
- [ ] Tag subscribers by bucket (love/money/purpose/someone)
- [ ] Set up follow-up sequences based on purchase status

---

## Other To-Dos

- [ ] Test full conversation flow end-to-end
- [ ] Test Stripe checkout with real test keys
- [ ] Mobile responsiveness testing
- [ ] Console error cleanup
