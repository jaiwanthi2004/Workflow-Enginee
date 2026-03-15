import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-3">Welcome to Workflow Engine</h1>
        <p className="text-muted text-lg">
          Build step-by-step processes, set up rules for what happens next, and run them with one click. No coding required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        {/* Card 1 */}
        <Link
          href="/workflows"
          className="bg-white border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/40 transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-xl group-hover:bg-blue-200 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">My Workflows</h2>
          <p className="text-sm text-muted">
            See all your workflows, edit them, or run one.
          </p>
        </Link>

        {/* Card 2 */}
        <Link
          href="/workflows/new"
          className="bg-white border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/40 transition-all group"
        >
          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 text-xl group-hover:bg-green-200 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">Create New</h2>
          <p className="text-sm text-muted">
            Build a new workflow from scratch. Give it a name, add steps, and set up rules.
          </p>
        </Link>

        {/* Card 3 */}
        <Link
          href="/audit"
          className="bg-white border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/40 transition-all group"
        >
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 text-xl group-hover:bg-purple-200 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">Run History</h2>
          <p className="text-sm text-muted">
            See every time a workflow was run, what happened, and whether it succeeded or failed.
          </p>
        </Link>
      </div>

      <div className="text-center text-sm text-muted max-w-lg">
        <p><strong>How it works:</strong> Create a workflow, add steps (like approvals, tasks, or notifications), set rules for when each step should happen, then run it.</p>
      </div>
    </div>
  );
}
