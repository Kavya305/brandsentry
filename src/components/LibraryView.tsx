import { useState } from "react";
import { todayISO } from "../lib/engine";
import { parseGuide, type Proposal } from "../lib/importer";
import { SAMPLE_GUIDE } from "../lib/seed";
import { useStore } from "../lib/store";
import type { Fact, Severity, TermRule } from "../lib/types";
import { Button, SeverityBadge, timeAgo } from "./ui";

const nextId = (prefix: string, ids: string[]) => {
  const n = ids.filter((i) => i.startsWith(prefix + "-")).map((i) => parseInt(i.split("-")[1], 10) || 0);
  return `${prefix}-${String(Math.max(0, ...n) + 1).padStart(2, "0")}`;
};

export function LibraryView() {
  const { state, updateLibrary } = useStore();
  const lib = state.library;
  const [tab, setTab] = useState<"facts" | "terms" | "style" | "visual" | "import">("facts");
  const tabs: [typeof tab, string, number?][] = [
    ["facts", "Approved facts", lib.facts.length],
    ["terms", "Terminology & claims", lib.terms.length],
    ["style", "Tone & accessibility", lib.styles.length],
    ["visual", "Visual assets"],
    ["import", "Import from guide"],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="card p-4">
          <div className="label">Brand voice · {lib.brandName}</div>
          <textarea
            className="input"
            rows={2}
            defaultValue={lib.voice}
            onBlur={(e) => e.target.value !== lib.voice && updateLibrary((l) => void (l.voice = e.target.value), "Edited brand voice")}
          />
          <p className="mt-2 text-xs text-slate-500">
            Every check cites a rule or fact from this library by its ID. Change a rule here and the next check uses it immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map(([k, label, n]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
            >
              {label}
              {n !== undefined && <span className="ml-1 opacity-60">{n}</span>}
            </button>
          ))}
        </div>
        {tab === "facts" && <Facts />}
        {tab === "terms" && <Terms />}
        {tab === "style" && <Styles />}
        {tab === "visual" && <Visual />}
        {tab === "import" && <Import onDone={() => setTab("terms")} />}
      </div>
      <aside className="card h-fit p-4">
        <div className="mb-2 text-sm font-semibold">Library change log</div>
        <ol className="space-y-2">
          {state.libraryAudit.slice(0, 15).map((a, i) => (
            <li key={i} className="text-sm">
              <div className="font-medium">{a.action}</div>
              <div className="text-xs text-slate-500">
                {a.detail ? `${a.detail} · ` : ""}
                {timeAgo(a.at)}
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function expiryState(f: Fact) {
  if (!f.expires) return ["No expiry", "bg-slate-100 text-slate-600"];
  const today = todayISO();
  if (f.expires < today) return ["Expired", "bg-red-100 text-red-800"];
  const days = (new Date(f.expires).getTime() - new Date(today).getTime()) / 864e5;
  if (days <= 30) return [`Expires in ${Math.round(days)} d`, "bg-amber-100 text-amber-800"];
  return ["Active", "bg-emerald-100 text-emerald-800"];
}

function Facts() {
  const { state, updateLibrary } = useStore();
  const lib = state.library;
  const blank = { statement: "", keywords: "", value: "", unit: "₹" as Fact["unit"], phrase: "", owner: "", source: "", expires: "" };
  const [form, setForm] = useState(blank);

  return (
    <div className="space-y-3">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Approved fact</th>
              <th className="px-3 py-2">Owner · source</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lib.facts.map((f) => {
              const [label, cls] = expiryState(f);
              return (
                <tr key={f.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-mono text-xs">{f.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.statement}</div>
                    <div className="text-xs text-slate-500">matched by: {f.phrase ? `“${f.phrase}”` : f.keywords.join(", ")}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium text-slate-700">{f.owner}</div>
                    <div className="text-slate-500">{f.source}</div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      aria-label={`Expiry of ${f.id}`}
                      className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                      value={f.expires}
                      onChange={(e) =>
                        updateLibrary((l) => void (l.facts.find((x) => x.id === f.id)!.expires = e.target.value), "Changed fact expiry", `${f.id} → ${e.target.value || "no expiry"}`)
                      }
                    />
                    <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => updateLibrary((l) => void (l.facts = l.facts.filter((x) => x.id !== f.id)), "Deleted fact", f.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card space-y-3 p-4">
        <div className="font-semibold">Add an approved fact</div>
        <input className="input" placeholder="Statement, e.g. SPF 50 Sunscreen is priced at ₹649." value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="input" placeholder="Number (optional), e.g. 649" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Fact["unit"] })}>
            <option value="₹">₹ price</option>
            <option value="%">% percentage</option>
            <option value="count">count (customers, reviews…)</option>
            <option value="days">days</option>
          </select>
          <input className="input" placeholder="Exact phrase (optional)" value={form.phrase} onChange={(e) => setForm({ ...form, phrase: e.target.value })} />
        </div>
        <input className="input" placeholder="Keywords that identify it, comma-separated: sunscreen, spf, price" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="input" placeholder="Owner, e.g. Pricing team" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          <input className="input" placeholder="Source, e.g. Q4 price list" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <input className="input" type="date" aria-label="Expiry date" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} />
        </div>
        <Button
          disabled={!form.statement.trim() || (!form.keywords.trim() && !form.phrase.trim())}
          onClick={() => {
            const id = nextId("F", lib.facts.map((f) => f.id));
            const value = parseFloat(form.value.replace(/,/g, ""));
            updateLibrary(
              (l) =>
                void l.facts.push({
                  id,
                  statement: form.statement.trim(),
                  keywords: form.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
                  phrase: form.phrase.trim() || undefined,
                  value: isNaN(value) ? undefined : value,
                  unit: isNaN(value) ? undefined : form.unit,
                  owner: form.owner.trim() || "Brand manager",
                  source: form.source.trim() || "Added manually",
                  expires: form.expires,
                }),
              "Added fact",
              `${id}: ${form.statement.trim()}`,
            );
            setForm(blank);
          }}
        >
          Add fact
        </Button>
      </div>
    </div>
  );
}

function Terms() {
  const { state, updateLibrary } = useStore();
  const lib = state.library;
  const blank = { kind: "banned" as TermRule["kind"], find: "", replaceWith: "", reason: "", severity: "medium" as Severity };
  const [form, setForm] = useState(blank);
  const set = (id: string, fn: (t: TermRule) => void, action: string) => updateLibrary((l) => fn(l.terms.find((t) => t.id === id)!), action, id);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {lib.terms.map((t) => (
          <div key={t.id} className={`card p-3 ${t.enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{t.id}</span>
              <span className="rounded bg-slate-100 px-1.5 text-[11px] font-semibold uppercase text-slate-600">{t.kind}</span>
              <SeverityBadge s={t.severity} />
              <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={t.enabled} onChange={(e) => set(t.id, (x) => void (x.enabled = e.target.checked), e.target.checked ? "Enabled rule" : "Disabled rule")} />
                Active
              </label>
              <Button size="sm" variant="ghost" onClick={() => updateLibrary((l) => void (l.terms = l.terms.filter((x) => x.id !== t.id)), "Deleted rule", t.id)}>
                Delete
              </Button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="label">Flag these words</label>
                <input
                  className="input"
                  defaultValue={t.find.join(", ")}
                  onBlur={(e) => set(t.id, (x) => void (x.find = e.target.value.split(",").map((v) => v.trim()).filter(Boolean)), "Edited rule words")}
                />
              </div>
              <div>
                <label className="label">Suggest instead</label>
                <input className="input" defaultValue={t.replaceWith} onBlur={(e) => set(t.id, (x) => void (x.replaceWith = e.target.value.trim()), "Edited suggestion")} />
              </div>
            </div>
            <input className="input mt-2 text-slate-600" defaultValue={t.reason} onBlur={(e) => set(t.id, (x) => void (x.reason = e.target.value), "Edited rule reason")} />
          </div>
        ))}
      </div>
      <div className="card space-y-2 p-4">
        <div className="font-semibold">Add a rule</div>
        <div className="grid gap-2 sm:grid-cols-[150px_1fr_1fr_120px]">
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as TermRule["kind"] })}>
            <option value="banned">Banned word</option>
            <option value="preferred">Preferred term</option>
            <option value="product-name">Product name</option>
          </select>
          <input className="input" placeholder="Words to flag (comma-separated)" value={form.find} onChange={(e) => setForm({ ...form, find: e.target.value })} />
          <input className="input" placeholder="Suggest instead" value={form.replaceWith} onChange={(e) => setForm({ ...form, replaceWith: e.target.value })} />
          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <input className="input" placeholder="Why? (shown to creators)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Button
          disabled={!form.find.trim() || !form.reason.trim()}
          onClick={() => {
            const id = nextId("T", lib.terms.map((t) => t.id));
            updateLibrary(
              (l) =>
                void l.terms.push({
                  id,
                  kind: form.kind,
                  find: form.find.split(",").map((v) => v.trim()).filter(Boolean),
                  replaceWith: form.replaceWith.trim(),
                  reason: form.reason.trim(),
                  severity: form.severity,
                  enabled: true,
                }),
              "Added rule",
              `${id}: ${form.find}`,
            );
            setForm(blank);
          }}
        >
          Add rule
        </Button>
      </div>
    </div>
  );
}

function Styles() {
  const { state, updateLibrary } = useStore();
  return (
    <div className="space-y-2">
      {state.library.styles.map((r) => (
        <div key={r.id} className={`card flex flex-wrap items-center gap-3 p-3 ${r.enabled ? "" : "opacity-60"}`}>
          <span className="font-mono text-xs text-slate-500">{r.id}</span>
          <span className="rounded bg-slate-100 px-1.5 text-[11px] font-semibold uppercase text-slate-600">{r.category}</span>
          <span className="min-w-[200px] flex-1 text-sm">{r.text}</span>
          {r.param !== undefined && (
            <label className="flex items-center gap-1 text-xs text-slate-600">
              limit
              <input
                type="number"
                min={0}
                className="w-16 rounded border border-slate-300 px-1.5 py-0.5"
                value={r.param}
                onChange={(e) => updateLibrary((l) => void (l.styles.find((x) => x.id === r.id)!.param = Number(e.target.value)), "Changed limit", `${r.id} → ${e.target.value}`)}
              />
            </label>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={r.enabled} onChange={(e) => updateLibrary((l) => void (l.styles.find((x) => x.id === r.id)!.enabled = e.target.checked), e.target.checked ? "Enabled rule" : "Disabled rule", r.id)} />
            Active
          </label>
        </div>
      ))}
      {state.library.styles.some((r) => r.words) && (
        <p className="px-1 text-xs text-slate-500">
          Watched phrases: {state.library.styles.flatMap((r) => r.words ?? []).join(", ")}
        </p>
      )}
    </div>
  );
}

function Visual() {
  const { state, updateLibrary } = useStore();
  const v = state.library.visual;
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#1F4D3A");
  return (
    <div className="card space-y-4 p-4">
      <div>
        <div className="label">Brand palette ({v.id})</div>
        <div className="flex flex-wrap gap-3">
          {v.palette.map((p) => (
            <div key={p.hex + p.name} className="w-28 rounded-lg border p-2 text-xs">
              <div className="h-12 rounded-md border" style={{ background: p.hex }} />
              <div className="mt-1 font-semibold">{p.name}</div>
              <div className="flex items-center justify-between font-mono text-slate-500">
                {p.hex}
                <button className="text-slate-400 hover:text-red-600" aria-label={`Remove ${p.name}`} onClick={() => updateLibrary((l) => void (l.visual.palette = l.visual.palette.filter((x) => x !== l.visual.palette.find((y) => y.hex === p.hex && y.name === p.name))), "Removed colour", `${p.name} ${p.hex}`)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="color" aria-label="Colour" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} className="h-9 w-12 rounded border" />
          <input className="input w-40" placeholder="Colour name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="secondary" disabled={!name.trim()} onClick={() => { updateLibrary((l) => void l.visual.palette.push({ name: name.trim(), hex }), "Added colour", `${name.trim()} ${hex}`); setName(""); }}>
            Add colour
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="label">Minimum contrast</span>
          <input type="number" step={0.5} min={1} className="input" value={v.minContrast} onChange={(e) => updateLibrary((l) => void (l.visual.minContrast = Number(e.target.value)), "Changed minimum contrast", e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="label">Colour tolerance</span>
          <input type="number" min={10} max={200} className="input" value={v.tolerance} onChange={(e) => updateLibrary((l) => void (l.visual.tolerance = Number(e.target.value)), "Changed colour tolerance", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 pt-5 text-sm">
          <input type="checkbox" checked={v.requireAltText} onChange={(e) => updateLibrary((l) => void (l.visual.requireAltText = e.target.checked), "Changed alt-text rule")} />
          Require alt text on images
        </label>
      </div>
    </div>
  );
}

function Import({ onDone }: { onDone: () => void }) {
  const { state, updateLibrary } = useStore();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Proposal[] | null>(null);

  const approve = (p: Proposal, i: number) => {
    if (p.kind === "term") {
      const id = nextId("T", state.library.terms.map((t) => t.id));
      updateLibrary((l) => void l.terms.push({ id, ...p.rule }), "Approved imported rule", `${id}: ${p.rule.find.join(", ")}`);
    } else {
      const id = nextId("F", state.library.facts.map((f) => f.id));
      updateLibrary((l) => void l.facts.push({ id, ...p.fact }), "Approved imported fact", `${id}: ${p.fact.statement}`);
    }
    setItems((prev) => prev!.filter((_, j) => j !== i));
  };

  return (
    <div className="card space-y-3 p-4">
      <div>
        <div className="font-semibold">Import rules from your brand guide</div>
        <p className="text-sm text-slate-600">
          Paste guideline text. BrandSentry turns lines like “Use X instead of Y”, “Never say X” and “Product is priced at ₹N” into draft rules. Nothing is added until you approve it.
        </p>
      </div>
      <textarea className="input font-mono text-xs" rows={7} placeholder="Paste brand guidelines here…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setText(SAMPLE_GUIDE)}>
          Load sample guide
        </Button>
        <Button disabled={!text.trim()} onClick={() => setItems(parseGuide(text))}>
          Extract draft rules
        </Button>
      </div>
      {items && items.length === 0 && <p className="text-sm text-slate-500">No rules found. Try lines like “Use ‘skincare’ instead of ‘skin care’.”</p>}
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <div className="min-w-[220px] flex-1">
                {p.kind === "term" ? (
                  <>
                    <b>{p.rule.kind === "preferred" ? "Preferred term" : "Banned word"}:</b> “{p.rule.find.join(", ")}”
                    {p.rule.replaceWith && <> → “{p.rule.replaceWith}”</>}
                  </>
                ) : (
                  <>
                    <b>Approved fact:</b> {p.fact.statement}
                  </>
                )}
                <div className="text-xs text-slate-500">From: “{p.source}”</div>
              </div>
              <Button size="sm" variant="success" onClick={() => approve(p, i)}>
                Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setItems((prev) => prev!.filter((_, j) => j !== i))}>
                Reject
              </Button>
            </li>
          ))}
        </ul>
      )}
      {items && items.length === 0 && text && (
        <Button variant="ghost" size="sm" onClick={onDone}>
          See all rules →
        </Button>
      )}
    </div>
  );
}
