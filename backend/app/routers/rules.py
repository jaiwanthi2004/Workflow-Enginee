from fastapi import APIRouter, HTTPException
from ..database import supabase
from ..models.schemas import RuleCreate, RuleUpdate, RuleResponse

router = APIRouter(tags=["Rules"])


@router.post("/steps/{step_id}/rules", response_model=RuleResponse)
async def create_rule(step_id: str, rule: RuleCreate):
    """Add a rule to a step."""
    # Verify step exists
    step = supabase.table("steps").select("id").eq("id", step_id).execute()
    if not step.data:
        raise HTTPException(status_code=404, detail="Step not found")

    payload = {
        "step_id": step_id,
        "condition": rule.condition,
        "next_step_id": rule.next_step_id,
        "priority": rule.priority,
    }
    result = supabase.table("rules").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create rule")
    return result.data[0]


@router.get("/steps/{step_id}/rules")
async def list_rules(step_id: str):
    """List all rules for a step."""
    result = (
        supabase.table("rules")
        .select("*")
        .eq("step_id", step_id)
        .order("priority")
        .execute()
    )
    return result.data or []


@router.put("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(rule_id: str, rule: RuleUpdate):
    """Update a rule."""
    existing = supabase.table("rules").select("id").eq("id", rule_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = {}
    if rule.condition is not None:
        update_data["condition"] = rule.condition
    if rule.next_step_id is not None:
        update_data["next_step_id"] = rule.next_step_id
    if rule.priority is not None:
        update_data["priority"] = rule.priority

    result = supabase.table("rules").update(update_data).eq("id", rule_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update rule")
    return result.data[0]


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Delete a rule."""
    existing = supabase.table("rules").select("id").eq("id", rule_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    supabase.table("rules").delete().eq("id", rule_id).execute()
    return {"message": "Rule deleted successfully"}
