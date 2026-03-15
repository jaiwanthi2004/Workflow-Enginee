export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: number;
  is_active: boolean;
  input_schema: Record<string, unknown>;
  start_step_id: string | null;
  step_count?: number;
  steps?: Step[];
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: string;
  workflow_id: string;
  name: string;
  step_type: "task" | "approval" | "notification";
  order: number;
  metadata: Record<string, unknown>;
  rules?: Rule[];
  created_at: string;
  updated_at: string;
}

export interface Rule {
  id: string;
  step_id: string;
  condition: string;
  next_step_id: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  workflow_version: number;
  status: "pending" | "in_progress" | "completed" | "failed" | "canceled";
  data: Record<string, unknown>;
  logs: ExecutionLog[];
  current_step_id: string | null;
  retries: number;
  triggered_by: string;
  started_at: string;
  ended_at: string | null;
}

export interface ExecutionLog {
  step_id: string;
  step_name: string;
  step_type?: string;
  status: string;
  action?: string;
  error?: string;
  timestamp: string;
  duration_ms?: number;
  approver?: string;
  matched_rule_id?: string;
  matched_condition?: string;
  next_step_id?: string;
  rule_evaluations?: RuleEvaluation[];
  retry?: boolean;
}

export interface RuleEvaluation {
  rule_id: string;
  condition: string;
  priority: number;
  result: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
