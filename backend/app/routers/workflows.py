from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..database import supabase
from ..models.schemas import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.post("", response_model=WorkflowResponse)
async def create_workflow(workflow: WorkflowCreate):
    """Create a new workflow."""
    payload = {
        "name": workflow.name,
        "description": workflow.description,
        "input_schema": workflow.input_schema,
        "is_active": workflow.is_active,
        "version": 1,
    }
    result = supabase.table("workflows").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create workflow")
    return result.data[0]


@router.get("", response_model=PaginatedResponse)
async def list_workflows(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List workflows with pagination and search."""
    query = supabase.table("workflows").select("*", count="exact")

    if search:
        query = query.ilike("name", f"%{search}%")
    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("created_at", desc=True)
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()
    total = result.count if result.count is not None else len(result.data)

    # For each workflow, get step count
    workflows_with_counts = []
    for w in result.data:
        step_count_result = (
            supabase.table("steps")
            .select("id", count="exact")
            .eq("workflow_id", w["id"])
            .execute()
        )
        w["step_count"] = (
            step_count_result.count if step_count_result.count is not None else 0
        )
        workflows_with_counts.append(w)

    return {
        "data": workflows_with_counts,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get workflow details including steps and rules."""
    result = supabase.table("workflows").select("*").eq("id", workflow_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = result.data[0]

    # Get steps
    steps_result = (
        supabase.table("steps")
        .select("*")
        .eq("workflow_id", workflow_id)
        .order("order")
        .execute()
    )
    workflow["steps"] = steps_result.data or []

    # Get rules for each step
    for step in workflow["steps"]:
        rules_result = (
            supabase.table("rules")
            .select("*")
            .eq("step_id", step["id"])
            .order("priority")
            .execute()
        )
        step["rules"] = rules_result.data or []

    return workflow


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, workflow: WorkflowUpdate):
    """Update workflow - creates new version."""
    # Get existing workflow
    existing = supabase.table("workflows").select("*").eq("id", workflow_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    update_data = {}
    if workflow.name is not None:
        update_data["name"] = workflow.name
    if workflow.description is not None:
        update_data["description"] = workflow.description
    if workflow.input_schema is not None:
        update_data["input_schema"] = workflow.input_schema
    if workflow.is_active is not None:
        update_data["is_active"] = workflow.is_active
    if workflow.start_step_id is not None:
        update_data["start_step_id"] = workflow.start_step_id

    # Increment version
    update_data["version"] = existing.data[0]["version"] + 1

    result = (
        supabase.table("workflows").update(update_data).eq("id", workflow_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update workflow")
    return result.data[0]


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow and all its steps/rules (cascaded)."""
    existing = supabase.table("workflows").select("id").eq("id", workflow_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    supabase.table("workflows").delete().eq("id", workflow_id).execute()
    return {"message": "Workflow deleted successfully"}
