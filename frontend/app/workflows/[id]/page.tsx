"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWorkflow } from "@/lib/api";
import { Workflow, Step } from "@/lib/types";
import { ArrowLeft, Edit, Play, GitBranch, CheckCircle2 } from "lucide-react";

export default function WorkflowDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getWorkflow(id);
        setWorkflow(data);
      } catch (err) {
        console.error("Failed to load workflow:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading)
    return (
      <div className="text-center py-12 text-muted">Loading workflow...</div>
    );
  if (!workflow)
    return (
      <div className="text-center py-12 text-danger">Workflow not found</div>
    );

  const schema = workflow.input_schema || {};
  const schemaFields = Object.entries(schema);

  const stepTypeLabelMap: Record<string, string> = {
    task: "Task",
    approval: "Approval",
    notification: "Notification",
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

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <span
              className={`badge ${workflow.is_active ? "badge-active" : "badge-inactive"}`}
            >
              {workflow.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-muted mt-1">
            {workflow.description || "No description provided"}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            <span>Version {workflow.version}</span>
            <span>
              Created{" "}
              {new Date(workflow.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/workflows/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-card-hover transition-colors font-medium text-sm"
          >
            <Edit size={16} />
            Edit Workflow
          </Link>
          <Link
            href={`/workflows/${id}/execute`}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            <Play size={16} />
            Run Workflow
          </Link>
        </div>
      </div>

      {/* Input Fields Summary */}
      {schemaFields.length > 0 && (
        <div className="bg-white border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">
            Required Information ({schemaFields.length} fields)
          </h2>
          <p className="text-sm text-muted mb-4">
            When someone runs this workflow, they need to fill in these fields:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schemaFields.map(([fieldName, fieldDef]) => {
              const def = fieldDef as Record<string, unknown>;
              const typeLabel =
                def.type === "number"
                  ? "Number"
                  : def.type === "boolean"
                    ? "Yes/No"
                    : "Text";
              const allowedValues = def.allowed_values as string[] | undefined;
              return (
                <div
                  key={fieldName}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                  <div>
                    <span className="font-medium text-sm">{fieldName}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">{typeLabel}</span>
                      {def.required === true && (
                        <span className="text-xs text-danger font-medium">
                          Required
                        </span>
                      )}
                    </div>
                    {allowedValues && allowedValues.length > 0 && (
                      <p className="text-xs text-muted mt-1">
                        Options: {allowedValues.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Workflow Steps ({workflow.steps?.length || 0})
          </h2>
          <Link
            href={`/workflows/${id}/edit`}
            className="text-sm text-primary hover:underline"
          >
            Edit Steps
          </Link>
        </div>

        {!workflow.steps || workflow.steps.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted mb-2">No steps defined yet</p>
            <Link
              href={`/workflows/${id}/edit`}
              className="text-sm text-primary hover:underline"
            >
              Go to editor to add steps
            </Link>
          </div>
        ) : (
          <div className="space-y-0">
            {workflow.steps.map((step: Step, idx: number) => {
              const isStart = idx === 0;
              const isEnd = idx === workflow.steps!.length - 1;
              return (
                <div key={step.id} className="relative">
                  {/* Connector line */}
                  {idx > 0 && (
                    <div className="absolute left-[19px] -top-1 w-0.5 h-3 bg-border" />
                  )}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-border">
                    {/* Step number circle */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isStart
                          ? "bg-primary text-white"
                          : isEnd
                            ? "bg-green-100 text-green-700"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isEnd ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{step.name}</span>
                        <span className={`badge badge-${step.step_type}`}>
                          {stepTypeLabelMap[step.step_type] || step.step_type}
                        </span>
                        {isStart && (
                          <span className="text-xs text-primary font-medium">
                            Start
                          </span>
                        )}
                      </div>
                      {/* Metadata displayed as readable key-value */}
                      {step.metadata &&
                        Object.keys(step.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {Object.entries(step.metadata).map(
                              ([k, v]) => (
                                <span
                                  key={k}
                                  className="text-xs text-muted"
                                >
                                  <span className="font-medium">{k}:</span>{" "}
                                  {String(v)}
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </div>
                    <Link
                      href={`/workflows/${id}/steps/${step.id}/rules`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors shrink-0"
                    >
                      <GitBranch size={12} />
                      {step.rules?.length || 0} Rules
                    </Link>
                  </div>
                  {/* Connector line after */}
                  {!isEnd && (
                    <div className="ml-[19px] w-0.5 h-3 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
