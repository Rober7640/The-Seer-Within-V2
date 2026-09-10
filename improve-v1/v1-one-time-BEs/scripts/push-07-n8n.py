#!/usr/bin/env python3
"""Push the 07 fulfilment workflow to n8n over the PUBLIC REST API.

WHY THIS EXISTS
  The n8n MCP on this instance is read+execute only — it cannot create workflows.
  The public REST API is a SEPARATE DOOR and it is open (`POST /api/v1/workflows`
  answers 401 "'X-N8N-API-KEY' header required", not 404). It has been able to
  create workflows since long before the MCP builder tools existed, so the
  instance-version question does not apply to this path.

  ⛔ The API is FUSSIER than the UI importer. It accepts only name / nodes /
  connections / settings and rejects `active`, `tags`, `pinData`, `id` outright
  with "request.body should NOT have additional properties". The .n8n.json file
  keeps those fields because Import-from-File wants them; this script strips them.

GET A KEY
  n8n → Settings → n8n API → Create an API key.

  Put it in the repo-root `.env`, same place as the AWeber tokens — it is gitignored
  and it is where every other operator script in this repo reads its secrets from:

    N8N_API_KEY=n8n_api_...
    N8N_BASE_URL=https://ezyabsorb.app.n8n.cloud

  A real environment variable overrides `.env` if you would rather not persist it.

USE
  python3 scripts/push-07-n8n.py --dry-run     # print the exact payload, send nothing
  python3 scripts/push-07-n8n.py               # create it
  python3 scripts/push-07-n8n.py --update <id> # replace an existing one, same id

⛔ THIS SCRIPT NEVER ACTIVATES A WORKFLOW. Activation is a separate endpoint and a
   deliberate human act — the workflow points at five endpoints that do not exist yet.
"""
import json, os, re, sys, urllib.request, urllib.error

SRC = "docs/07-marcus/07-fulfilment.n8n.json"
# improve-v1/v1-one-time-BEs/scripts/ → the repo root that holds .env
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "..", "..", ".env")


def secret(name):
    """Real env var wins; otherwise read the repo-root .env, the way
    docs/aweber/aweber-broadcast.cjs does. No dotenv dependency."""
    if os.environ.get(name):
        return os.environ[name]
    try:
        for line in open(ENV_PATH, encoding="utf-8"):
            m = re.match(rf"\s*{re.escape(name)}\s*=\s*(.*)", line)
            if m:
                return m.group(1).strip().strip("'\"")
    except FileNotFoundError:
        pass
    return ""

# The public API's create/update schema. Anything outside this set is a 400.
KEEP = ("name", "nodes", "connections", "settings")
# `settings` has its own allow-list and is the second most common 400. Keep it minimal.
SAFE_SETTINGS = ("executionOrder", "saveManualExecutions",
                 "saveDataErrorExecution", "saveDataSuccessExecution")


def payload():
    wf = json.load(open(SRC))

    # 🔴 REFUSE AN UNWIRED CREDENTIAL. A workflow whose httpHeaderAuth id is a placeholder is
    #    accepted by n8n without complaint and then fails at RUN time with a 401 — on a woman
    #    who has already paid, and reading like a bad API key rather than a wiring mistake.
    #    ⛔ Catch it here, where it costs nothing.
    unwired = sorted({
        n["name"] for n in wf.get("nodes", [])
        for c in n.get("credentials", {}).values()
        if str(c.get("id", "")).upper().startswith(("TODO", "DRYRUN"))
    })
    if unwired:
        raise SystemExit(
            "⛔ REFUSING TO PUSH — these nodes carry a placeholder credential id:\n"
            + "".join(f"     {n}\n" for n in unwired)
            + "   Create the credential in n8n, paste its id into the matching constant in\n"
              "   scripts/build-07-n8n.py, re-run that, then push.\n"
              "   Walkthrough: docs/07-marcus/07-openai-credential.md")

    body = {k: wf[k] for k in KEEP if k in wf}
    body["settings"] = {k: v for k, v in wf.get("settings", {}).items()
                        if k in SAFE_SETTINGS}
    # Node `id` is fine (it is the in-graph reference the connections use); the
    # workflow-level `id` is not.
    dropped = sorted(set(wf) - set(body))
    return body, dropped


def call(method, path, body=None):
    base = secret("N8N_BASE_URL").rstrip("/")
    key = secret("N8N_API_KEY")
    if not base or not key:
        sys.exit("⛔ N8N_API_KEY / N8N_BASE_URL not found in the environment or "
                 f"{os.path.normpath(ENV_PATH)} — see the docstring")
    req = urllib.request.Request(
        f"{base}/api/v1{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"X-N8N-API-KEY": key, "Content-Type": "application/json",
                 "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or "{}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:600]
        sys.exit(f"⛔ {method} {path} → HTTP {e.code}\n{detail}")


def main():
    args = sys.argv[1:]
    body, dropped = payload()
    print(f"{len(body['nodes'])} nodes · {len(body['connections'])} connected nodes")
    print(f"stripped (read-only to the API): {', '.join(dropped) or 'nothing'}")
    print(f"settings sent: {body['settings']}")

    if "--dry-run" in args:
        print("\n--- payload (first 800 chars) ---")
        print(json.dumps(body, ensure_ascii=False)[:800])
        print("\ndry run — nothing sent")
        return

    if "--update" in args:
        wid = args[args.index("--update") + 1]
        got = call("PUT", f"/workflows/{wid}", body)
        print(f"\n✅ updated {got.get('id')} — active: {got.get('active')}")
    else:
        got = call("POST", "/workflows", body)
        print(f"\n✅ created {got.get('id')} — active: {got.get('active')}")
        print(f"   {secret('N8N_BASE_URL').rstrip('/')}/workflow/{got.get('id')}")
    print("⛔ still INACTIVE. Five endpoints it calls do not exist yet — see "
          "docs/07-marcus/07-fulfilment-README.md before activating.")


if __name__ == "__main__":
    main()
