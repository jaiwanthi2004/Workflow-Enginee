"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getExecutions, cancelExecution, retryExecution } from "@/lib/api";
import { Execution } from "@/lib/types";
import {
  Eye,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  History,
} from "lucide-react";

export default function AuditLogPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const pageSize = 20;

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExecutions({
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
      });
      setExecutions(data);
    } catch (err) {
      console.error("Failed to load executions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this execution?")) return;
    try {
      await cancelExecution(id);
      fetchExecutions();
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryExecution(id);
      fetchExecutions();
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-green-600" />;
      case "failed":
        return <XCircle size={16} className="text-red-600" />;
      case "in_progress":
        return <Loader2 size={16} className="text-blue-600 animate-spin" />;
      case "canceled":
        return <AlertCircle size={16} className="text-gray-400" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const statusLabels: Record<string, string> = {
    completed: "Completed",
    failed: "Failed",
    in_progress: "Running",
    pending: "Waiting",
    canceled: "Canceled",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Run History</h1>
        <p className="text-muted text-sm mt-1">
          See every workflow execution and what happened
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-muted">Filter by status:</span>
        <div className="flex gap-1">
          {[
            { value: "", label: "All" },
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Failed" },
            { value: "in_progress", label: "Running" },
            { value: "pending", label: "Waiting" },
            { value: "canceled", label: "Canceled" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-white"
                  : "bg-white border border-border text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Execution cards */}
      {loading ? (
        <div className="text-center py-16 text-muted">Loading history...</div>
      ) : executions.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-lg">
          <History size={40} className="mx-auto text-muted mb-3" />
          <p className="text-lg font-medium mb-1">No executions yet</p>
          <p className="text-muted text-sm">
            Run a workflow to see its history here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map((exec) => (
            <div
              key={exec.id}
              className="bg-white border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Status icon */}
                <StatusIcon status={exec.status} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">
                      {exec.workflow_name || "Unknown Workflow"}
                    </span>
                    <span className={`badge badge-${exec.status}`}>
                      {statusLabels[exec.status] || exec.status}
                    </span>
                    {exec.retries > 0 && (
                      <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">
                        Retried {exec.retries}x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>v{exec.workflow_version}</span>
                    <span>By: {exec.triggered_by}</span>
                    <span>{timeAgo(exec.started_at)}</span>
                    {exec.ended_at && (
                      <span>
                        Duration:{" "}
                        {Math.round(
                          (new Date(exec.ended_at).getTime() -
                            new Date(exec.started_at).getTime()) /
                            1000
                        )}
                        s
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/executions/${exec.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-primary hover:bg-blue-50 border border-border rounded-lg transition-colors"
                  >
                    <Eye size={14} />
                    Details
                  </Link>
                  {exec.status === "failed" && (
                    <button
                      onClick={() => handleRetry(exec.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-50 border border-border rounded-lg transition-colors"
                      title="Retry"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  {(exec.status === "pending" ||
                    exec.status === "in_progress") && (
                    <button
                      onClick={() => handleCancel(exec.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 border border-border rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-end mt-6 gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-2 border border-border rounded-lg hover:bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm px-3">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={executions.length < pageSize}
          className="p-2 border border-border rounded-lg hover:bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
