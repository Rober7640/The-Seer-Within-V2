# Playwright E2E Tests
## Multi-Persona Psychic Consultant Platform

Comprehensive end-to-end testing suite for The Seer Within chat service.

---

## 📋 Test Coverage

### **1. Authentication Tests** (`auth.spec.ts`)
- ✅ User registration
- ✅ Login with valid credentials
- ✅ Reject invalid credentials
- ✅ Display credit balance after login
- ✅ Logout functionality

### **2. Persona Directory Tests** (`personas.spec.ts`)
- ✅ Display persona directory
- ✅ Show Evelyn Cross card
- ✅ Filter personas by category
- ✅ Open persona detail modal
- ✅ Navigate to chat from persona card
- ✅ Display pricing information

### **3. Chat Service Tests** (`chat.spec.ts`)
- ✅ Start chat session with Evelyn
- ✅ Send message and receive AI reply
- ✅ Display credit countdown during session
- ✅ Show message history
- ✅ End session successfully
- ✅ Switch between personas

### **4. Credit Purchase Tests** (`credits.spec.ts`)
- ✅ Display pricing page
- ✅ Show current credit balance
- ✅ Display per-persona pricing
- ✅ Initiate Stripe checkout
- ✅ Show purchase history
- ✅ Different pricing for different personas

### **5. Admin Dashboard Tests** (`admin.spec.ts`)
- ✅ Admin login
- ✅ Display personas management
- ✅ Edit persona details
- ✅ Edit persona pricing
- ✅ Display users list
- ✅ View user detail with multi-persona stats
- ✅ Display analytics dashboard
- ✅ Prompts editor
- ✅ Manually adjust user credits
- ✅ Create new persona

### **6. Memory Continuity Tests** (`memory.spec.ts`)
- ✅ Maintain memory across sessions
- ✅ Show memory context indicator
- ✅ Isolate memory per persona
- ✅ Update lastLoginAt on login
- ✅ Show memory in admin user detail

---

## 🚀 Quick Start

### Prerequisites

1. **Database must be running** with schema pushed:
   ```bash
   npm run db:push
   npm run seed
   ```

2. **Environment variables** set in `.env`:
   ```
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...
   JWT_SECRET=your-secret
   ```

3. **Development server will auto-start** (Playwright handles this)

---

## 🧪 Running Tests

### Run All Tests (Headless)
```bash
npm test
```

### Run Tests with UI Mode (Recommended)
```bash
npm run test:ui
```
Interactive UI showing test progress, retries, and results.

### Run Tests in Headed Mode (See Browser)
```bash
npm run test:headed
```
Watch tests execute in a real browser window.

### Run Specific Test File
```bash
npx playwright test tests/auth.spec.ts
```

### Run Specific Test by Name
```bash
npx playwright test -g "should login"
```

### Debug Mode (Step Through Tests)
```bash
npm run test:debug
```
Opens Playwright Inspector for step-by-step debugging.

### View Test Report
```bash
npm run test:report
```
Opens HTML report with screenshots, videos, and traces.

---

## 📊 Test Reports

After running tests, Playwright generates:

- **HTML Report:** `playwright-report/index.html`
- **Screenshots:** Captured on failures
- **Videos:** Recorded for failed tests
- **Traces:** Full execution traces for debugging

View the report:
```bash
npm run test:report
```

---

## 🎯 Test Strategy

### Test Data
- **Auto-generated:** Each test creates fresh users with unique emails
- **Seeded data:** Tests expect Evelyn Cross persona to exist
- **Admin account:** Tests use default admin (admin@theseerwithin.com)

### Timeouts
- **Page navigation:** 10 seconds
- **API responses:** 15 seconds (Claude API can be slow)
- **Element visibility:** 5-10 seconds

---

## 🐛 Debugging Failed Tests

### View Screenshots
Failed tests automatically capture screenshots:
```
test-results/[test-name]/test-failed-1.png
```

### View Video
Failed tests record video:
```
test-results/[test-name]/video.webm
```

### View Trace
For detailed debugging, open the trace:
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Run Single Test in Debug Mode
```bash
npx playwright test tests/auth.spec.ts --debug
```

---

## 📈 Test Metrics

**Total Test Cases:** 50+ tests across 6 suites

**Coverage:**
- ✅ User authentication flow
- ✅ Persona browsing and selection
- ✅ Chat sessions with AI responses
- ✅ Credit tracking and purchases
- ✅ Admin dashboard operations
- ✅ Memory persistence and continuity

**Execution Time:** ~5-10 minutes (depends on Claude API speed)

---

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests passing (`npm test`)
- [ ] Admin login test passes (verify seed data)
- [ ] Memory continuity test passes (AI summarization working)
- [ ] Credit purchase flow reaches Stripe (test mode)
- [ ] Persona directory shows all active personas
- [ ] Chat sessions end successfully (no hanging sessions)

---

**Run tests regularly to catch regressions early!** 🚀
