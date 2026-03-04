# Returning User Flow - Test Suite Documentation

Comprehensive test coverage for the returning user intent system, including bucket initialization, intent detection, bucket transitions, and character rules validation.

## Test Files Overview

### 1. `returning-user-flow.spec.ts`
**E2E tests for the complete returning user experience**

- **New User Baseline** (2 tests)
  - Verifies new users start at "opening" bucket
  - Confirms first-time greeting template

- **Returning User - Bucket Initialization** (3 tests)
  - Verifies returning users start at "exploration" bucket
  - Confirms greeting references memory
  - Validates greeting length (2-3 sentences)

- **Continue Previous Topic Intent** (3 tests)
  - Detects `continue_previous_topic` when user says "yes"
  - Tests various continuation patterns
  - Fast-tracks to "reading" bucket

- **New Topic (Pivot)** (2 tests)
  - Handles user pivoting to different topic
  - Stays in exploration for unclear new topics

- **Memory Integration** (2 tests)
  - Loads memory for returning users
  - Handles long-term returning users (6 months)

- **Edge Cases** (3 tests)
  - Ambiguous responses
  - User ignoring choice and jumping to topic
  - Mixed signals in one message

**Total: 15 tests**

---

### 2. `intent-detection.spec.ts`
**Unit tests for the intent detection algorithm**

- **Continue Previous Topic Intent** (3 tests)
  - Detects from "yes" and various patterns
  - High confidence for explicit continuation

- **Topic-Specific Intents** (3 tests)
  - `wants_love_reading`
  - `wants_money_reading`
  - `wants_purpose_reading`

- **Bucket-Aware Boosting** (2 tests)
  - Boosts confidence when bucket matches
  - Prioritizes bucket-specific intents

- **Priority Handling** (2 tests)
  - Respects intent priority levels
  - High-priority intents win over low-priority

- **Multi-Pattern Matching** (2 tests)
  - Multiple pattern matches increase confidence
  - Returns all matches in `allMatches` array

- **Special Intents** (5 tests)
  - `skeptical`
  - `ai_question`
  - `price_question`
  - `objection_price`
  - `explicit_decline`

- **Edge Cases** (5 tests)
  - Empty message
  - Gibberish
  - No clear intent
  - Very long messages
  - Case insensitivity

- **Confidence Scoring** (2 tests)
  - Based on pattern match ratio
  - Clamped between 0 and 1

- **Response Guidance** (2 tests)
  - Provides guidance for detected intent
  - Appropriate guidance for continuation

- **Bucket Targeting** (2 tests)
  - Intents target specific buckets
  - "any" bucket intents apply everywhere

**Total: 28 tests**

---

### 3. `bucket-transitions.spec.ts`
**Unit & integration tests for bucket transition logic**

- **Initial Bucket Assignment** (2 tests)
  - New users → "opening"
  - Returning users → "exploration"

- **Auto-Advance Based on Duration** (2 tests)
  - Auto-advances after typical duration
  - Tracks transitions with timestamps

- **Intent-Driven Transitions** (3 tests)
  - Immediate transition when intent targets different bucket
  - Fast-track on `continue_previous_topic`
  - Requires minimum confidence

- **Forward-Only Progression** (2 tests)
  - Never moves backward
  - Stays at final bucket

- **Complete Flow Testing** (2 tests)
  - Full flow: opening → closing
  - Fast-track: exploration → reading

- **Turn Count Tracking** (2 tests)
  - Increments on each update
  - Tracks turns per bucket accurately

- **Bucket-Specific Behavior** (3 tests)
  - Exploration longer than opening
  - Reading reachable from exploration
  - Closing has no nextBucket

- **Persistence** (2 tests)
  - Persists to database
  - Retrieves existing state

**Total: 18 tests**

---

### 4. `character-rules-validation.spec.ts`
**Tests for character consistency and rule enforcement**

- **Forbidden Phrases** (7 tests)
  - Detects "As an AI"
  - Detects "I'm programmed"
  - Detects "language model"
  - Detects "I cannot"
  - All 8 AI-related phrases
  - Case-insensitive detection
  - Passes when no forbidden phrases

- **Word Count Limits** (5 tests)
  - Enforces 150-word maximum
  - Passes at limit
  - Passes under limit
  - Accurate word counting
  - Handles multiple spaces

- **Multiple Violations** (2 tests)
  - Detects multiple types simultaneously
  - Detects multiple forbidden phrases

- **Character Consistency (E2E)** (2 tests)
  - Actual chat responses follow rules
  - Responses don't exceed word limit

- **Speaking Style Elements** (5 tests)
  - Contains required elements
  - Emphasizes short sentences
  - Mentions pauses
  - Includes affectionate terms
  - Avoids theatrical tone

- **Validation Edge Cases** (5 tests)
  - Empty response
  - Whitespace only
  - Punctuation handling
  - Newlines handling
  - Special characters

- **Real Response Patterns** (4 tests)
  - Short and warm responses
  - Responses with visions
  - Maternal tone
  - Rejects out-of-character responses

**Total: 30 tests**

---

## Running the Tests

### Run All Returning User Tests
```bash
npm run test:e2e -- returning-user-flow.spec.ts
npm run test:e2e -- intent-detection.spec.ts
npm run test:e2e -- bucket-transitions.spec.ts
npm run test:e2e -- character-rules-validation.spec.ts
```

### Run Specific Test Suite
```bash
# Returning user flow only
npm run test:e2e -- returning-user-flow.spec.ts

# Intent detection only
npm run test:e2e -- intent-detection.spec.ts

# Bucket transitions only
npm run test:e2e -- bucket-transitions.spec.ts

# Character rules only
npm run test:e2e -- character-rules-validation.spec.ts
```

### Run in Headed Mode (See Browser)
```bash
npm run test:e2e -- returning-user-flow.spec.ts --headed
```

### Run in Debug Mode
```bash
npm run test:e2e -- returning-user-flow.spec.ts --debug
```

### Run Specific Test
```bash
npm run test:e2e -- returning-user-flow.spec.ts -g "should detect continue_previous_topic"
```

---

## Test Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| **Returning User Flow** | 15 | E2E user journey, greetings, memory integration |
| **Intent Detection** | 28 | Algorithm, confidence, patterns, bucket awareness |
| **Bucket Transitions** | 18 | State management, progression, persistence |
| **Character Rules** | 30 | Validation, consistency, speaking style |
| **TOTAL** | **91 tests** | Comprehensive coverage |

---

## Key Scenarios Covered

### ✅ New User Experience
- Starts at "opening" bucket
- Receives first-time greeting
- Progresses through full flow

### ✅ Returning User Experience
- Starts at "exploration" bucket
- Greeting references previous session
- Offers choice to continue or pivot

### ✅ Continue Previous Topic
- Detects "yes", "continue", "last time", etc.
- Fast-tracks to "reading" bucket
- Skips extended exploration

### ✅ Pivot to New Topic
- Handles user changing subject
- Detects new topic intents
- Adapts conversation flow

### ✅ Bucket Transitions
- Auto-advances after duration
- Intent-driven early transitions
- Forward-only progression
- No backward movement

### ✅ Intent Detection
- 16 different intents
- Bucket-aware confidence boosting
- Priority-based selection
- Multi-pattern matching

### ✅ Character Consistency
- No AI-related phrases
- 150-word limit enforced
- Warm, maternal, grounded tone
- Short sentences with pauses

---

## Integration with Follow-up Email System

These tests ensure the returning user flow works seamlessly with your follow-up email system:

1. **User receives email** → "We discussed your relationship with John..."
2. **User clicks link** → Starts at "exploration" bucket
3. **Greeting offers choice** → "Continue about John or something new?"
4. **User says "yes"** → Fast-tracks to "reading" bucket
5. **Conversation continues** → References John and previous context

---

## Test Data Helpers

The tests include helper functions for:
- Creating test users with history
- Creating previous sessions
- Loading memory context
- Cleaning up test data
- Generating auth tokens

All test data is automatically cleaned up after each test.

---

## Maintenance Notes

### Adding New Intents
When adding new intents to `seedIntentConfigs.ts`:
1. Add tests in `intent-detection.spec.ts`
2. Update E2E tests in `returning-user-flow.spec.ts` if needed
3. Update this README with new test counts

### Adding New Buckets
When adding new conversation buckets:
1. Update tests in `bucket-transitions.spec.ts`
2. Verify complete flow test still passes
3. Update documentation

### Modifying Character Rules
When modifying `characterRules`:
1. Update tests in `character-rules-validation.spec.ts`
2. Ensure all responses comply
3. Run character rules tests to verify

---

## Continuous Integration

These tests should be run:
- ✅ Before every commit
- ✅ In CI/CD pipeline
- ✅ Before deploying to production
- ✅ After modifying intent configs
- ✅ After updating character rules

---

## Troubleshooting

### Tests Failing After Code Changes
1. Check if intent configs were updated in database
2. Verify server is running and accessible
3. Ensure database has test data seeded
4. Check for console errors in test output

### Flaky Tests
1. Increase timeouts for slow responses
2. Wait for proper element selectors
3. Ensure database cleanup is working
4. Check for race conditions in state updates

### Database Cleanup Issues
1. Manually clean test users: `DELETE FROM users WHERE email LIKE 'test-%'`
2. Verify foreign key constraints
3. Check cascade delete settings

---

## Next Steps

- [ ] Add performance benchmarks
- [ ] Add load testing for concurrent users
- [ ] Add memory leak detection
- [ ] Add accessibility tests
- [ ] Add visual regression tests for greetings

---

**Total Test Coverage: 91 comprehensive tests**
**Estimated Run Time: ~5-8 minutes**
**Confidence Level: High** ✅
