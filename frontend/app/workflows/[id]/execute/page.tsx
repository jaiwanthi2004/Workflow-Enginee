"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWorkflow, executeWorkflow } from "@/lib/api";
import { Workflow, Execution, ExecutionLog } from "@/lib/types";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";

export default function ExecuteWorkflowPage() {
  const params = useParams();
  const id = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [inputData, setInputData] = useState<Record<string, string>>({});
  const [triggeredBy, setTriggeredBy] = useState("ui-user");
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getWorkflow(id);
        setWorkflow(data);
        // Initialize input fields from schema
        const schema = data.input_schema || {};
        const initial: Record<string, string> = {};
        for (const key of Object.keys(schema)) {
          initial[key] = "";
        }
        setInputData(initial);
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleExecute = async () => {
    setExecuting(true);
    setError("");
    setExecution(null);
    try {
      const data: Record<string, unknown> = { ...inputData };
      // Type coerce based on schema
      const schema = workflow?.input_schema || {};
      for (const [key, def] of Object.entries(schema)) {
        const fieldDef = def as Record<string, unknown>;
        if (fieldDef.type === "number" && data[key]) {
          data[key] = Number(data[key]);
        } else if (fieldDef.type === "boolean" && data[key]) {
          data[key] = data[key] === "true";
        }
      }

      const result = await executeWorkflow(id, {
        data,
        triggered_by: triggeredBy || "ui-user",
      });
      setExecution(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={20} className="text-green-600" />;
      case "failed":
        return <XCircle size={20} className="text-red-600" />;
      case "in_progress":
        return <Loader2 size={20} className="text-blue-600 animate-spin" />;
      case "canceled":
        return <AlertCircle size={20} className="text-gray-500" />;
      default:
        return <Clock size={20} className="text-yellow-600" />;
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      completed: "Completed Successfully",
      failed: "Failed",
      in_progress: "Running...",
      pending: "Waiting",
      canceled: "Canceled",
    };
    return map[status] || status;
  };

  if (loading)
    return <div className="text-center py-12 text-muted">Loading...</div>;
  if (!workflow)
    return (
      <div className="text-center py-12 text-danger">Workflow not found</div>
    );

  const schema = workflow.input_schema || {};
  const schemaFields = Object.entries(schema);

  return (
    <div>
      <Link
        href={`/workflows/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Back to Workflow
      </Link>

      <h1 className="text-2xl font-bold mb-1">Run: {workflow.name}</h1>
      <p className="text-muted text-sm mb-6">
        Fill in the information below and click Run to start this workflow.
      </p>

      {error && (
        <div className="bg-red-50 text-danger border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Input Form */}
      {!execution && (
        <div className="bg-white border border-border rounded-lg p-6 mb-6">
          {schemaFields.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted mb-2">
                This workflow has no input fields defined.
              </p>
              <p className="text-xs text-muted">
                It will run with default/empty data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Fill in the details</h2>
              {schemaFields.map(([key, def]) => {
                const fieldDef = def as Record<string, unknown>;
                const allowedValues = fieldDef.allowed_values as
                  | string[]
                  | undefined;
                const typeLabel =
                  fieldDef.type === "number"
                    ? "Enter a number"
                    : fieldDef.type === "boolean"
                      ? "Select yes or no"
                      : "Enter text";

                return (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5">
                      {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      {fieldDef.required === true && (
                        <span className="text-danger ml-1">*</span>
                      )}
                    </label>
                    {allowedValues ? (
                      <select
                        value={inputData[key] || ""}
                        onChange={(e) =>
                          setInputData({
                            ...inputData,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Choose one...</option>
                        {allowedValues.map((v: string) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : fieldDef.type === "boolean" ? (
                      <select
                        value={inputData[key] || ""}
                        onChange={(e) =>
                          setInputData({
                            ...inputData,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Choose...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={fieldDef.type === "number" ? "number" : "text"}
                        value={inputData[key] || ""}
                        onChange={(e) =>
                          setInputData({
                            ...inputData,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder={typeLabel}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Triggered by */}
          <div className="mt-4 pt-4 border-t border-border">
            <label className="block text-xs font-medium text-muted mb-1">
              Your name (who is running this?)
            </label>
            <input
              type="text"
              value={triggeredBy}
              onChange={(e) => setTriggeredBy(e.target.value)}
              className="w-48 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your name"
            />
          </div>

          <div className="mt-6">
            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 text-base"
            >
              {executing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Play size={18} />
              )}
              {executing ? "Running..." : "Run Workflow"}
            </button>
          </div>
        </div>
      )}

      {/* Execution Results */}
      {execution && (
        <div className="space-y-6">
          {/* Overall status banner */}
          <div
            className={`rounded-lg p-5 border ${
              execution.status === "completed"
                ? "bg-green-50 border-green-200"
                : execution.status === "failed"
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon status={execution.status} />
              <span className="text-lg font-semibold">
                {statusLabel(execution.status)}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <span>
                Started:{" "}
                {new Date(execution.started_at).toLocaleString()}
              </span>
              {execution.ended_at && (
                <span>
                  Ended:{" "}
                  {new Date(execution.ended_at).toLocaleString()}
                </span>
              )}
              <span>By: {execution.triggered_by}</span>
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setExecution(null)}
                className="px-4 py-2 text-sm font-medium border border-border bg-white rounded-lg hover:bg-card-hover transition-colors"
              >
                Run Again
              </button>
              <Link
                href={`/executions/${execution.id}`}
                className="px-4 py-2 text-sm font-medium text-primary hover:underline"
              >
                View Full Details
              </Link>
            </div>
          </div>

          {/* Step timeline */}
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              What happened (step by step)
            </h2>
            <div className="space-y-0">
              {execution.logs.map((log: ExecutionLog, idx: number) => {
                const isLast = idx === execution.logs.length - 1;
                return (
                  <div key={idx} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          log.status === "completed"
                            ? "bg-green-100"
                            : log.status === "failed"
                              ? "bg-red-100"
                              : "bg-blue-100"
                        }`}
                      >
                        {log.status === "completed" ? (
                          <CheckCircle2
                            size={16}
                            className="text-green-600"
                          />
                        ) : log.status === "failed" ? (
                          <XCircle size={16} className="text-red-600" />
                        ) : (
                          <Clock size={16} className="text-blue-600" />
                        )}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-full min-h-[24px] bg-border" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pb-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.step_name}</span>
                        <span className={`badge badge-${log.step_type}`}>
                          {log.step_type}
                        </span>
                        {log.duration_ms !== undefined && (
                          <span className="text-xs text-muted ml-auto">
                            {log.duration_ms}ms
                          </span>
                        )}
                      </div>

                      {log.action && (
                        <p className="text-sm text-gray-700 mb-1">
                          {log.action}
                        </p>
                      )}

                      {log.error && (
                        <p className="text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded mb-1">
                          {log.error}
                        </p>
                      )}

                      {log.approver && (
                        <p className="text-xs text-muted">
                          Approver: {log.approver}
                        </p>
                      )}

                      {log.matched_condition && (
                        <p className="text-xs text-muted mt-1">
                          Decision: {log.matched_condition === "DEFAULT" ? "Used default path" : log.matched_condition}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Technical details (hidden by default) */}
            {execution.logs.some(
              (l) => l.rule_evaluations && l.rule_evaluations.length > 0
            ) && (
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showTechnical ? "rotate-180" : ""}`}
                  />
                  {showTechnical
                    ? "Hide technical details"
                    : "Show technical details (rule evaluations)"}
                </button>

                {showTechnical && (
                  <div className="mt-3 space-y-3">
                    {execution.logs
                      .filter(
                        (l) =>
                          l.rule_evaluations &&
                          l.rule_evaluations.length > 0
                      )
                      .map((log, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-xs text-muted mb-1">
                            {log.step_name}
                          </p>
                          <div className="space-y-1">
                            {log.rule_evaluations!.map((ev, i) => (
                              <div
                                key={i}
                                className={`text-xs px-2.5 py-1.5 rounded ${
                                  ev.result
                                    ? "bg-green-50 text-green-800"
                                    : "bg-gray-50 text-gray-500"
                                }`}
                              >
                                <code>{ev.condition}</code> ={" "}
                                <strong>
                                  {ev.result ? "TRUE" : "FALSE"}
                                </strong>
                                {ev.error && (
                                  <span className="text-red-600 ml-2">
                                    ({ev.error})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
