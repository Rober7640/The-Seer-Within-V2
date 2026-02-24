# Using the Security Audit Skills

Two AI-powered audit tools have been built into this project. They run inside Claude Code (the AI coding assistant used to build this project).

---

## What these skills are

Skills are custom instructions for Claude Code that tell it to perform a specific type of analysis.

These two skills scan the codebase and produce structured security reports:

| Skill | What it does |
|-------|-------------|
| `/audit` | Finds exposed API keys, hardcoded secrets, insecure endpoints, and npm vulnerabilities |
| `/ai-audit` | Finds AI-specific security risks: prompt injection, jailbreak vulnerabilities, unsafe output handling |

---

## How to run them

You need Claude Code installed and running in the project directory.

To run an audit, type one of these trigger phrases in the Claude Code chat:

**For the security audit:**
```
run security audit
```
or
```
audit endpoints
```
or
```
scan for secrets
```

**For the AI/prompt injection audit:**
```
run ai audit
```
or
```
scan for prompt injection
```
or
```
check llm security
```

---

## What the `/audit` skill checks

The security audit (`/audit`) scans for:

1. **Exposed secrets and API keys** — Looks for anything that looks like a key, token, or password hardcoded in source files (e.g. `sk-ant-...`, `Bearer ...`, connection strings)

2. **Environment file security** — Checks whether `.env` files are properly in `.gitignore` and not committed to git

3. **Endpoint security** — Maps all API routes and flags which ones are:
   - Open to the public (no auth required) — intentional or not?
   - Admin-only routes — are they properly protected?
   - Routes that should require auth but don't

4. **Hardcoded values in source code** — Finds passwords, credentials, or sensitive config embedded in code instead of environment variables

5. **npm dependency vulnerabilities** — Runs `npm audit` and reports HIGH/CRITICAL package vulnerabilities

**Output format:**
```
EXECUTIVE SUMMARY
- X CRITICAL issues
- X HIGH issues
- X MEDIUM issues

EXPOSED SECRETS
[list of findings]

ENDPOINT SECURITY TABLE
[route | method | auth required | status]

DEPENDENCY VULNERABILITIES
[package | severity | description]

RECOMMENDATIONS
[prioritised action list]
```

---

## What the `/ai-audit` skill checks

The AI audit (`/ai-audit`) follows OWASP LLM Top 10 (2025) and scans for:

1. **Prompt injection surfaces** — Can a user inject instructions into the AI by writing them in chat? Are user inputs clearly separated from system instructions?

2. **System prompt leakage** — Could a clever user trick the AI into revealing its secret instructions? Are confidentiality clauses in the prompts?

3. **Jailbreak resistance** — Does the AI have proper safety override clauses? Can it be manipulated into acting outside its persona or ignoring safety rules?

4. **Input validation** — Are there length limits on user messages? Are dangerous characters stripped before being passed to the AI?

5. **Memory/context injection** — When memories from previous sessions are loaded, are they properly sandboxed so a user can't inject instructions via their chat history?

6. **Output handling** — Is the AI's response rendered safely? (e.g. could it generate HTML that runs JavaScript?)

7. **Excessive agency** — Does the AI have access to tools or functions it shouldn't? Can it take actions beyond generating text?

**Severity levels:**
- **CRITICAL** — Direct model control, system prompt extraction, business logic bypass
- **HIGH** — Can bypass persona restrictions or produce unsafe output
- **MEDIUM** — Requires significant effort to exploit
- **LOW** — Defence gap, low immediate risk

---

## When to run these audits

Run `/audit` when:
- You've added new environment variables or API keys
- You've added new API endpoints
- You're about to go live
- Any new developer joins the project (verify no secrets were accidentally committed)
- After significant refactoring

Run `/ai-audit` when:
- You've changed any system prompts
- You've added new guides/personas
- You've changed how user input is processed
- You've changed how memories are loaded and injected
- Before going live

---

## Where the skill files live

The full skill instructions are in:
```
.claude/skills/audit/SKILL.md      (security audit)
.claude/skills/ai-audit/SKILL.md   (AI/prompt injection audit)
```

You can open these files to read the full step-by-step instructions that Claude follows.

---

## Important: these are AI-assisted audits

The skills instruct Claude to analyse the code and flag potential issues. They do not automatically fix anything — they produce reports.

A human developer must:
1. Read the report
2. Decide which findings are real risks vs. false positives
3. Fix the actual issues

The skills are tools to help you not miss things — not a complete replacement for a professional security audit before handling real payments.
