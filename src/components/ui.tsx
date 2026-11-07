import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Category, Finding, Severity, Status, Submission } from "../lib/types";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "success"; size?: "sm" | "md" }) {
  const v = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300",
  }[variant];
  const s = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed ${v} ${s} ${className}`}
    />
  );
}

export const sevStyle: Record<Severity, string> = {
  high: "bg-red-100 text-red-800 ring-red-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  low: "bg-sky-100 text-sky-800 ring-sky-200",
};

export const sevMark: Record<Severity, string> = {
  high: "bg-red-100 decoration-red-500",
  medium: "bg-amber-100 decoration-amber-500",
  low: "bg-sky-100 decoration-sky-500",
};

export function SeverityBadge({ s }: { s: Severity }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ${sevStyle[s]}`}>{s}</span>;
}

export const catColor: Record<Category, string> = {
  Terminology: "#6366f1",
  Claim: "#dc2626",
  "Outdated fact": "#ea580c",
  "Wrong fact": "#b91c1c",
  Tone: "#0891b2",
  Accessibility: "#059669",
  Visual: "#c026d3",
};

export function Tag({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: color ?? "#475569", background: (color ?? "#475569") + "14" }}>
      {children}
    </span>
  );
}

const statusMeta: Record<Status, [string, string]> = {
  draft: ["Draft", "bg-slate-100 text-slate-700"],
  in_review: ["In review", "bg-indigo-100 text-indigo-800"],
  changes_requested: ["Changes requested", "bg-amber-100 text-amber-800"],
  approved: ["Approved", "bg-emerald-100 text-emerald-800"],
};

export function StatusBadge({ s }: { s: Status }) {
  const [label, cls] = statusMeta[s];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

/** The draft text with each finding highlighted in place. */
export function Highlighted({
  text,
  findings,
  disputed,
  active,
  onPick,
}: {
  text: string;
  findings: Finding[];
  disputed: Record<string, unknown>;
  active?: string;
  onPick?: (key: string) => void;
}) {
  const spans = findings
    .filter((f) => f.where === "text" && f.start >= 0)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const parts: ReactNode[] = [];
  let pos = 0;
  for (const f of spans) {
    if (f.start < pos) continue; // skip overlaps; the card list still shows them
    if (f.start > pos) parts.push(text.slice(pos, f.start));
    const isDisputed = !!disputed[f.key];
    parts.push(
      <mark
        key={f.key + f.start}
        title={`${f.ruleId}: ${f.message}`}
        onClick={() => onPick?.(f.key)}
        className={`hl underline decoration-2 underline-offset-2 ${isDisputed ? "bg-slate-100 decoration-slate-400 decoration-dashed" : sevMark[f.severity]} ${active === f.key ? "ring-2 ring-brand-500" : ""}`}
      >
        {text.slice(f.start, f.end)}
      </mark>,
    );
    pos = f.end;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return <div className="whitespace-pre-wrap text-[15px] leading-7">{parts}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="font-semibold text-slate-700">{title}</div>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3">{children}</div>}
    </div>
  );
}

export function History({ s }: { s: Submission }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Collapsible title={`Version history (${s.versions.length})`}>
        {s.versions.length === 0 ? (
          <p className="text-sm text-slate-500">A version is saved each time the piece is submitted.</p>
        ) : (
          <ol className="space-y-3">
            {[...s.versions].reverse().map((v) => (
              <li key={v.n} className="text-sm">
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    v{v.n} · {v.note}
                  </span>
                  <span>
                    {v.issues} issues · {timeAgo(v.at)}
                  </span>
                </div>
                <p className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-600">{v.content}</p>
              </li>
            ))}
          </ol>
        )}
      </Collapsible>
      <Collapsible title={`Audit trail (${s.audit.length})`}>
        <ol className="space-y-1.5">
          {[...s.audit].reverse().map((a, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{a.action}</span>
              <span className="text-slate-500"> · {a.actor} · {timeAgo(a.at)}</span>
              {a.detail && <div className="text-xs text-slate-500">{a.detail}</div>}
            </li>
          ))}
        </ol>
      </Collapsible>
    </div>
  );
}

export function Comments({ s, onAdd, as }: { s: Submission; onAdd?: (text: string) => void; as?: string }) {
  const [text, setText] = useState("");
  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold">Comments</div>
      {s.comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
      <ul className="space-y-2">
        {s.comments.map((c, i) => (
          <li key={i} className="rounded-lg bg-slate-50 p-2.5 text-sm">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{c.by}</span> · {timeAgo(c.at)}
            </div>
            {c.text}
          </li>
        ))}
      </ul>
      {onAdd && (
        <div className="mt-3 flex gap-2">
          <input className="input" placeholder={`Comment as ${as}`} value={text} onChange={(e) => setText(e.target.value)} />
          <Button
            variant="secondary"
            disabled={!text.trim()}
            onClick={() => {
              onAdd(text.trim());
              setText("");
            }}
          >
            Post
          </Button>
        </div>
      )}
    </div>
  );
}
