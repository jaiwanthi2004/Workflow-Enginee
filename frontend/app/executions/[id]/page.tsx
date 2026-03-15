"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getExecution, cancelExecution, retryExecution } from "@/lib/api";
import { Execution, ExecutionLog } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

export default function ExecutionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTechnical, setShowTechnical] = useState(false);
  const [showInputData, setShowInputData] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getExecution(id);
        setExecution(data);
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCancel = async () => {
    try {
      await cancelExecution(id);
      const data = await getExecution(id);
      setExecution(data);
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const handleRetry = async () => {
    try {
      const data = await retryExecution(id);
      setExecution(data);
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  const StatusIcon = ({ status, size = 20 }: { status: string; size?: number }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={size} className="text-green-600" />;
      case "failed":
        return <XCircle size={size} className="text-red-600" />;
      case "in_progress":
        return <Loader2 size={size} className="text-blue-600 animate-spin" />;
      case "canceled":
        return <AlertCircle size={size} className="text-gray-500" />;
      default:
        return <Clock size={size} className="text-yellow-600" />;
    }
  };

  const statusLabel: Record<string, string> = {
    completed: "Completed Successfully",
    failed: "Failed",
    in_progress: "Running...",
    pending: "Waiting to Start",
    canceled: "Canceled",
  };

  if (loading)
    return <div className="text-center py-12 text-muted">Loading...</div>;
  if (!execution)
    return (
      <div className="text-center py-12 text-danger">Execution not found</div>
    );

  return (
    <div>
      <Link
        href="/audit"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Back to History
      </Link>

      {/* Status banner */}
      <div
        className={`rounded-lg p-5 border mb-6 ${
          execution.status === "completed"
            ? "bg-green-50 border-green-200"
            : execution.status === "failed"
              ? "bg-red-50 border-red-200"
              : execution.status === "canceled"
                ? "bg-gray-50 border-gray-200"
                : "bg-blue-50 border-blue-200"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon status={execution.status} />
              <h1 className="text-xl font-bold">
                {statusLabel[execution.status] || execution.status}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted">
              <span>
                Workflow: <strong>{execution.workflow_name || "Unknown"}</strong>
              </span>
              <span>Version {execution.workflow_version}</span>
              <span>By: {execution.triggered_by}</span>
              {execution.retries > 0 && (
                <span className="text-yellow-700">
                  Retried {execution.retries} time(s)
                </span>
              )}
            </div>
            <div className="flex gap-6 text-xs text-muted mt-2">
              <span>
                Started: {new Date(execution.started_at).toLocaleString()}
              </span>
              {execution.ended_at && (
                <span>
                  Ended: {new Date(execution.ended_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {execution.status === "failed" && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <RotateCcw size={14} />
                Retry
              </button>
            )}
            {(execution.status === "pending" ||
              execution.status === "in_progress") && (
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XCircle size={14} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input data (collapsible) */}
      <div className="bg-white border border-border rounded-lg mb-6">
        <button
          onClick={() => setShowInputData(!showInputData)}
          className="flex items-center justify-between w-full p-4 text-left"
        >
          <h2 className="text-base font-semibold">Input Data</h2>
          <ChevronDown
            size={18}
            className={`text-muted transition-transform ${showInputData ? "rotate-180" : ""}`}
          />
        </button>
        {showInputData && (
          <div className="px-4 pb-4">
            {Object.keys(execution.data).length === 0 ? (
              <p className="text-sm text-muted">No input data</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(execution.data).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs font-medium text-muted block mb-0.5">
                      {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-sm font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step timeline */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          Step-by-Step Log ({execution.logs.length} steps)
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
                    <StatusIcon status={log.status} size={16} />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-full min-h-[24px] bg-border" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{log.step_name}</span>
                    {log.step_type && (
                      <span className={`badge badge-${log.step_type}`}>
                        {log.step_type}
                      </span>
                    )}
                    {log.retry && (
                      <span className="badge bg-yellow-100 text-yellow-800">
                        RETRY
                      </span>
                    )}
                    {log.duration_ms !== undefined && (
                      <span className="text-xs text-muted ml-auto">
                        {log.duration_ms}ms
                      </span>
                    )}
                  </div>

                  {log.action && (
                    <p className="text-sm text-gray-700 mb-1">{log.action}</p>
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
                      Decision:{" "}
                      {log.matched_condition === "DEFAULT"
                        ? "Used default path"
                        : log.matched_condition}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Technical details */}
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
                : "Show rule evaluation details"}
            </button>

            {showTechnical && (
              <div className="mt-3 space-y-3">
                {execution.logs
                  .filter(
                    (l) =>
                      l.rule_evaluations && l.rule_evaluations.length > 0
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
  );
}
