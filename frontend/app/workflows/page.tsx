"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getWorkflows, deleteWorkflow } from "@/lib/api";
import { Workflow, PaginatedResponse } from "@/lib/types";
import {
  Plus,
  Search,
  Edit,
  Play,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res: PaginatedResponse<Workflow> = await getWorkflows({
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      setWorkflows(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This will also remove all its steps and rules.`
      )
    )
      return;
    try {
      await deleteWorkflow(id);
      fetchWorkflows();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Workflows</h1>
          <p className="text-muted text-sm mt-1">
            All your automated processes in one place
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} />
          Create New Workflow
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Workflow cards */}
      {loading ? (
        <div className="text-center py-16 text-muted">Loading your workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-lg">
          <Layers size={40} className="mx-auto text-muted mb-3" />
          <p className="text-lg font-medium mb-1">No workflows yet</p>
          <p className="text-muted text-sm mb-4">
            Create your first workflow to automate a process
          </p>
          <Link
            href="/workflows/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus size={16} />
            Create Your First Workflow
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="bg-white border border-border rounded-lg p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Left side: name, description, meta */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-3 mb-1">
                    <Link
                      href={`/workflows/${w.id}`}
                      className="text-lg font-semibold text-foreground hover:text-primary transition-colors truncate"
                    >
                      {w.name}
                    </Link>
                    <span
                      className={`badge ${w.is_active ? "badge-active" : "badge-inactive"}`}
                    >
                      {w.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {w.description && (
                    <p className="text-sm text-muted truncate mb-2">
                      {w.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>{w.step_count || 0} steps</span>
                    <span>Version {w.version}</span>
                    <span>Updated {timeAgo(w.updated_at)}</span>
                  </div>
                </div>

                {/* Right side: action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/workflows/${w.id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted hover:text-primary hover:bg-blue-50 border border-border rounded-lg transition-colors"
                  >
                    <Edit size={14} />
                    Edit
                  </Link>
                  <Link
                    href={`/workflows/${w.id}/execute`}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                  >
                    <Play size={14} />
                    Run
                  </Link>
                  <button
                    onClick={() => handleDelete(w.id, w.name)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted hover:text-danger hover:bg-red-50 border border-border rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-muted">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} workflows
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-border rounded-lg hover:bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-border rounded-lg hover:bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
