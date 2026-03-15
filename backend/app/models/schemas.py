from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
import uuid


# ============================================
# WORKFLOW MODELS
# ============================================
class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    input_schema: dict = Field(default_factory=dict)
    is_active: bool = True


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    input_schema: Optional[dict] = None
    is_active: Optional[bool] = None
    start_step_id: Optional[str] = None


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    version: int
    is_active: bool
    input_schema: dict
    start_step_id: Optional[str] = None
    created_at: str
    updated_at: str


# ============================================
# STEP MODELS
# ============================================
class StepCreate(BaseModel):
    name: str
    step_type: str = Field(..., pattern="^(task|approval|notification)$")
    order: int = 0
    metadata: dict = Field(default_factory=dict)


class StepUpdate(BaseModel):
    name: Optional[str] = None
    step_type: Optional[str] = None
    order: Optional[int] = None
    metadata: Optional[dict] = None


class StepResponse(BaseModel):
    id: str
    workflow_id: str
    name: str
    step_type: str
    order: int
    metadata: dict
    created_at: str
    updated_at: str


# ============================================
# RULE MODELS
# ============================================
class RuleCreate(BaseModel):
    condition: str
    next_step_id: Optional[str] = None
    priority: int = 0


class RuleUpdate(BaseModel):
    condition: Optional[str] = None
    next_step_id: Optional[str] = None
    priority: Optional[int] = None


class RuleResponse(BaseModel):
    id: str
    step_id: str
    condition: str
    next_step_id: Optional[str] = None
    priority: int
    created_at: str
    updated_at: str


# ============================================
# EXECUTION MODELS
# ============================================
class ExecutionCreate(BaseModel):
    data: dict = Field(default_factory=dict)
    triggered_by: str = "system"


class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    workflow_version: int
    status: str
    data: dict
    logs: list
    current_step_id: Optional[str] = None
    retries: int
    triggered_by: str
    started_at: str
    ended_at: Optional[str] = None


class PaginatedResponse(BaseModel):
    data: list
    total: int
    page: int
    page_size: int
