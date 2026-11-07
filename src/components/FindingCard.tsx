import { useState } from "react";
import type { Dispute, Finding } from "../lib/types";
import { Button, SeverityBadge, Tag, catColor } from "./ui";

export function FindingCard({
  f,
  dispute,
  editable,
  active,
  onAccept,
  onDispute,
  onUndo,
  onLocate,
}: {
  f: Finding;
  dispute?: Dispute;
  editable: boolean;
  active?: boolean;
  onAccept?: () => void;
  onDispute?: (reason: string) => void;
  onUndo?: () => void;
  onLocate?: () => void;
}) {
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div
      id={`f-${f.key}`}
      className={`card p-3.5 transition ${active ? "ring-2 ring-brand-500" : ""} ${dispute ? "bg-slate-50" : ""}`}
      onMouseEnter={onLocate}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge s={f.severity} />
        <Tag color={catColor[f.category]}>{f.category}</Tag>
        {f.where === "image" && <Tag>Image</Tag>}
        <span className="ml-auto font-mono text-[11px] text-slate-400">rule {f.ruleId}</span>
      </div>

      <div className="mt-2 text-sm">
        <span className="rounded bg-slate-100 px-1 font-medium text-slate-900">“{f.quote}”</span>
        {f.replacement !== undefined && (
          <>
            <span className="mx-1.5 text-slate-400">→</span>
            <span className="rounded bg-emerald-50 px-1 font-medium text-emerald-800">“{f.replacement}”</span>
          </>
        )}
      </div>
      <p className="mt-1.5 text-sm text-slate-700">{f.message}</p>

      <div className="mt-2 rounded-lg border-l-2 border-brand-500 bg-brand-50/60 px-2.5 py-1.5 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Why: </span>
        {f.ruleText}
      </div>
      {f.owner && (
        <div className="mt-1.5 text-xs text-slate-500">
          Sign-off owner if kept: <span className="font-semibold text-slate-700">{f.owner}</span>
        </div>
      )}

      {dispute && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          <span className="font-semibold">Disputed by creator:</span> {dispute.reason}
        </div>
      )}

      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!dispute && f.replacement !== undefined && f.where === "text" && (
            <Button size="sm" variant="success" onClick={onAccept}>
              Accept fix
            </Button>
          )}
          {!dispute && f.replacement === undefined && f.where === "text" && (
            <span className="self-center text-xs text-slate-500">No safe auto-fix: edit the text above, then re-check.</span>
          )}
          {!dispute && !disputing && (
            <Button size="sm" variant="secondary" onClick={() => setDisputing(true)}>
              Dispute
            </Button>
          )}
          {dispute && (
            <Button size="sm" variant="ghost" onClick={onUndo}>
              Withdraw dispute
            </Button>
          )}
        </div>
      )}

      {disputing && (
        <div className="mt-2 space-y-2">
          <textarea
            autoFocus
            className="input"
            rows={2}
            placeholder="Why is this fine? The reviewer will see your reason."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={reason.trim().length < 5}
              onClick={() => {
                onDispute?.(reason.trim());
                setDisputing(false);
                setReason("");
              }}
            >
              Send dispute to reviewer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDisputing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
