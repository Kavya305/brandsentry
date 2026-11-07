import { useEffect, useRef, useState } from "react";
import { CHANNELS, SAMPLE_DRAFT } from "../lib/seed";
import { analyzeImage, makeSampleBanner, shrinkImage } from "../lib/image";
import { blockers, CREATOR, useStore } from "../lib/store";
import type { Submission } from "../lib/types";
import { FindingCard } from "./FindingCard";
import { Button, Comments, Empty, Highlighted, History, StatusBadge, timeAgo } from "./ui";

export function CreatorView({ selected, onSelect, onGoReview }: { selected: string | null; onSelect: (id: string) => void; onGoReview: (id: string) => void }) {
  const { state, newDraft } = useStore();
  const sub = state.submissions.find((s) => s.id === selected) ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <aside className="space-y-2">
        <Button className="w-full" onClick={() => onSelect(newDraft())}>
          + New draft
        </Button>
        <div className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">All content</div>
        <ul className="space-y-1.5">
          {state.submissions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${s.id === selected ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className="truncate text-sm font-medium">{s.title}</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <StatusBadge s={s.status} />
                  <span className="truncate text-[11px] text-slate-500">{s.author.replace(/ \(.*\)/, "")}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section>{sub ? <Editor key={sub.id} s={sub} onGoReview={onGoReview} /> : <Start onSelect={onSelect} />}</section>
    </div>
  );
}

function Start({ onSelect }: { onSelect: (id: string) => void }) {
  const { newDraft, editDraft, check } = useStore();
  return (
    <Empty title="Write or paste content to check it against the Verda Skin brand rules">
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            const id = newDraft();
            editDraft(id, { title: "Diwali Instagram post", channel: "Instagram post", content: SAMPLE_DRAFT });
            setTimeout(() => check(id), 0);
            onSelect(id);
          }}
        >
          Try the sample draft (has planted mistakes)
        </Button>
        <Button variant="secondary" onClick={() => onSelect(newDraft())}>
          Start a blank draft
        </Button>
      </div>
    </Empty>
  );
}

function Editor({ s, onGoReview }: { s: Submission; onGoReview: (id: string) => void }) {
  const store = useStore();
  const { editDraft, check, acceptFix, acceptAllFixes, dispute, undoDispute, submit, deleteDraft, comment, state } = store;
  const [active, setActive] = useState<string>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const editable = s.status === "draft" || s.status === "changes_requested";
  const r = s.result;
  const stale = !!r && r.text !== s.content;
  const findings = r?.findings ?? [];
  const block = blockers(s);
  const fixable = findings.filter((f) => f.replacement !== undefined && f.where === "text" && !s.disputes[f.key]).length;
  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => counts[f.severity]++);
  const lastReview = [...s.comments].reverse().find((c) => c.role === "Brand manager");

  // Re-analyse the image if the palette changed since it was uploaded.
  useEffect(() => {
    if (s.image && !s.image.analysis) {
      analyzeImage(s.image.dataUrl, state.library).then((a) => editDraft(s.id, { image: { ...s.image!, analysis: a } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.image?.dataUrl]);

  const loadFile = async (file: File) => {
    setErr("");
    try {
      if (/\.docx$/i.test(file.name)) {
        setBusy("Reading document…");
        const mammoth = await import("mammoth/mammoth.browser");
        const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        editDraft(s.id, { content: value.trim(), title: s.title === "Untitled draft" ? file.name.replace(/\.\w+$/, "") : s.title });
      } else if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) {
        const text = await file.text();
        editDraft(s.id, { content: text.trim(), title: s.title === "Untitled draft" ? file.name.replace(/\.\w+$/, "") : s.title });
      } else {
        setErr("Upload a .docx, .txt or .md file. PDF support is planned.");
      }
    } catch {
      setErr("Could not read that file.");
    } finally {
      setBusy("");
    }
  };

  const setImage = async (dataUrl: string, name: string) => {
    setBusy("Analysing image colours…");
    try {
      const analysis = await analyzeImage(dataUrl, state.library);
      editDraft(s.id, { image: { name, dataUrl, alt: s.image?.alt ?? "", analysis } });
    } catch {
      setErr("Could not read that image.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      {s.status === "in_review" && (
        <Banner tone="indigo">
          Submitted and waiting for the brand manager. Content is locked while it's in review.
          <Button size="sm" className="ml-3" onClick={() => onGoReview(s.id)}>
            Review it as brand manager →
          </Button>
        </Banner>
      )}
      {s.status === "approved" && (
        <Banner tone="emerald">
          Approved by the brand manager. This version is locked and ready to publish.
          <Button size="sm" variant="secondary" className="ml-3" onClick={() => navigator.clipboard?.writeText(s.content)}>
            Copy final text
          </Button>
        </Banner>
      )}
      {s.status === "changes_requested" && (
        <Banner tone="amber">
          <b>Changes requested.</b> {lastReview ? `“${lastReview.text}”` : ""} Edit the text, re-check, then resubmit.
        </Banner>
      )}

      <div className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" disabled={!editable} value={s.title} onChange={(e) => editDraft(s.id, { title: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="channel">Channel</label>
            <select id="channel" className="input" disabled={!editable} value={s.channel} onChange={(e) => editDraft(s.id, { channel: e.target.value })}>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <label className="label mb-0" htmlFor="content">Content</label>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => editDraft(s.id, { content: SAMPLE_DRAFT, title: s.title === "Untitled draft" ? "Diwali Instagram post" : s.title })}>
                  Load sample draft
                </Button>
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                  Upload .docx / .txt
                </Button>
                <input ref={fileRef} type="file" accept=".docx,.txt,.md,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </div>
            )}
          </div>
          <textarea
            id="content"
            className="input min-h-[140px] font-[inherit] text-[15px] leading-7"
            disabled={!editable}
            placeholder="Paste a caption, email, banner copy or any text your brand will publish…"
            value={s.content}
            onChange={(e) => editDraft(s.id, { content: e.target.value })}
          />
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label mb-0">Image (optional)</span>
            {editable && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setImage(makeSampleBanner(), "sample-banner.png")}>
                  Use sample banner
                </Button>
                <Button size="sm" variant="secondary" onClick={() => imgRef.current?.click()}>
                  Upload image
                </Button>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage(await shrinkImage(f), f.name);
                  }}
                />
              </div>
            )}
          </div>
          {s.image ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <img src={s.image.dataUrl} alt={s.image.alt || "Uploaded image"} className="h-28 w-auto max-w-[220px] rounded-lg border object-cover" />
              <div className="flex-1 space-y-2">
                <div>
                  <label className="label" htmlFor="alt">Alt text (what the image shows)</label>
                  <input id="alt" className="input" disabled={!editable} placeholder="e.g. Bottle of GlowLab Serum on a sage-green background" value={s.image.alt} onChange={(e) => editDraft(s.id, { image: { ...s.image!, alt: e.target.value } })} />
                </div>
                {s.image.analysis && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    Main colours:
                    {s.image.analysis.colors.slice(0, 4).map((c) => (
                      <span key={c.hex} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
                        <span className="h-3 w-3 rounded-sm border" style={{ background: c.hex }} />
                        {Math.round(c.share * 100)}%
                      </span>
                    ))}
                    · contrast {s.image.analysis.contrast}:1
                  </div>
                )}
                {editable && (
                  <Button size="sm" variant="ghost" onClick={() => editDraft(s.id, { image: undefined })}>
                    Remove image
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Images are checked for brand colours, contrast and alt text. They are analysed in your browser and never uploaded.</p>
          )}
        </div>

        {err && <p className="text-sm text-red-700">{err}</p>}
        {busy && <p className="text-sm text-slate-500">{busy}</p>}

        {editable && (
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!s.content.trim() && !s.image} onClick={() => check(s.id)}>
              {r ? "Re-check" : "Run brand check"}
            </Button>
            {stale && <span className="text-sm text-amber-700">Text changed since the last check. Re-check to update.</span>}
            {s.status === "draft" && s.sample !== true && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => deleteDraft(s.id)}>
                Delete draft
              </Button>
            )}
          </div>
        )}
      </div>

      {r && (
        <>
          <div className="card flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
            <Stat n={findings.length} label="issues" />
            <Stat n={counts.high} label="high" cls="text-red-700" />
            <Stat n={counts.medium} label="medium" cls="text-amber-700" />
            <Stat n={counts.low} label="low" cls="text-sky-700" />
            <Stat n={r.verified.length} label="claims verified" cls="text-emerald-700" />
            <Stat n={Object.keys(s.disputes).length} label="disputed" cls="text-slate-600" />
            {editable && fixable > 1 && (
              <Button variant="success" className="ml-auto" onClick={() => acceptAllFixes(s.id)}>
                Accept all {fixable} suggested fixes
              </Button>
            )}
          </div>

          {findings.length === 0 && (
            <Banner tone="emerald">No issues found. Every claim we could check matches the approved facts.</Banner>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <div className="card p-4">
                <div className="label">Highlighted draft</div>
                <Highlighted
                  text={r.text}
                  findings={findings}
                  disputed={s.disputes}
                  active={active}
                  onPick={(k) => {
                    setActive(k);
                    document.getElementById(`f-${k}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              </div>
              {r.verified.length > 0 && (
                <div className="card border-emerald-200 p-4">
                  <div className="label text-emerald-700">Verified against approved facts</div>
                  <ul className="space-y-1 text-sm">
                    {r.verified.map((v, i) => (
                      <li key={i}>
                        <span className="text-emerald-700">✓</span> “{v.quote}” <span className="text-slate-500">matches {v.factId}: {v.statement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {findings.map((f) => (
                <FindingCard
                  key={f.key + f.start}
                  f={f}
                  dispute={s.disputes[f.key]}
                  editable={editable && !stale}
                  active={active === f.key}
                  onLocate={() => setActive(f.key)}
                  onAccept={() => acceptFix(s.id, f)}
                  onDispute={(reason) => dispute(s.id, f, reason)}
                  onUndo={() => undoDispute(s.id, f.key)}
                />
              ))}
            </div>
          </div>

          {editable && (
            <div className="card space-y-3 p-4">
              <div className="font-semibold">Send for approval</div>
              <p className="text-sm text-slate-600">
                A brand manager makes the final call. High-severity issues must be fixed, or disputed with a reason, before you can submit.
              </p>
              <input className="input" placeholder="Optional note for the reviewer" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={block.length > 0 || stale}
                  onClick={() => {
                    submit(s.id, note);
                    setNote("");
                  }}
                >
                  {s.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}
                </Button>
                {stale ? (
                  <span className="text-sm text-amber-700">Re-check the latest text first.</span>
                ) : block.length > 0 ? (
                  <span className="text-sm text-red-700">
                    {block.length} high-severity issue{block.length > 1 ? "s" : ""} still open: fix or dispute {block.length > 1 ? "them" : "it"}.
                  </span>
                ) : (
                  <span className="text-sm text-emerald-700">Ready to submit.</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Comments s={s} as={CREATOR} onAdd={(t) => comment(s.id, CREATOR, "Creator", t)} />
      <History s={s} />
      <p className="text-right text-xs text-slate-400">Last updated {timeAgo(s.updatedAt)}</p>
    </div>
  );
}

function Stat({ n, label, cls = "text-slate-900" }: { n: number; label: string; cls?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-2xl font-semibold ${cls}`}>{n}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

export function Banner({ tone, children }: { tone: "indigo" | "emerald" | "amber"; children: React.ReactNode }) {
  const cls = {
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];
  return <div className={`flex flex-wrap items-center rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
