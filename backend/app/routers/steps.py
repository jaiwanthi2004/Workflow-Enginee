from fastapi import APIRouter, HTTPException
from ..database import supabase
from ..models.schemas import StepCreate, StepUpdate, StepResponse

router = APIRouter(tags=["Steps"])


@router.post("/workflows/{workflow_id}/steps", response_model=StepResponse)
async def create_step(workflow_id: str, step: StepCreate):
    """Add a step to a workflow."""
    # Verify workflow exists
    wf = supabase.table("workflows").select("id").eq("id", workflow_id).execute()
    if not wf.data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    payload = {
        "workflow_id": workflow_id,
        "name": step.name,
        "step_type": step.step_type,
        "order": step.order,
        "metadata": step.metadata,
    }
    result = supabase.table("steps").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create step")
    return result.data[0]


@router.get("/workflows/{workflow_id}/steps")
async def list_steps(workflow_id: str):
    """List all steps for a workflow."""
    result = (
        supabase.table("steps")
        .select("*")
        .eq("workflow_id", workflow_id)
        .order("order")
        .execute()
    )
    return result.data or []


@router.put("/steps/{step_id}", response_model=StepResponse)
async def update_step(step_id: str, step: StepUpdate):
    """Update a step."""
    existing = supabase.table("steps").select("id").eq("id", step_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Step not found")

    update_data = {}
    if step.name is not None:
        update_data["name"] = step.name
    if step.step_type is not None:
        update_data["step_type"] = step.step_type
    if step.order is not None:
        update_data["order"] = step.order
    if step.metadata is not None:
        update_data["metadata"] = step.metadata

    result = supabase.table("steps").update(update_data).eq("id", step_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update step")
    return result.data[0]


@router.delete("/steps/{step_id}")
async def delete_step(step_id: str):
    """Delete a step and its rules (cascaded)."""
    existing = supabase.table("steps").select("id").eq("id", step_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Step not found")

    supabase.table("steps").delete().eq("id", step_id).execute()
    return {"message": "Step deleted successfully"}
