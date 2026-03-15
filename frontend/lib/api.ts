const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ============================================
// WORKFLOWS
// ============================================
export async function getWorkflows(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
  return request(`/workflows?${qs.toString()}`);
}

export async function getWorkflow(id: string) {
  return request(`/workflows/${id}`);
}

export async function createWorkflow(data: {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  is_active?: boolean;
}) {
  return request("/workflows", { method: "POST", body: JSON.stringify(data) });
}

export async function updateWorkflow(
  id: string,
  data: {
    name?: string;
    description?: string;
    input_schema?: Record<string, unknown>;
    is_active?: boolean;
    start_step_id?: string;
  }
) {
  return request(`/workflows/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWorkflow(id: string) {
  return request(`/workflows/${id}`, { method: "DELETE" });
}

// ============================================
// STEPS
// ============================================
export async function getSteps(workflowId: string) {
  return request(`/workflows/${workflowId}/steps`);
}

export async function createStep(
  workflowId: string,
  data: {
    name: string;
    step_type: string;
    order?: number;
    metadata?: Record<string, unknown>;
  }
) {
  return request(`/workflows/${workflowId}/steps`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStep(
  stepId: string,
  data: {
    name?: string;
    step_type?: string;
    order?: number;
    metadata?: Record<string, unknown>;
  }
) {
  return request(`/steps/${stepId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteStep(stepId: string) {
  return request(`/steps/${stepId}`, { method: "DELETE" });
}

// ============================================
// RULES
// ============================================
export async function getRules(stepId: string) {
  return request(`/steps/${stepId}/rules`);
}

export async function createRule(
  stepId: string,
  data: {
    condition: string;
    next_step_id?: string | null;
    priority?: number;
  }
) {
  return request(`/steps/${stepId}/rules`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRule(
  ruleId: string,
  data: {
    condition?: string;
    next_step_id?: string | null;
    priority?: number;
  }
) {
  return request(`/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRule(ruleId: string) {
  return request(`/rules/${ruleId}`, { method: "DELETE" });
}

// ============================================
// EXECUTIONS
// ============================================
export async function executeWorkflow(
  workflowId: string,
  data: { data: Record<string, unknown>; triggered_by?: string }
) {
  return request(`/workflows/${workflowId}/execute`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getExecutions(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  workflow_id?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  if (params?.workflow_id) qs.set("workflow_id", params.workflow_id);
  return request(`/executions?${qs.toString()}`);
}

export async function getExecution(id: string) {
  return request(`/executions/${id}`);
}

export async function cancelExecution(id: string) {
  return request(`/executions/${id}/cancel`, { method: "POST" });
}

export async function retryExecution(id: string) {
  return request(`/executions/${id}/retry`, { method: "POST" });
}
