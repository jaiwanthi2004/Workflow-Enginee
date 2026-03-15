"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getWorkflow,
  updateWorkflow,
  createStep,
  updateStep,
  deleteStep,
} from "@/lib/api";
import { Workflow, Step } from "@/lib/types";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  X,
  GitBranch,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  allowed_values: string;
}

const STEP_TYPE_INFO: Record<
  string,
  { label: string; description: string; metaFields: { key: string; label: string; placeholder: string }[] }
> = {
  task: {
    label: "Task",
    description: "A piece of work to be done (e.g., review a document, process a request)",
    metaFields: [
      { key: "assignee_email", label: "Assigned to (email)", placeholder: "e.g., john@company.com" },
      { key: "instructions", label: "Instructions", placeholder: "What should the person do?" },
    ],
  },
  approval: {
    label: "Approval",
    description: "Someone needs to approve or reject before moving on",
    metaFields: [
      { key: "approver_email", label: "Approver email", placeholder: "e.g., manager@company.com" },
      { key: "approval_message", label: "Message to approver", placeholder: "Please review and approve" },
    ],
  },
  notification: {
    label: "Notification",
    description: "Send a notification to someone (email, message, etc.)",
    metaFields: [
      { key: "recipient_email", label: "Send to (email)", placeholder: "e.g., team@company.com" },
      { key: "subject", label: "Subject", placeholder: "e.g., Your request has been processed" },
      { key: "message", label: "Message body", placeholder: "The message content..." },
    ],
  },
};

export default function EditWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);

  // New step form
  const [showStepForm, setShowStepForm] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [newStepType, setNewStepType] = useState<string>("task");
  const [newStepMeta, setNewStepMeta] = useState<Record<string, string>>({});

  // Edit step
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editStepName, setEditStepName] = useState("");
  const [editStepType, setEditStepType] = useState<string>("task");
  const [editStepMeta, setEditStepMeta] = useState<Record<string, string>>({});

  const parseSchemaToFields = (schema: Record<string, unknown>): SchemaField[] => {
    return Object.entries(schema).map(([fieldName, fieldDef]) => {
      const def = fieldDef as Record<string, unknown>;
      return {
        name: fieldName,
        type: (def.type as string) || "string",
        required: (def.required as boolean) || false,
        allowed_values: Array.isArray(def.allowed_values)
          ? (def.allowed_values as string[]).join(", ")
          : "",
      };
    });
  };

  const buildSchemaFromFields = (): Record<string, unknown> => {
    const schema: Record<string, unknown> = {};
    for (const f of schemaFields) {
      if (!f.name) continue;
      const fieldDef: Record<string, unknown> = {
        type: f.type,
        required: f.required,
      };
      if (f.allowed_values.trim()) {
        fieldDef.allowed_values = f.allowed_values.split(",").map((v) => v.trim());
      }
      schema[f.name] = fieldDef;
    }
    return schema;
  };

  const metaToRecord = (meta: Record<string, unknown>): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta)) {
      result[k] = String(v || "");
    }
    return result;
  };

  const loadWorkflow = useCallback(async () => {
    try {
      const data = await getWorkflow(id);
      setWorkflow(data);
      setName(data.name);
      setDescription(data.description || "");
      setIsActive(data.is_active);
      setSchemaFields(parseSchemaToFields(data.input_schema || {}));
      setSteps(data.steps || []);
    } catch (err) {
      console.error("Failed to load:", err);
      setError("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const handleSaveWorkflow = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateWorkflow(id, {
        name,
        description,
        is_active: isActive,
        input_schema: buildSchemaFromFields(),
        start_step_id: steps.length > 0 ? steps[0].id : undefined,
      });
      setSuccess("Workflow saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStepName.trim()) return;
    try {
      // Filter out empty meta values
      const meta: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(newStepMeta)) {
        if (v.trim()) meta[k] = v.trim();
      }

      await createStep(id, {
        name: newStepName.trim(),
        step_type: newStepType,
        order: steps.length,
        metadata: meta,
      });
      setNewStepName("");
      setNewStepType("task");
      setNewStepMeta({});
      setShowStepForm(false);
      loadWorkflow();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add step");
    }
  };

  const handleUpdateStep = async (stepId: string) => {
    try {
      const meta: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(editStepMeta)) {
        if (v.trim()) meta[k] = v.trim();
      }

      await updateStep(stepId, {
        name: editStepName,
        step_type: editStepType,
        metadata: meta,
      });
      setEditingStep(null);
      loadWorkflow();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update step");
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Delete this step and all its rules?")) return;
    try {
      await deleteStep(stepId);
      loadWorkflow();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete step");
    }
  };

  const startEditStep = (step: Step) => {
    setEditingStep(step.id);
    setEditStepName(step.name);
    setEditStepType(step.step_type);
    setEditStepMeta(metaToRecord(step.metadata || {}));
  };

  // Schema field helpers
  const addSchemaField = () => {
    setSchemaFields([
      ...schemaFields,
      { name: "", type: "string", required: false, allowed_values: "" },
    ]);
  };

  const updateSchemaField = (index: number, key: keyof SchemaField, value: string | boolean) => {
    const updated = [...schemaFields];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[key] = value;
    setSchemaFields(updated);
  };

  const removeSchemaField = (index: number) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index));
  };

  if (loading)
    return <div className="text-center py-12 text-muted">Loading...</div>;
  if (!workflow)
    return (
      <div className="text-center py-12 text-danger">Workflow not found</div>
    );

  return (
    <div>
      <Link
        href={`/workflows/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Back to Workflow
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit: {workflow.name}</h1>
        <button
          onClick={handleSaveWorkflow}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-danger border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 mb-4">
          {success}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white border border-border rounded-lg p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Workflow Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="true">Active &mdash; can be run</option>
              <option value="false">Inactive &mdash; paused</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this workflow do?"
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>
      </div>

      {/* Input Fields (Schema) */}
      <div className="bg-white border border-border rounded-lg p-6 mb-6">
        <button
          onClick={() => setShowSchemaEditor(!showSchemaEditor)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">
              Input Fields ({schemaFields.length})
            </h2>
            <p className="text-xs text-muted mt-0.5">
              What info does someone need to provide when running this workflow?
            </p>
          </div>
          {showSchemaEditor ? (
            <ChevronUp size={20} className="text-muted" />
          ) : (
            <ChevronDown size={20} className="text-muted" />
          )}
        </button>

        {showSchemaEditor && (
          <div className="mt-4 space-y-3">
            {schemaFields.length === 0 ? (
              <div className="py-4 text-center border-2 border-dashed border-border rounded-lg">
                <p className="text-sm text-muted">No input fields defined</p>
              </div>
            ) : (
              schemaFields.map((field, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-border"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          updateSchemaField(index, "name", e.target.value)
                        }
                        placeholder="e.g., amount"
                        className="w-full px-2.5 py-1.5 text-sm border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateSchemaField(index, "type", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-sm border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="string">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Yes / No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Choices (optional)
                      </label>
                      <input
                        type="text"
                        value={field.allowed_values}
                        onChange={(e) =>
                          updateSchemaField(
                            index,
                            "allowed_values",
                            e.target.value
                          )
                        }
                        placeholder="Low, Medium, High"
                        className="w-full px-2.5 py-1.5 text-sm border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateSchemaField(
                              index,
                              "required",
                              e.target.checked
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-xs">Required</span>
                      </label>
                      <button
                        onClick={() => removeSchemaField(index)}
                        className="p-1 text-muted hover:text-danger transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={addSchemaField}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus size={14} />
              Add Field
            </button>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Steps ({steps.length})</h2>
            <p className="text-xs text-muted mt-0.5">
              Steps run in order from top to bottom. Rules on each step can redirect the flow.
            </p>
          </div>
          <button
            onClick={() => {
              setShowStepForm(true);
              setNewStepName("");
              setNewStepType("task");
              setNewStepMeta({});
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus size={14} />
            Add Step
          </button>
        </div>

        {/* New step form */}
        {showStepForm && (
          <div className="p-5 mb-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add a New Step</h3>
              <button
                onClick={() => setShowStepForm(false)}
                className="text-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Step Name
                </label>
                <input
                  type="text"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  placeholder='e.g., "Review Request", "Manager Approval"'
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Step Type
                </label>
                <select
                  value={newStepType}
                  onChange={(e) => {
                    setNewStepType(e.target.value);
                    setNewStepMeta({});
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  {Object.entries(STEP_TYPE_INFO).map(([value, info]) => (
                    <option key={value} value={value}>
                      {info.label} &mdash; {info.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic metadata fields based on step type */}
            {STEP_TYPE_INFO[newStepType]?.metaFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">
                  Details (optional)
                </p>
                {STEP_TYPE_INFO[newStepType].metaFields.map((mf) => (
                  <div key={mf.key}>
                    <label className="block text-xs font-medium mb-1">
                      {mf.label}
                    </label>
                    <input
                      type="text"
                      value={newStepMeta[mf.key] || ""}
                      onChange={(e) =>
                        setNewStepMeta({
                          ...newStepMeta,
                          [mf.key]: e.target.value,
                        })
                      }
                      placeholder={mf.placeholder}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleAddStep}
              disabled={!newStepName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              Add Step
            </button>
          </div>
        )}

        {/* Step list */}
        {steps.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
            <HelpCircle size={28} className="mx-auto text-muted mb-2" />
            <p className="text-muted mb-1">No steps yet</p>
            <p className="text-xs text-muted">
              Add your first step to define what this workflow does
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-border group"
              >
                {/* Step number */}
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                {editingStep === step.id ? (
                  /* Editing mode */
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Step Name
                        </label>
                        <input
                          type="text"
                          value={editStepName}
                          onChange={(e) => setEditStepName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Step Type
                        </label>
                        <select
                          value={editStepType}
                          onChange={(e) => {
                            setEditStepType(e.target.value);
                            setEditStepMeta({});
                          }}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {Object.entries(STEP_TYPE_INFO).map(
                            ([value, info]) => (
                              <option key={value} value={value}>
                                {info.label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Metadata fields */}
                    {STEP_TYPE_INFO[editStepType]?.metaFields.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted uppercase tracking-wider">
                          Details
                        </p>
                        {STEP_TYPE_INFO[editStepType].metaFields.map(
                          (mf) => (
                            <div key={mf.key}>
                              <label className="block text-xs font-medium mb-1">
                                {mf.label}
                              </label>
                              <input
                                type="text"
                                value={editStepMeta[mf.key] || ""}
                                onChange={(e) =>
                                  setEditStepMeta({
                                    ...editStepMeta,
                                    [mf.key]: e.target.value,
                                  })
                                }
                                placeholder={mf.placeholder}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStep(step.id)}
                        className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingStep(null)}
                        className="px-4 py-1.5 text-sm border border-border rounded-lg hover:bg-card-hover transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{step.name}</span>
                        <span className={`badge badge-${step.step_type}`}>
                          {STEP_TYPE_INFO[step.step_type]?.label || step.step_type}
                        </span>
                      </div>
                      {/* Readable metadata */}
                      {step.metadata &&
                        Object.keys(step.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            {Object.entries(step.metadata).map(([k, v]) => (
                              <span key={k} className="text-xs text-muted">
                                <span className="font-medium">
                                  {k.replace(/_/g, " ")}:
                                </span>{" "}
                                {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                    <Link
                      href={`/workflows/${id}/steps/${step.id}/rules`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shrink-0"
                      title="Edit Rules"
                    >
                      <GitBranch size={14} />
                      {step.rules?.length || 0} Rules
                    </Link>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditStep(step)}
                        className="p-1.5 text-muted hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Step"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="p-1.5 text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Step"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom save bar */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveWorkflow}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
