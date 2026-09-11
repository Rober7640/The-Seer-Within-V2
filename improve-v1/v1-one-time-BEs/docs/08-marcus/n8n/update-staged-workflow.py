#!/usr/bin/env python3
"""Update only the already-created 08 Marcus cloud workflow.

This script cannot create, activate, deactivate, or delete a workflow. It checks
the exact workflow ID and its current 08 Marcus name before replacing the canvas.
"""

import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


WORKFLOW_ID = "Lksy14rvjB5Z7aYg"
HERE = Path(__file__).resolve().parent
SOURCE = HERE / "08-marcus-numerology-stage1.n8n.json"
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
        final_runs = node_runs.get("26 · REPORT READY — DOWNLOAD PDF", []) or node_runs.get("QA HOLD · NO PDF", []) or node_runs.get("22 · REPORT READY — DOWNLOAD PDF", []) or node_runs.get("9 · REPORT READY — DOWNLOAD PDF", [])
        writer_runs = node_runs.get("8 · Write complete Marcus report", []) or node_runs.get("5 · OpenAI writes the reading", [])
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
                    "privateTermContexts": [
                        content[max(0, match.start() - 120):match.end() + 160]
                        for match in re.finditer(
                            r"numerology|life path|expression number|birthday number|soul urge|personality number|maturity number",
                            content or "",
                            flags=re.IGNORECASE,
                        )
                    ][:12] if isinstance(content, str) else [],
                }
        error = run_data.get("error") or {}
        final_grade_summary = {}
        final_grade_runs = node_runs.get("18 · Grade rewritten report", [])
        if final_grade_runs:
            grade_output = final_grade_runs[-1].get("data", {}).get("main", [[]])
            if grade_output and grade_output[0]:
                grade_json = (grade_output[0][0] or {}).get("json", {})
                grade_content = (((grade_json.get("choices") or [{}])[0].get("message") or {}).get("content"))
                if isinstance(grade_content, str):
                    try:
                        final_grade_summary = json.loads(grade_content)
                    except json.JSONDecodeError:
                        final_grade_summary = {"rawTail": grade_content[-1000:]}
        customer_grade_summary = {}
        customer_grade_runs = node_runs.get("21 · Grade as a paying reader", [])
        if customer_grade_runs:
            grade_output = customer_grade_runs[-1].get("data", {}).get("main", [[]])
            if grade_output and grade_output[0]:
                grade_json = (grade_output[0][0] or {}).get("json", {})
                grade_content = (((grade_json.get("choices") or [{}])[0].get("message") or {}).get("content"))
                if isinstance(grade_content, str):
                    try:
                        customer_grade_summary = json.loads(grade_content)
                    except json.JSONDecodeError:
                        customer_grade_summary = {"rawTail": grade_content[-1000:]}
        rewritten_summary = {}
        rewritten_runs = node_runs.get("16 · Validate rewritten report", [])
        if rewritten_runs:
            rewritten_output = rewritten_runs[-1].get("data", {}).get("main", [[]])
            if rewritten_output and rewritten_output[0]:
                rewritten_json = (rewritten_output[0][0] or {}).get("json", {})
                rewritten_summary = {
                    "draw": [(p.get("number"), p.get("label"), p.get("cardName")) for p in rewritten_json.get("buyerFaceDown", [])],
                    "sections": [
                        {
                            "positionNumber": section.get("positionNumber"),
                            "positionLabel": section.get("positionLabel"),
                            "cardName": section.get("cardName"),
                            "heading": section.get("heading"),
                            "bodyStart": str(section.get("body", ""))[:220],
                        }
                        for section in (rewritten_json.get("report") or {}).get("sections", [])
                    ],
                }
        accepted_summary = {}
        accepted_runs = node_runs.get("19 · Enforce final grade", []) or node_runs.get("12 · Enforce first grade", [])
        if accepted_runs:
            accepted_output = accepted_runs[-1].get("data", {}).get("main", [[]])
            if accepted_output and accepted_output[0]:
                accepted_json = (accepted_output[0][0] or {}).get("json", {})
                accepted_report = accepted_json.get("report") or {}
                accepted_summary = {
                    "title": accepted_report.get("title"),
                    "theme": accepted_report.get("theme"),
                    "openingStart": str(accepted_report.get("opening", ""))[:450],
                    "lifePathApplication": accepted_report.get("lifePathApplication"),
                    "personalCardHeading": accepted_report.get("personalCardHeading"),
                    "personalCardReadingStart": str(accepted_report.get("personalCardReading", ""))[:600],
                    "sections": [
                        {
                            "position": section.get("positionNumber"),
                            "card": section.get("cardName"),
                            "heading": section.get("heading"),
                            "bodyStart": str(section.get("body", ""))[:450],
                            "practicalMeaning": section.get("practicalMeaning"),
                        }
                        for section in accepted_report.get("sections", [])
                    ],
                    "synthesisStart": str(accepted_report.get("synthesis", ""))[:600],
                    "conclusion": accepted_report.get("conclusion"),
                }
        final_json = final_item.get("json") or {}
        if "--brief" in sys.argv:
            print({
                "id": execution.get("id"),
                "status": execution.get("status"),
                "finished": execution.get("finished"),
                "durationSeconds": (
                    round((
                        datetime.datetime.fromisoformat(execution["stoppedAt"].replace("Z", "+00:00"))
                        - datetime.datetime.fromisoformat(execution["startedAt"].replace("Z", "+00:00"))
                    ).total_seconds(), 3)
                    if execution.get("startedAt") and execution.get("stoppedAt") else None
                ),
                "lastNodeExecuted": run_data.get("lastNodeExecuted"),
                "error": error.get("message"),
                "canonVersion": final_json.get("canonVersion"),
                "canonKeys": final_json.get("canonKeys"),
                "lifePathProfile": final_json.get("lifePathProfile"),
                "lifePathApplication": accepted_summary.get("lifePathApplication"),
                "personalCardHeading": accepted_summary.get("personalCardHeading"),
                "personalCardReadingStart": accepted_summary.get("personalCardReadingStart"),
                "synthesisGrade": final_json.get("synthesisGrade"),
                "privateScores": (final_json.get("privateGrade") or {}).get("scores"),
                "customerScores": (final_json.get("customerGrade") or {}).get("scores"),
                "customerCounts": (final_json.get("customerGrade") or {}).get("counts"),
                "unsupportedClaims": (final_json.get("customerGrade") or {}).get("unsupportedClaims"),
                "gradeAttempt": final_json.get("gradeAttempt"),
                "cards": [
                    (item.get("number"), item.get("cardName"), item.get("visibility"))
                    for item in final_json.get("positions", [])
                ],
                "fileName": final_json.get("fileName"),
                "resultStatus": final_json.get("status"),
                "qaHoldReason": final_json.get("reason"),
                "pdfCreated": final_json.get("pdfCreated", bool((final_item.get("binary") or {}).get("data"))),
                "binaryMetadata": {
                    key: value
                    for key, value in ((final_item.get("binary") or {}).get("data") or {}).items()
                    if key != "data"
                },
            })
            return
        print({
            "id": execution.get("id"),
            "status": execution.get("status"),
            "finished": execution.get("finished"),
            "startedAt": execution.get("startedAt"),
            "stoppedAt": execution.get("stoppedAt"),
            "lastNodeExecuted": run_data.get("lastNodeExecuted"),
            "error": error.get("message"),
            "writer": writer_summary,
            "finalGrade": final_grade_summary,
            "customerGrade": customer_grade_summary,
            "rewrittenReport": rewritten_summary,
            "acceptedReport": accepted_summary,
            "finalJson": final_json,
            "binaryProperties": sorted((final_item.get("binary") or {}).keys()),
            "binaryMetadata": {
                key: value
                for key, value in ((final_item.get("binary") or {}).get("data") or {}).items()
                if key != "data"
            },
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
