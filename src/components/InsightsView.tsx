import { useStore } from "../lib/store";
import type { Category } from "../lib/types";
import { catColor } from "./ui";

export function InsightsView({ onEditRules }: { onEditRules: () => void }) {
  const { state } = useStore();
  const subs = state.submissions;
  const lib = state.library;

  const ruleText = (id: string) =>
    lib.terms.find((t) => t.id === id)?.reason ??
    lib.facts.find((f) => f.id === id)?.statement ??
    lib.styles.find((s) => s.id === id)?.text ??
    (id === "F-none" ? "Numbers and superlatives must come from an approved fact" : id === lib.visual.id ? "Brand palette" : id === "A-03" ? "Images need alt text" : id === "A-04" ? "Image contrast" : id);

  const allIssues = subs.flatMap((s) => s.issueLog);
  const checked = subs.filter((s) => s.issueLog.length > 0 || s.result).length;
  const fixes = subs.reduce((a, s) => a + s.fixesAccepted.length, 0);
  const approved = subs.filter((s) => s.status === "approved").length;
  const inReview = subs.filter((s) => s.status === "in_review").length;

  const byCat = new Map<Category, number>();
  allIssues.forEach((i) => byCat.set(i.category, (byCat.get(i.category) ?? 0) + 1));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...cats.map((c) => c[1]));

  const byRule = new Map<string, Set<string>>();
  subs.forEach((s) => s.issueLog.forEach((i) => byRule.set(i.ruleId, (byRule.get(i.ruleId) ?? new Set()).add(s.id))));
  const repeat = [...byRule.entries()].map(([id, set]) => [id, set.size] as const).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Guideline clarity: rules people keep disputing are probably unclear.
  const disputes = new Map<string, { n: number; reasons: string[] }>();
  subs.forEach((s) =>
    Object.values(s.disputes).forEach((d) => {
      const e = disputes.get(d.ruleId) ?? { n: 0, reasons: [] };
      e.n++;
      e.reasons.push(d.reason);
      disputes.set(d.ruleId, e);
    }),
  );
  const overrides = subs.flatMap((s) => s.audit).filter((a) => a.action === "Approved with override").length;
  const unclear = [...disputes.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].n - a[1].n);
  const otherDisputes = [...disputes.entries()].filter(([, v]) => v.n < 2);

  const byAuthor = new Map<string, number>();
  subs.forEach((s) => byAuthor.set(s.author, (byAuthor.get(s.author) ?? 0) + s.issueLog.length));

  const expiring = lib.facts.filter((f) => {
    if (!f.expires) return false;
    const d = (new Date(f.expires).getTime() - Date.now()) / 864e5;
    return d <= 30;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi n={checked} label="pieces checked" />
        <Kpi n={allIssues.length} label="issues caught before publishing" />
        <Kpi n={fixes} label="fixes accepted" />
        <Kpi n={approved} label="approved" />
        <Kpi n={inReview} label="waiting for review" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold">Issues by type</h3>
          <p className="mb-3 text-xs text-slate-500">Every issue raised across all content, first draft onwards.</p>
          {cats.length === 0 && <p className="text-sm text-slate-500">Run a check to see data here.</p>}
          <ul className="space-y-2">
            {cats.map(([c, n]) => (
              <li key={c} className="grid grid-cols-[120px_1fr_32px] items-center gap-2 text-sm">
                <span>{c}</span>
                <span className="h-3 rounded-full bg-slate-100">
                  <span className="block h-3 rounded-full" style={{ width: `${(n / maxCat) * 100}%`, background: catColor[c] }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold">Repeated mistakes</h3>
          <p className="mb-3 text-xs text-slate-500">Rules broken in the most pieces of content. Good topics for creator training.</p>
          <ol className="space-y-2">
            {repeat.map(([id, n]) => (
              <li key={id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 font-mono text-xs text-slate-500">{id}</span>
                <span className="flex-1">{ruleText(id)}</span>
                <span className="whitespace-nowrap font-semibold">{n} piece{n > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="card border-amber-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Guideline clarity alerts</h3>
            <p className="text-xs text-slate-500">Rules disputed by creators 2 or more times are probably unclear. Consider rewording them.</p>
          </div>
          <button className="text-sm font-medium text-brand-600 hover:underline" onClick={onEditRules}>
            Edit rules in the Brand Library →
          </button>
        </div>
        {unclear.length === 0 && <p className="mt-3 text-sm text-slate-500">No rule has been disputed twice yet.</p>}
        <ul className="mt-3 space-y-3">
          {unclear.map(([id, v]) => (
            <li key={id} className="rounded-lg bg-amber-50 p-3 text-sm">
              <div>
                <span className="font-mono text-xs text-amber-800">{id}</span> <b>{ruleText(id)}</b>
                <span className="ml-2 rounded-full bg-amber-200 px-2 text-xs font-semibold text-amber-900">disputed {v.n}×</span>
              </div>
              <ul className="mt-1 list-disc pl-5 text-slate-700">
                {v.reasons.map((r, i) => (
                  <li key={i}>“{r}”</li>
                ))}
              </ul>
              <div className="mt-1 text-xs text-amber-900">Suggestion: say when the rule applies (for example, app vs shop) or add an exception.</div>
            </li>
          ))}
        </ul>
        {otherDisputes.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">Also disputed once: {otherDisputes.map(([id]) => id).join(", ")}.</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Issues by author</h3>
          <ul className="space-y-1 text-sm">
            {[...byAuthor.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => (
              <li key={a} className="flex justify-between">
                <span>{a}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Facts expiring or expired</h3>
          {expiring.length === 0 ? (
            <p className="text-sm text-slate-500">All facts are current.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {expiring.map((f) => (
                <li key={f.id}>
                  <span className="font-mono text-xs">{f.id}</span> {f.statement} <span className="text-xs text-red-700">({f.expires})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Human oversight</h3>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between"><span>Findings disputed by creators</span><b>{[...disputes.values()].reduce((a, v) => a + v.n, 0)}</b></li>
            <li className="flex justify-between"><span>Approvals with override</span><b>{overrides}</b></li>
            <li className="flex justify-between"><span>Changes requested</span><b>{subs.filter((s) => s.status === "changes_requested").length}</b></li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-slate-400">Includes 3 sample pieces of content so the dashboard isn't empty. Use “Reset demo” to start over.</p>
    </div>
  );
}

function Kpi({ n, label }: { n: number; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-3xl font-semibold tabular-nums">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
