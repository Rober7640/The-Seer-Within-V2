#!/usr/bin/env python3
"""Update only the already-created 08 Marcus cloud workflow.

This script cannot create, activate, deactivate, or delete a workflow. It checks
the exact workflow ID and its current 08 Marcus name before replacing the canvas.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


WORKFLOW_ID = "Lksy14rvjB5Z7aYg"
HERE = Path(__file__).resolve().parent
SOURCE = HERE / "08-marcus-staged.n8n.json"
ENV_PATH = HERE.parents[4] / ".env"
SAFE_SETTINGS = (
    "executionOrder",
    "saveManualExecutions",
    "saveDataErrorExecution",
    "saveDataSuccessExecution",
)


def secret(name):
    if os.environ.get(name):
        return os.environ[name]
    try:
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            match = re.match(rf"\s*{re.escape(name)}\s*=\s*(.*)", line)
            if match:
                return match.group(1).strip().strip("'\"")
    except FileNotFoundError:
        pass
    return ""


def request(method, path, body=None):
    base = secret("N8N_BASE_URL").rstrip("/")
    key = secret("N8N_API_KEY")
    if not base or not key:
        raise SystemExit(f"Missing N8N_BASE_URL or N8N_API_KEY in {ENV_PATH}")
    req = urllib.request.Request(
        f"{base}/api/v1{path}",
        method=method,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={
            "X-N8N-API-KEY": key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read() or "{}")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:800]
        raise SystemExit(f"{method} {path} failed with HTTP {error.code}: {detail}") from error


def payload():
    workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
    placeholders = sorted(
        node["name"]
        for node in workflow.get("nodes", [])
        for credential in (node.get("credentials") or {}).values()
        if str(credential.get("id", "")).upper().startswith(("TODO", "DRYRUN"))
    )
    if placeholders:
        raise SystemExit(f"Refusing placeholder credentials: {', '.join(placeholders)}")
    return {
        "name": workflow["name"],
        "nodes": workflow["nodes"],
        "connections": workflow["connections"],
        "settings": {
            key: value
            for key, value in workflow.get("settings", {}).items()
            if key in SAFE_SETTINGS
        },
    }


def main():
    if "--last-execution" in sys.argv:
        listing = request(
            "GET",
            f"/executions?workflowId={WORKFLOW_ID}&limit=1&includeData=true",
        )
        executions = listing.get("data", [])
        if not executions:
            raise SystemExit("No Marcus execution was found.")
        execution = executions[0]
        run_data = (execution.get("data") or {}).get("resultData", {})
        node_runs = run_data.get("runData", {})
        final_runs = node_runs.get("9 · REPORT READY — DOWNLOAD PDF", [])
        writer_runs = node_runs.get("5 · OpenAI writes the reading", [])
        final_item = {}
        if final_runs:
            output = final_runs[-1].get("data", {}).get("main", [[]])
            if output and output[0]:
                final_item = output[0][0] or {}
        writer_summary = {}
        if writer_runs:
            writer_output = writer_runs[-1].get("data", {}).get("main", [[]])
            if writer_output and writer_output[0]:
                writer_json = (writer_output[0][0] or {}).get("json", {})
                choice = (writer_json.get("choices") or [{}])[0]
                content = (choice.get("message") or {}).get("content")
                writer_summary = {
                    "finishReason": choice.get("finish_reason"),
                    "contentChars": len(content) if isinstance(content, str) else None,
                    "contentTail": content[-500:] if isinstance(content, str) else None,
                }
        error = run_data.get("error") or {}
        print({
            "id": execution.get("id"),
            "status": execution.get("status"),
            "finished": execution.get("finished"),
            "startedAt": execution.get("startedAt"),
            "stoppedAt": execution.get("stoppedAt"),
            "lastNodeExecuted": run_data.get("lastNodeExecuted"),
            "error": error.get("message"),
            "writer": writer_summary,
            "finalJson": final_item.get("json"),
            "binaryProperties": sorted((final_item.get("binary") or {}).keys()),
        })
        return

    current = request("GET", f"/workflows/{WORKFLOW_ID}")
    if current.get("id") != WORKFLOW_ID:
        raise SystemExit("The API returned a different workflow ID; refusing update.")
    if not str(current.get("name", "")).startswith("08 Marcus"):
        raise SystemExit(f"Workflow name is no longer an 08 Marcus workflow: {current.get('name')!r}")
    if current.get("active"):
        raise SystemExit("The Marcus workflow is active; refusing to replace a live canvas.")

    body = payload()
    if "--dry-run" in sys.argv:
        print({
            "workflowId": WORKFLOW_ID,
            "currentName": current.get("name"),
            "newName": body["name"],
            "nodes": len(body["nodes"]),
            "credentials": [
                (node["name"], credential.get("id"), credential.get("name"))
                for node in body["nodes"]
                for credential in (node.get("credentials") or {}).values()
            ],
            "willRemainInactive": True,
        })
        return

    updated = request("PUT", f"/workflows/{WORKFLOW_ID}", body)
    if updated.get("id") != WORKFLOW_ID or updated.get("active"):
        raise SystemExit("Update response failed the workflow ID/inactive safety check.")
    print({
        "updated": updated.get("id"),
        "name": updated.get("name"),
        "active": updated.get("active"),
        "nodes": len(updated.get("nodes", [])),
    })


if __name__ == "__main__":
    main()
