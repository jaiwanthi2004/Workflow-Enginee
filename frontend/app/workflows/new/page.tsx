"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkflow } from "@/lib/api";
import { ArrowLeft, Plus, X, HelpCircle } from "lucide-react";
import Link from "next/link";

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  allowed_values: string;
}

const FIELD_TYPE_LABELS: Record<string, { label: string; hint: string }> = {
  string: { label: "Text", hint: "Words, names, emails, etc." },
  number: { label: "Number", hint: "Amounts, counts, percentages, etc." },
  boolean: { label: "Yes / No", hint: "True or false toggle" },
};

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addField = () => {
    setFields([
      ...fields,
      { name: "", type: "string", required: false, allowed_values: "" },
    ]);
  };

  const updateField = (
    index: number,
    key: keyof SchemaField,
    value: string | boolean
  ) => {
    const updated = [...fields];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[key] = value;
    setFields(updated);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const buildInputSchema = () => {
    const schema: Record<string, unknown> = {};
    for (const f of fields) {
      if (!f.name) continue;
      const fieldDef: Record<string, unknown> = {
        type: f.type,
        required: f.required,
      };
      if (f.allowed_values.trim()) {
        fieldDef.allowed_values = f.allowed_values
          .split(",")
          .map((v) => v.trim());
      }
      schema[f.name] = fieldDef;
    }
    return schema;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your workflow a name first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const workflow = await createWorkflow({
        name: name.trim(),
        description: description.trim(),
        input_schema: buildInputSchema(),
      });
      router.push(`/workflows/${workflow.id}/edit`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create workflow"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link
        href="/workflows"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Back to My Workflows
      </Link>

      <h1 className="text-2xl font-bold mb-1">Create a New Workflow</h1>
      <p className="text-muted text-sm mb-6">
        A workflow is a step-by-step process you want to automate. Start by giving it a name, then you can add steps.
      </p>

      {error && (
        <div className="bg-red-50 text-danger border border-red-200 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Info */}
        <div className="bg-white border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h2 className="text-lg font-semibold">Name your workflow</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Workflow Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "Expense Approval", "New Hire Onboarding"'
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description{" "}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do? e.g., Routes expense reports for approval based on amount"
              rows={2}
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Step 2: Input Fields */}
        <div className="bg-white border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  What info does this workflow need?
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  These are the fields someone fills in when they run this
                  workflow. You can skip this for now.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus size={14} />
              Add a Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-border rounded-lg">
              <HelpCircle
                size={28}
                className="mx-auto text-muted mb-2"
              />
              <p className="text-sm text-muted mb-1">
                No input fields yet
              </p>
              <p className="text-xs text-muted">
                For example, an Expense Approval might need:{" "}
                <span className="font-medium">amount</span> (Number),{" "}
                <span className="font-medium">department</span> (Text),{" "}
                <span className="font-medium">priority</span> (Text with
                choices: Low, Medium, High)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Field {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-1 text-muted hover:text-danger transition-colors rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Field name */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          updateField(index, "name", e.target.value)
                        }
                        placeholder='e.g., "amount", "department"'
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {/* Field type */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Type of Data
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Object.entries(FIELD_TYPE_LABELS).map(
                          ([value, { label, hint }]) => (
                            <option key={value} value={value}>
                              {label} &mdash; {hint}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    {/* Choices (allowed values) */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Choices{" "}
                        <span className="font-normal text-muted">
                          (optional, comma-separated)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={field.allowed_values}
                        onChange={(e) =>
                          updateField(
                            index,
                            "allowed_values",
                            e.target.value
                          )
                        }
                        placeholder='e.g., "Low, Medium, High"'
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-xs text-muted mt-1">
                        Leave blank to allow any value
                      </p>
                    </div>
                    {/* Required toggle */}
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(
                              index,
                              "required",
                              e.target.checked
                            )
                          }
                          className="rounded border-border"
                        />
                        <span className="text-sm">
                          This field is required
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            After creating, you'll be taken to the editor where you can add steps and rules.
          </p>
          <div className="flex gap-3">
            <Link
              href="/workflows"
              className="px-4 py-2.5 border border-border rounded-lg hover:bg-card-hover transition-colors text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
