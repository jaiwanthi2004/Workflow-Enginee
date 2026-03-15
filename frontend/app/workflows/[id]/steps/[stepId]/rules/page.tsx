"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getWorkflow,
} from "@/lib/api";
import { Rule, Step, Workflow } from "@/lib/types";
import { ArrowLeft, Plus, Trash2, X, Save, HelpCircle } from "lucide-react";

export default function StepRulesPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const stepId = params.stepId as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [allSteps, setAllSteps] = useState<Step[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New rule form
  const [showForm, setShowForm] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [newNextStepId, setNewNextStepId] = useState<string>("");
  const [newPriority, setNewPriority] = useState(0);

  // Edit rule
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editCondition, setEditCondition] = useState("");
  const [editNextStepId, setEditNextStepId] = useState<string>("");
  const [editPriority, setEditPriority] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [wfData, rulesData] = await Promise.all([
        getWorkflow(workflowId),
        getRules(stepId),
      ]);
      setWorkflow(wfData);
      setAllSteps(wfData.steps || []);
      const step = (wfData.steps || []).find((s: Step) => s.id === stepId);
      setCurrentStep(step || null);
      setRules(rulesData);
    } catch (err) {
      console.error("Failed to load:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [workflowId, stepId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRule = async () => {
    if (!newCondition.trim()) {
      setError("Enter a condition first");
      return;
    }
    setError("");
    try {
      await createRule(stepId, {
        condition: newCondition.trim(),
        next_step_id: newNextStepId || null,
        priority: newPriority,
      });
      setNewCondition("");
      setNewNextStepId("");
      setNewPriority(rules.length);
      setShowForm(false);
      setSuccess("Rule added!");
      setTimeout(() => setSuccess(""), 3000);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add rule");
    }
  };

  const handleUpdateRule = async (ruleId: string) => {
    setError("");
    try {
      await updateRule(ruleId, {
        condition: editCondition,
        next_step_id: editNextStepId || null,
        priority: editPriority,
      });
      setEditingRule(null);
      setSuccess("Rule updated!");
      setTimeout(() => setSuccess(""), 3000);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await deleteRule(ruleId);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const startEdit = (rule: Rule) => {
    setEditingRule(rule.id);
    setEditCondition(rule.condition);
    setEditNextStepId(rule.next_step_id || "");
    setEditPriority(rule.priority);
  };

  const handleReorder = async (ruleId: string, direction: "up" | "down") => {
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= rules.length) return;

    try {
      await Promise.all([
        updateRule(rules[idx].id, { priority: rules[swapIdx].priority }),
        updateRule(rules[swapIdx].id, { priority: rules[idx].priority }),
      ]);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  if (loading)
    return <div className="text-center py-12 text-muted">Loading...</div>;

  const stepTypeLabel: Record<string, string> = {
    task: "Task",
    approval: "Approval",
    notification: "Notification",
  };

  return (
    <div>
      <Link
        href={`/workflows/${workflowId}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Back to Workflow Editor
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Rules for: {currentStep?.name || "Step"}
          </h1>
          <p className="text-muted text-sm mt-1">
            {workflow?.name} &middot;{" "}
            <span className={`badge badge-${currentStep?.step_type}`}>
              {stepTypeLabel[currentStep?.step_type || ""] || currentStep?.step_type}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setNewPriority(rules.length);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          Add Rule
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

      {/* How rules work */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 mb-2">
          <strong>How rules work:</strong> After this step runs, rules are checked in order (top to bottom). The first rule that matches decides what happens next.
        </p>
        <div className="text-xs text-blue-700 space-y-1">
          <p>
            <strong>Conditions:</strong> Compare input values like{" "}
            <code className="bg-blue-100 px-1 rounded">amount &gt; 100</code>,{" "}
            <code className="bg-blue-100 px-1 rounded">priority == &apos;High&apos;</code>, or{" "}
            <code className="bg-blue-100 px-1 rounded">amount &gt; 50 &amp;&amp; country == &apos;US&apos;</code>
          </p>
          <p>
            <strong>DEFAULT:</strong> Use{" "}
            <code className="bg-blue-100 px-1 rounded">DEFAULT</code> as a catch-all
            &mdash; it matches when no other rule does
          </p>
          <p>
            <strong>End Workflow:</strong> Set the &ldquo;Then go to&rdquo; to &ldquo;End
            Workflow&rdquo; to stop the flow
          </p>
        </div>
      </div>

      {/* Add Rule Form */}
      {showForm && (
        <div className="bg-white border border-primary/30 rounded-lg p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add a New Rule</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                If this condition is true...
              </label>
              <input
                type="text"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="e.g., amount > 100  or  priority == 'High'  or  DEFAULT"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Then go to...
              </label>
              <select
                value={newNextStepId}
                onChange={(e) => setNewNextStepId(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">End Workflow (stop here)</option>
                {allSteps
                  .filter((s) => s.id !== stepId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({stepTypeLabel[s.step_type] || s.step_type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <div className="w-24">
                <label className="block text-xs font-medium mb-1 text-muted">
                  Check order
                </label>
                <input
                  type="number"
                  value={newPriority}
                  onChange={(e) => setNewPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted pb-2">
                Lower numbers are checked first. Put DEFAULT rules last.
              </p>
            </div>
          </div>
          <button
            onClick={handleAddRule}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-10 text-center">
          <HelpCircle size={32} className="mx-auto text-muted mb-2" />
          <p className="text-muted mb-1">No rules defined yet</p>
          <p className="text-xs text-muted">
            Without rules, the workflow will follow the default step order.
            Add rules to control branching and decision-making.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div
              key={rule.id}
              className="bg-white border border-border rounded-lg p-4 group"
            >
              {editingRule === rule.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      If this condition is true...
                    </label>
                    <input
                      type="text"
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Then go to...
                    </label>
                    <select
                      value={editNextStepId}
                      onChange={(e) => setEditNextStepId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">End Workflow</option>
                      {allSteps
                        .filter((s) => s.id !== stepId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium mb-1 text-muted">
                      Check order
                    </label>
                    <input
                      type="number"
                      value={editPriority}
                      onChange={(e) =>
                        setEditPriority(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateRule(rule.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingRule(null)}
                      className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-card-hover transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-center gap-4">
                  {/* Order number */}
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-muted shrink-0">
                    {idx + 1}
                  </div>

                  {/* Rule content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-muted">IF</span>
                      <code className="text-sm bg-gray-100 px-2.5 py-1 rounded font-mono">
                        {rule.condition}
                      </code>
                      <span className="text-sm font-medium text-muted">THEN</span>
                      <span className="text-sm font-medium">
                        {rule.next_step_id ? (
                          <>
                            go to{" "}
                            <span className="text-primary">
                              {allSteps.find((s) => s.id === rule.next_step_id)
                                ?.name || "Unknown Step"}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted italic">
                            End Workflow
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleReorder(rule.id, "up")}
                      disabled={idx === 0}
                      className="p-1.5 text-muted hover:text-foreground hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Move up"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReorder(rule.id, "down")}
                      disabled={idx === rules.length - 1}
                      className="p-1.5 text-muted hover:text-foreground hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Move down"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-1.5 text-muted hover:text-primary hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
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
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-muted hover:text-danger hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
