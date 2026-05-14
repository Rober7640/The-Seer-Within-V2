# Skill: Security Audit

## Purpose
Scan every file in the repository for exposed API keys, hardcoded secrets, and open/unauthenticated endpoints. Produce a full, structured security report.

---

## Trigger Phrases
- "run security audit"
- "scan for secrets"
- "check for exposed keys"
- "audit endpoints"
- "find hardcoded credentials"
- "security scan"

---

## Execution Steps

### Step 1 — Enumerate All Files
Collect every non-binary, non-ignored file in the project tree. Skip:
- `node_modules/`
- `.git/`
- `dist/` and `build/`
- Binary/image assets (`.png`, `.jpg`, `.ico`, `.woff`, etc.)

```
Glob: **/*
Exclude: node_modules, .git, dist, build, *.png, *.jpg, *.ico, *.woff, *.ttf, *.eot, *.svg
```

### Step 2 — Secret & Key Detection

Scan every collected file using `Grep` for the following patterns. Flag any match with the file path and line number.

#### 2a. High-Confidence API Key Patterns
| Pattern | Description |
|---|---|
| `sk-ant-[a-zA-Z0-9\-_]{20,}` | Anthropic API key |
| `sk_live_[a-zA-Z0-9]{20,}` | Stripe live secret key |
| `sk_test_[a-zA-Z0-9]{20,}` | Stripe test secret key |
| `pk_live_[a-zA-Z0-9]{20,}` | Stripe live publishable key |
| `pk_test_[a-zA-Z0-9]{20,}` | Stripe test publishable key |
| `whsec_[a-zA-Z0-9]{20,}` | Stripe webhook secret |
| `AIza[0-9A-Za-z\-_]{35}` | Google API key |
| `ya29\.[0-9A-Za-z\-_]+` | Google OAuth token |
| `AKIA[0-9A-Z]{16}` | AWS Access Key ID |
| `[0-9a-zA-Z/+]{40}` adjacent to `AWS_SECRET` | AWS Secret Access Key |
| `ghp_[a-zA-Z0-9]{36}` | GitHub personal access token |
| `gho_[a-zA-Z0-9]{36}` | GitHub OAuth token |
| `xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}` | Slack bot token |
| `xoxp-[0-9]+-[0-9]+-[0-9]+-[a-fA-F0-9]+` | Slack user token |
| `EAA[a-zA-Z0-9]+` | Facebook access token |
| `Bearer [a-zA-Z0-9\-_.]{20,}` (in source files, not test fixtures) | Generic Bearer token |

#### 2b. Generic Secret Variable Names (case-insensitive)
Grep for assignments where the left-hand side is a sensitive name and the right-hand side is a non-empty, non-placeholder string literal:

```
(SECRET|API_KEY|APIKEY|ACCESS_TOKEN|AUTH_TOKEN|PRIVATE_KEY|CLIENT_SECRET|
 PASSWORD|PASSWD|DB_PASS|DATABASE_URL|WEBHOOK_SECRET|JWT_SECRET)\s*[=:]\s*['"][^'"${}]{6,}['"]
```

Flag any match where the value is **not** one of these placeholder patterns:
- `your-*`, `change-me`, `xxx`, `***`, `<...>`, `process.env.*`, `import.meta.env.*`

#### 2c. Database Connection Strings
```
(postgres|postgresql|mysql|mongodb|redis):\/\/[^'">\s]{8,}
```
Flag if the string contains a literal password (i.e., `://user:password@` where password is not a placeholder).

#### 2d. Private Keys / Certificates
```
-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----
```

### Step 3 — Environment File Audit

Read `.env`, `.env.local`, `.env.production`, `.env.development`, and any `*.env` files if they exist.

For each file:
- List every key that has a **real value** (not a placeholder or empty).
- Check whether the file is listed in `.gitignore`. If it is **not** listed, raise a **CRITICAL** finding.
- Check whether the file has ever been committed to git: `git log --oneline -- <filename>`. If it has, raise a **CRITICAL** finding.

### Step 4 — Endpoint Security Audit

Scan `server/routes.ts`, `server/routes/**/*.ts`, and any Express router files.

For each route found, classify it:

| Classification | Criteria |
|---|---|
| **Protected** | Has `requireAuth`, `isAuthenticated`, `verifyToken`, or equivalent middleware before the handler |
| **Admin-only** | Has `requireAdmin`, `isAdmin`, or similar middleware |
| **Public (intentional)** | Route path clearly public: `/health`, `/api/webhook`, `/api/lead`, `/api/fb-event` |
| **Unauthenticated (flag)** | No auth middleware detected and path suggests sensitive data (`/api/admin/*`, `/api/user*`, `/api/credit*`, `/api/chat*`) |

Output a table: `METHOD | PATH | AUTH MIDDLEWARE | CLASSIFICATION | RISK`

#### Webhook Security Check
For `/api/webhook` (Stripe): verify that `stripe.webhooks.constructEvent` is called with the `STRIPE_WEBHOOK_SECRET`. If not, flag as HIGH risk.

### Step 5 — Source Code Hardcoded Values

Check the following files specifically for hardcoded values that should be environment variables:

- `server/routes.ts`
- `server/routes/**/*.ts`
- `server/lib/**/*.ts`
- `client/src/**/*.ts`
- `client/src/**/*.tsx`
- `shared/**/*.ts`

Flag:
- Hardcoded port numbers other than a fallback (e.g., `3000`, `5000`, `8080`) where `process.env.PORT` is not checked first.
- Hardcoded domain names or URLs pointing to production systems.
- Hardcoded email addresses used for system operations (not test fixtures).
- Any `console.log` or `console.error` that prints a variable containing `token`, `key`, `secret`, or `password`.

### Step 6 — Dependency Audit (Optional, if npm available)
```bash
npm audit --json
```
Summarise: total vulnerabilities by severity (critical, high, moderate, low). List any critical or high CVEs with package name and fix version.

---

## Output Format

Produce the report in this exact structure:

```
========================================================
  SECURITY AUDIT REPORT — The Seer Within
  Generated: <ISO timestamp>
========================================================

EXECUTIVE SUMMARY
-----------------
Total findings:       X
  CRITICAL:           X
  HIGH:               X
  MEDIUM:             X
  LOW:                X
  INFORMATIONAL:      X

Recommendation: [ IMMEDIATE ACTION REQUIRED | REVIEW RECOMMENDED | CLEAN ]

========================================================
SECTION 1: EXPOSED SECRETS & API KEYS
========================================================

[ CRITICAL | HIGH | MEDIUM ] <Finding title>
  File:    <relative/path/to/file>:<line_number>
  Match:   <redacted snippet — show first 6 chars + ****>
  Detail:  <explanation>
  Fix:     <recommended remediation>

... (repeat for each finding)

No findings. ✓   (if section is clean)

========================================================
SECTION 2: ENVIRONMENT FILE SECURITY
========================================================

File: <.env filename>
  In .gitignore:  YES / NO
  Git history:    CLEAN / COMMITTED (commit: <hash>)
  Keys with real values: <count>
  Risk: CRITICAL / OK

... (repeat for each env file found)

========================================================
SECTION 3: ENDPOINT SECURITY
========================================================

METHOD | PATH                        | MIDDLEWARE              | STATUS       | RISK
-------|-----------------------------|--------------------------|--------------|---------
GET    | /api/admin/users            | requireAdmin            | Admin-only   | LOW
POST   | /api/chat                   | requireAuth             | Protected    | LOW
POST   | /api/webhook                | raw body + sig verify   | Public       | LOW
GET    | /api/admin/something        | (none detected)         | UNPROTECTED  | HIGH

Unauthenticated sensitive routes: X

========================================================
SECTION 4: HARDCODED VALUES IN SOURCE
========================================================

[ MEDIUM | LOW ] <Finding title>
  File:    <relative/path>:<line>
  Match:   <snippet>
  Fix:     <recommendation>

========================================================
SECTION 5: DEPENDENCY VULNERABILITIES
========================================================

npm audit summary:
  Critical: X  |  High: X  |  Moderate: X  |  Low: X

Critical / High CVEs:
  - <package>@<version>: <CVE-ID> — <description> (fix: upgrade to <version>)

========================================================
SECTION 6: RECOMMENDATIONS CHECKLIST
========================================================

[ ] Rotate any exposed API keys immediately (Section 1 findings)
[ ] Add all .env files to .gitignore if missing
[ ] Remove .env files from git history using git-filter-repo
[ ] Add authentication middleware to unauthenticated sensitive routes
[ ] Replace hardcoded values with environment variable references
[ ] Run npm audit fix for dependency vulnerabilities
[ ] Add a pre-commit hook (e.g., gitleaks, detect-secrets) to prevent future leaks

========================================================
END OF REPORT
========================================================
```

---

## Severity Definitions

| Severity | Meaning |
|---|---|
| **CRITICAL** | Live secret committed or exposed; immediate rotation required |
| **HIGH** | Sensitive endpoint unprotected or secret in source not yet committed |
| **MEDIUM** | Hardcoded non-secret value that should be configurable |
| **LOW** | Best-practice deviation with low exploit risk |
| **INFORMATIONAL** | Observation requiring no immediate action |

---

## Redaction Rules

- Never print a full secret value in the report. Always redact: show at most the first 6 characters followed by `****`.
- If a secret is found in a `.env` file that is properly gitignored and never committed, downgrade severity from CRITICAL to HIGH.

---

## Notes for the Agent

1. Run Steps 1–5 sequentially. Step 6 (npm audit) is optional if the shell is unavailable.
2. Use `Grep` with `output_mode: "content"` and `-n: true` to get line numbers for all matches.
3. For endpoint classification, read the actual route files rather than inferring from filenames.
4. After generating the report, ask the user: **"Would you like me to automatically fix any of these findings?"** and wait for confirmation before making any changes.
5. Do **not** modify files during the audit phase — this skill is read-only unless the user explicitly requests fixes.
