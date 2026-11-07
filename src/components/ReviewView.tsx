import { useState } from "react";
import { blockers, REVIEWER, useStore } from "../lib/store";
import type { Status, Submission } from "../lib/types";
import { Banner } from "./CreatorView";
import { FindingCard } from "./FindingCard";
import { Button, Comments, Empty, Highlighted, History, StatusBadge, timeAgo } from "./ui";

const FILTERS: [Status, string][] = [
  ["in_review", "Waiting for review"],
  ["changes_requested", "Changes requested"],
  ["approved", "Approved"],
];

export function ReviewView({ selected, onSelect, onGoCreator }: { selected: string | null; onSelect: (id: string) => void; onGoCreator: (id: string) => void }) {
  const { state } = useStore();
  const [filter, setFilter] = useState<Status>("in_review");
  const list = state.submissions.filter((s) => s.status === filter);
  const sub = state.submissions.find((s) => s.id === selected && s.status !== "draft") ?? list[0] ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([k, label]) => {
            const n = state.submissions.filter((s) => s.status === k).length;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
              >
                {label} ({n})
              </button>
            );
          })}
        </div>
        {list.length === 0 && <p className="px-1 pt-2 text-sm text-slate-500">Nothing here.</p>}
        <ul className="space-y-1.5 pt-1">
          {list.map((s) => {
            const routed = new Set((s.result?.findings ?? []).filter((f) => f.owner).map((f) => f.owner!));
            return (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${s.id === sub?.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {s.author} · {s.channel} · {timeAgo(s.updatedAt)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    <span className="rounded bg-slate-100 px-1.5">{s.result?.findings.length ?? 0} open</span>
                    {Object.keys(s.disputes).length > 0 && <span className="rounded bg-amber-100 px-1.5 text-amber-800">{Object.keys(s.disputes).length} disputed</span>}
                    {[...routed].map((o) => (
                      <span key={o} className="rounded bg-indigo-50 px-1.5 text-indigo-700">
                        {o}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section>{sub ? <Detail key={sub.id} s={sub} onGoCreator={onGoCreator} /> : <Empty title="No content waiting for review">Submit a draft from “Create &amp; check” and it will appear here.</Empty>}</section>
    </div>
  );
}

function Detail({ s, onGoCreator }: { s: Submission; onGoCreator: (id: string) => void }) {
  const { decide, comment } = useStore();
  const [note, setNote] = useState("");
  const [override, setOverride] = useState(false);
  const [active, setActive] = useState<string>();
  const findings = s.result?.findings ?? [];
  const disputed = findings.filter((f) => s.disputes[f.key]);
  const open = findings.filter((f) => !s.disputes[f.key]);
  const highOpen = blockers(s);
  const needsOverride = highOpen.length > 0 || disputed.some((f) => f.severity === "high");
  const owners = [...new Set(findings.filter((f) => f.owner).map((f) => f.owner!))];
  const canDecide = s.status === "in_review";

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="text-sm text-slate-500">
              {s.channel} · by {s.author} · v{s.versions.length || 1} · submitted {timeAgo(s.updatedAt)}
            </p>
          </div>
          <StatusBadge s={s.status} />
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <Highlighted text={s.content} findings={findings} disputed={s.disputes} active={active} onPick={(k) => {
            setActive(k);
            document.getElementById(`f-${k}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }} />
        </div>
        {s.image && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <img src={s.image.dataUrl} alt={s.image.alt || "Attached image"} className="h-20 rounded-lg border" />
            <span className="text-slate-600">Alt text: {s.image.alt ? `“${s.image.alt}”` : <em>none</em>}</span>
          </div>
        )}
        {s.result && s.result.verified.length > 0 && (
          <p className="mt-3 text-sm text-emerald-700">
            ✓ {s.result.verified.length} claim{s.result.verified.length > 1 ? "s" : ""} verified against approved facts ({[...new Set(s.result.verified.map((v) => v.factId))].join(", ")}).
          </p>
        )}
      </div>

      {owners.length > 0 && (
        <Banner tone="indigo">
          <span>
            <b>Routed for sign-off:</b> {owners.join(", ")}. These owners are responsible for the claims and facts flagged below.
          </span>
        </Banner>
      )}

      {disputed.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Disputed by the creator ({disputed.length}): your decision needed</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {disputed.map((f) => (
              <FindingCard key={f.key} f={f} dispute={s.disputes[f.key]} editable={false} active={active === f.key} onLocate={() => setActive(f.key)} />
            ))}
          </div>
        </div>
      )}

      {open.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Still open ({open.length})</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {open.map((f) => (
              <FindingCard key={f.key + f.start} f={f} editable={false} active={active === f.key} onLocate={() => setActive(f.key)} />
            ))}
          </div>
        </div>
      )}

      {findings.length === 0 && <Banner tone="emerald">The latest version has no open issues.</Banner>}

      {canDecide ? (
        <div className="card space-y-3 border-slate-300 p-4">
          <div className="font-semibold">Your decision</div>
          <textarea className="input" rows={2} placeholder="Comment for the creator (required when requesting changes)" value={note} onChange={(e) => setNote(e.target.value)} />
          {needsOverride && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1" checked={override} onChange={(e) => setOverride(e.target.checked)} />
              <span>
                I have reviewed the {highOpen.length + disputed.filter((f) => f.severity === "high").length} high-severity item(s) above and accept publishing them as they are. This override is recorded in the audit trail.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="success" disabled={needsOverride && !override} onClick={() => decide(s.id, "approved", note, needsOverride)}>
              Approve for publishing
            </Button>
            <Button variant="danger" disabled={!note.trim()} onClick={() => decide(s.id, "changes_requested", note, false)}>
              Request changes
            </Button>
          </div>
          {needsOverride && !override && <p className="text-xs text-slate-500">Approving with high-severity items open needs an explicit override.</p>}
        </div>
      ) : (
        <Banner tone={s.status === "approved" ? "emerald" : "amber"}>
          {s.status === "approved" ? "Approved. This version is locked." : "Sent back to the creator for changes."}
          {s.status === "changes_requested" && (
            <Button size="sm" variant="secondary" className="ml-3" onClick={() => onGoCreator(s.id)}>
              Open as creator →
            </Button>
          )}
        </Banner>
      )}

      <Comments s={s} as={REVIEWER} onAdd={(t) => comment(s.id, REVIEWER, "Brand manager", t)} />
      <History s={s} />
    </div>
  );
}
