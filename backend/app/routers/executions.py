from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from ..database import supabase
from ..models.schemas import ExecutionCreate, ExecutionResponse
from ..engine.rule_engine import evaluate_rules, RuleEngineError, MAX_LOOP_ITERATIONS

router = APIRouter(tags=["Executions"])


@router.post("/workflows/{workflow_id}/execute", response_model=ExecutionResponse)
async def execute_workflow(workflow_id: str, execution: ExecutionCreate):
    """Start a workflow execution."""
    # Get workflow with steps and rules
    wf_result = supabase.table("workflows").select("*").eq("id", workflow_id).execute()
    if not wf_result.data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = wf_result.data[0]
    if not workflow.get("is_active"):
        raise HTTPException(status_code=400, detail="Workflow is not active")

    # Get all steps ordered
    steps_result = (
        supabase.table("steps")
        .select("*")
        .eq("workflow_id", workflow_id)
        .order("order")
        .execute()
    )
    steps = steps_result.data or []
    if not steps:
        raise HTTPException(status_code=400, detail="Workflow has no steps")

    # Determine start step
    start_step_id = workflow.get("start_step_id") or steps[0]["id"]

    # Create execution record
    exec_payload = {
        "workflow_id": workflow_id,
        "workflow_version": workflow["version"],
        "status": "in_progress",
        "data": execution.data,
        "logs": [],
        "current_step_id": start_step_id,
        "retries": 0,
        "triggered_by": execution.triggered_by,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    exec_result = supabase.table("executions").insert(exec_payload).execute()
    if not exec_result.data:
        raise HTTPException(status_code=500, detail="Failed to create execution")

    execution_record = exec_result.data[0]
    execution_id = execution_record["id"]

    # Build step lookup
    step_map = {s["id"]: s for s in steps}

    # Execute steps
    logs = []
    current_step_id = start_step_id
    visited_steps = {}  # Track visits for loop detection
    status = "in_progress"

    while current_step_id:
        if current_step_id not in step_map:
            logs.append(
                {
                    "step_id": current_step_id,
                    "step_name": "Unknown",
                    "status": "failed",
                    "error": f"Step {current_step_id} not found",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
            status = "failed"
            break

        # Loop detection
        visited_steps[current_step_id] = visited_steps.get(current_step_id, 0) + 1
        if visited_steps[current_step_id] > MAX_LOOP_ITERATIONS:
            logs.append(
                {
                    "step_id": current_step_id,
                    "step_name": step_map[current_step_id]["name"],
                    "status": "failed",
                    "error": f"Max loop iterations ({MAX_LOOP_ITERATIONS}) exceeded for step",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
            status = "failed"
            break

        step = step_map[current_step_id]
        step_start = datetime.now(timezone.utc)

        log_entry = {
            "step_id": step["id"],
            "step_name": step["name"],
            "step_type": step["step_type"],
            "status": "in_progress",
            "timestamp": step_start.isoformat(),
            "rule_evaluations": [],
        }

        # Update current step
        supabase.table("executions").update(
            {
                "current_step_id": current_step_id,
                "logs": logs + [log_entry],
            }
        ).eq("id", execution_id).execute()

        # Simulate step execution based on type
        try:
            if step["step_type"] == "task":
                log_entry["action"] = f"Executed task: {step['name']}"
                log_entry["status"] = "completed"
            elif step["step_type"] == "approval":
                # Auto-approve for execution simulation
                log_entry["action"] = f"Auto-approved: {step['name']}"
                log_entry["approver"] = step.get("metadata", {}).get(
                    "assignee_email", "system"
                )
                log_entry["status"] = "completed"
            elif step["step_type"] == "notification":
                channel = step.get("metadata", {}).get("notification_channel", "email")
                log_entry["action"] = f"Notification sent via {channel}: {step['name']}"
                log_entry["status"] = "completed"

        except Exception as e:
            log_entry["status"] = "failed"
            log_entry["error"] = str(e)
            logs.append(log_entry)
            status = "failed"
            break

        # Evaluate rules to determine next step
        rules_result = (
            supabase.table("rules")
            .select("*")
            .eq("step_id", current_step_id)
            .order("priority")
            .execute()
        )
        rules = rules_result.data or []

        step_end = datetime.now(timezone.utc)
        log_entry["duration_ms"] = int((step_end - step_start).total_seconds() * 1000)

        if rules:
            try:
                eval_result = evaluate_rules(rules, execution.data)
                log_entry["rule_evaluations"] = eval_result["evaluations"]

                if eval_result["matched_rule"]:
                    matched = eval_result["matched_rule"]
                    log_entry["matched_rule_id"] = matched["id"]
                    log_entry["matched_condition"] = matched["condition"]
                    next_step_id = matched.get("next_step_id")

                    if next_step_id is None:
                        # Rule matched but next_step_id is null -> end workflow
                        log_entry["status"] = "completed"
                        log_entry["action"] = (
                            log_entry.get("action", "")
                            + f" | Rule matched: {matched['condition']} -> END"
                        )
                        logs.append(log_entry)
                        current_step_id = None
                        status = "completed"
                        continue
                    else:
                        log_entry["next_step_id"] = next_step_id
                        log_entry["action"] = (
                            log_entry.get("action", "")
                            + f" | Rule matched: {matched['condition']} -> {next_step_id}"
                        )
                else:
                    # No rule matched
                    log_entry["status"] = "failed"
                    log_entry["error"] = "No matching rule found (including DEFAULT)"
                    logs.append(log_entry)
                    status = "failed"
                    break

            except RuleEngineError as e:
                log_entry["status"] = "failed"
                log_entry["error"] = f"Rule evaluation error: {str(e)}"
                logs.append(log_entry)
                status = "failed"
                break

            logs.append(log_entry)
            current_step_id = next_step_id
        else:
            # No rules - find next step by order
            current_order = step["order"]
            next_steps = [s for s in steps if s["order"] > current_order]
            if next_steps:
                next_step = min(next_steps, key=lambda s: s["order"])
                log_entry["next_step_id"] = next_step["id"]
                log_entry["action"] = (
                    log_entry.get("action", "")
                    + f" | Sequential -> {next_step['name']}"
                )
                logs.append(log_entry)
                current_step_id = next_step["id"]
            else:
                # No more steps
                log_entry["status"] = "completed"
                log_entry["action"] = log_entry.get("action", "") + " | Final step"
                logs.append(log_entry)
                current_step_id = None
                status = "completed"

    # Update execution final state
    ended_at = datetime.now(timezone.utc).isoformat()
    supabase.table("executions").update(
        {
            "status": status,
            "logs": logs,
            "current_step_id": current_step_id,
            "ended_at": ended_at,
        }
    ).eq("id", execution_id).execute()

    # Return final execution
    final = supabase.table("executions").select("*").eq("id", execution_id).execute()
    return final.data[0]


@router.get("/executions", response_model=list)
async def list_executions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    workflow_id: Optional[str] = Query(None),
):
    """List all executions (audit log)."""
    query = supabase.table("executions").select("*", count="exact")

    if status:
        query = query.eq("status", status)
    if workflow_id:
        query = query.eq("workflow_id", workflow_id)

    query = query.order("started_at", desc=True)
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()

    # Enrich with workflow names
    executions = result.data or []
    workflow_ids = list(set(e["workflow_id"] for e in executions))
    workflow_names = {}
    for wid in workflow_ids:
        wf = supabase.table("workflows").select("name").eq("id", wid).execute()
        if wf.data:
            workflow_names[wid] = wf.data[0]["name"]

    for e in executions:
        e["workflow_name"] = workflow_names.get(e["workflow_id"], "Unknown")

    return executions


@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(execution_id: str):
    """Get execution status and logs."""
    result = supabase.table("executions").select("*").eq("id", execution_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution not found")
    return result.data[0]


@router.post("/executions/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    """Cancel a running execution."""
    result = supabase.table("executions").select("*").eq("id", execution_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution not found")

    execution = result.data[0]
    if execution["status"] not in ("pending", "in_progress"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel execution with status '{execution['status']}'",
        )

    ended_at = datetime.now(timezone.utc).isoformat()
    supabase.table("executions").update(
        {
            "status": "canceled",
            "ended_at": ended_at,
        }
    ).eq("id", execution_id).execute()

    return {"message": "Execution canceled successfully"}


@router.post("/executions/{execution_id}/retry")
async def retry_execution(execution_id: str):
    """Retry the failed step in an execution."""
    result = supabase.table("executions").select("*").eq("id", execution_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution not found")

    execution = result.data[0]
    if execution["status"] != "failed":
        raise HTTPException(status_code=400, detail="Can only retry failed executions")

    current_step_id = execution.get("current_step_id")
    if not current_step_id:
        raise HTTPException(status_code=400, detail="No step to retry")

    # Get the step
    step_result = (
        supabase.table("steps").select("*").eq("id", current_step_id).execute()
    )
    if not step_result.data:
        raise HTTPException(status_code=400, detail="Failed step no longer exists")

    step = step_result.data[0]

    # Get all steps for this workflow
    all_steps = (
        supabase.table("steps")
        .select("*")
        .eq("workflow_id", execution["workflow_id"])
        .order("order")
        .execute()
    ).data or []

    step_map = {s["id"]: s for s in all_steps}
    logs = execution.get("logs", [])
    data = execution.get("data", {})
    retries = execution.get("retries", 0) + 1

    # Re-execute from the failed step
    current_id = current_step_id
    status = "in_progress"
    visited_steps = {}

    supabase.table("executions").update(
        {
            "status": "in_progress",
            "retries": retries,
            "ended_at": None,
        }
    ).eq("id", execution_id).execute()

    while current_id:
        if current_id not in step_map:
            logs.append(
                {
                    "step_id": current_id,
                    "step_name": "Unknown",
                    "status": "failed",
                    "error": f"Step {current_id} not found",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry": True,
                }
            )
            status = "failed"
            break

        visited_steps[current_id] = visited_steps.get(current_id, 0) + 1
        if visited_steps[current_id] > MAX_LOOP_ITERATIONS:
            logs.append(
                {
                    "step_id": current_id,
                    "step_name": step_map[current_id]["name"],
                    "status": "failed",
                    "error": f"Max loop iterations exceeded",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry": True,
                }
            )
            status = "failed"
            break

        s = step_map[current_id]
        step_start = datetime.now(timezone.utc)

        log_entry = {
            "step_id": s["id"],
            "step_name": s["name"],
            "step_type": s["step_type"],
            "status": "completed",
            "timestamp": step_start.isoformat(),
            "rule_evaluations": [],
            "retry": True,
        }

        if s["step_type"] == "task":
            log_entry["action"] = f"Retried task: {s['name']}"
        elif s["step_type"] == "approval":
            log_entry["action"] = f"Retried approval: {s['name']}"
            log_entry["approver"] = s.get("metadata", {}).get(
                "assignee_email", "system"
            )
        elif s["step_type"] == "notification":
            channel = s.get("metadata", {}).get("notification_channel", "email")
            log_entry["action"] = f"Retried notification via {channel}: {s['name']}"

        # Evaluate rules
        rules_res = (
            supabase.table("rules")
            .select("*")
            .eq("step_id", current_id)
            .order("priority")
            .execute()
        )
        rules = rules_res.data or []

        step_end = datetime.now(timezone.utc)
        log_entry["duration_ms"] = int((step_end - step_start).total_seconds() * 1000)

        if rules:
            try:
                eval_result = evaluate_rules(rules, data)
                log_entry["rule_evaluations"] = eval_result["evaluations"]

                if eval_result["matched_rule"]:
                    matched = eval_result["matched_rule"]
                    next_step_id = matched.get("next_step_id")
                    if next_step_id is None:
                        logs.append(log_entry)
                        current_id = None
                        status = "completed"
                        continue
                    else:
                        log_entry["next_step_id"] = next_step_id
                        logs.append(log_entry)
                        current_id = next_step_id
                else:
                    log_entry["status"] = "failed"
                    log_entry["error"] = "No matching rule found"
                    logs.append(log_entry)
                    status = "failed"
                    break
            except RuleEngineError as e:
                log_entry["status"] = "failed"
                log_entry["error"] = str(e)
                logs.append(log_entry)
                status = "failed"
                break
        else:
            current_order = s["order"]
            next_steps = [st for st in all_steps if st["order"] > current_order]
            if next_steps:
                nxt = min(next_steps, key=lambda x: x["order"])
                log_entry["next_step_id"] = nxt["id"]
                logs.append(log_entry)
                current_id = nxt["id"]
            else:
                logs.append(log_entry)
                current_id = None
                status = "completed"

    ended_at = datetime.now(timezone.utc).isoformat()
    supabase.table("executions").update(
        {
            "status": status,
            "logs": logs,
            "current_step_id": current_id,
            "retries": retries,
            "ended_at": ended_at,
        }
    ).eq("id", execution_id).execute()

    final = supabase.table("executions").select("*").eq("id", execution_id).execute()
    return final.data[0]
