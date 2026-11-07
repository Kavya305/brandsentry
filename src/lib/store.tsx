import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyFix, runCheck } from "./engine";
import { seedLibrary } from "./seed";
import type { AppState, AuditEntry, BrandLibrary, Finding, Status, Submission } from "./types";

const KEY = "brandsentry:v1";
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export const CREATOR = "You (Creator)";
export const REVIEWER = "You (Brand manager)";

/* ------------------------------------------------------- Sample history */

function sample(
  lib: BrandLibrary,
  opts: {
    title: string;
    channel: string;
    author: string;
    first: string;
    current: string;
    status: Status;
    hoursAgo: number;
    disputes?: { ruleId: string; quote: string; reason: string }[];
    comments?: { by: string; role: string; text: string }[];
  },
): Submission {
  const first = runCheck(opts.first, lib);
  const current = runCheck(opts.current, lib);
  const t0 = ago(opts.hoursAgo);
  const disputes: Submission["disputes"] = {};
  for (const d of opts.disputes ?? []) {
    const f = current.findings.find((x) => x.ruleId === d.ruleId && x.quote.toLowerCase() === d.quote.toLowerCase());
    if (f) disputes[f.key] = { reason: d.reason, at: ago(opts.hoursAgo - 1), ruleId: f.ruleId, quote: f.quote };
  }
  const fixed = first.findings.filter((f) => !current.findings.some((c) => c.key === f.key));
  const audit: AuditEntry[] = [
    { at: t0, actor: opts.author, action: "Created draft" },
    { at: t0, actor: opts.author, action: "Ran brand check", detail: `${first.findings.length} issues found` },
    ...fixed.map((f) => ({ at: ago(opts.hoursAgo - 0.5), actor: opts.author, action: "Accepted fix", detail: `${f.ruleId}: "${f.quote}"` })),
    ...Object.values(disputes).map((d) => ({ at: d.at, actor: opts.author, action: "Disputed finding", detail: `${d.ruleId}: ${d.reason}` })),
    { at: ago(opts.hoursAgo - 1), actor: opts.author, action: "Submitted for review" },
  ];
  const comments = (opts.comments ?? []).map((c, i) => ({ ...c, at: ago(opts.hoursAgo - 2 - i) }));
  if (opts.status === "approved") audit.push({ at: ago(opts.hoursAgo - 2), actor: "Neha (Brand manager)", action: "Approved" });
  if (opts.status === "changes_requested") audit.push({ at: ago(opts.hoursAgo - 2), actor: "Neha (Brand manager)", action: "Requested changes" });
  return {
    id: uid(),
    title: opts.title,
    channel: opts.channel,
    author: opts.author,
    content: opts.current,
    result: current,
    disputes,
    fixesAccepted: fixed.map((f) => ({ ruleId: f.ruleId, category: f.category, at: ago(opts.hoursAgo - 0.5) })),
    issueLog: first.findings.map((f) => ({ ruleId: f.ruleId, category: f.category, at: t0 })),
    status: opts.status,
    versions: [
      { n: 1, content: opts.first, at: t0, issues: first.findings.length, note: "First draft" },
      { n: 2, content: opts.current, at: ago(opts.hoursAgo - 1), issues: current.findings.length, note: "Submitted for review" },
    ],
    comments,
    audit,
    createdAt: t0,
    updatedAt: ago(opts.hoursAgo - 2),
    sample: true,
  };
}

export function makeInitialState(): AppState {
  const lib = structuredClone(seedLibrary);
  const submissions = [
    sample(lib, {
      title: "Monsoon skincare email",
      channel: "Email newsletter",
      author: "Riya (Marketing)",
      first: "Monsoon is here!! Our cheap GlowLab Serum keeps skin fresh. Click here to read our monsoon tips, sent to 2,000 users.",
      current: "Monsoon is here. Our affordable GlowLab Serum keeps skin fresh. Visit verdaskin.in to read our monsoon tips.",
      status: "approved",
      hoursAgo: 52,
      comments: [{ by: "Neha (Brand manager)", role: "Brand manager", text: "Looks good. Approved for Thursday's send." }],
    }),
    sample(lib, {
      title: "App launch post (agency draft)",
      channel: "Instagram post",
      author: "Kabir (Agency)",
      first: "The NEW Verda app is the #1 skincare app for users who want flawless skin. Link in bio!",
      current: "The new Verda app is the #1 skincare app for users who want healthy-looking skin. Link in bio!",
      status: "changes_requested",
      hoursAgo: 30,
      disputes: [{ ruleId: "T-06", quote: "users", reason: "This is about the app, so 'users' is the right word here." }],
      comments: [
        { by: "Neha (Brand manager)", role: "Brand manager", text: "We have no survey or award for '#1'. Please remove it and replace 'Link in bio' with the page name." },
      ],
    }),
    sample(lib, {
      title: "Restock banner copy",
      channel: "Website banner",
      author: "Arjun (Sales)",
      first: "GLOWLAB SERUM IS BACK!!! Only ₹849 for a short time. Hurry, 500 users already ordered.",
      current: "GlowLab Serum is back! Now ₹849 for a short time. 500 users already ordered.",
      status: "in_review",
      hoursAgo: 6,
      disputes: [
        { ruleId: "T-06", quote: "users", reason: "Our app team calls them users. The rule is unclear for app vs shop customers." },
        { ruleId: "F-01", quote: "₹849", reason: "Pricing confirmed a ₹849 restock offer on Slack today." },
      ],
    }),
  ];
  return {
    library: lib,
    submissions,
    libraryAudit: [{ at: ago(80), actor: "Neha (Brand manager)", action: "Brand Library created", detail: "Verda Skin guidelines v1" }],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* storage unavailable: start fresh */
  }
  return makeInitialState();
}

/* -------------------------------------------------------------- Actions */

function useAppStore() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode: keep working in memory */
    }
  }, [state]);

  const updateSub = (id: string, fn: (s: Submission, st: AppState) => void) =>
    setState((prev) => {
      const next = structuredClone(prev);
      const s = next.submissions.find((x) => x.id === id);
      if (s) {
        fn(s, next);
        s.updatedAt = now();
      }
      return next;
    });

  const log = (s: Submission, actor: string, action: string, detail?: string) => s.audit.push({ at: now(), actor, action, detail });

  const recheck = (s: Submission, lib: BrandLibrary) => {
    s.result = runCheck(s.content, lib, s.image);
    const logged = new Set(s.issueLog.map((i) => `${i.ruleId}`));
    for (const f of s.result.findings) {
      // Log each rule once per piece so repeat mistakes are counted fairly.
      if (!logged.has(f.ruleId)) {
        s.issueLog.push({ ruleId: f.ruleId, category: f.category, at: now() });
        logged.add(f.ruleId);
      }
    }
    // Drop disputes for findings that no longer exist.
    for (const k of Object.keys(s.disputes)) if (!s.result.findings.some((f) => f.key === k)) delete s.disputes[k];
    return s.result;
  };

  return useMemo(
    () => ({
      state,
      newDraft(): string {
        const id = uid();
        setState((prev) => {
          const next = structuredClone(prev);
          next.submissions.unshift({
            id,
            title: "Untitled draft",
            channel: "Instagram post",
            author: CREATOR,
            content: "",
            disputes: {},
            fixesAccepted: [],
            issueLog: [],
            status: "draft",
            versions: [],
            comments: [],
            audit: [{ at: now(), actor: CREATOR, action: "Created draft" }],
            createdAt: now(),
            updatedAt: now(),
          });
          return next;
        });
        return id;
      },
      editDraft(id: string, patch: Partial<Pick<Submission, "title" | "channel" | "content" | "image">>) {
        updateSub(id, (s) => {
          Object.assign(s, patch);
          if ("image" in patch && !patch.image) delete s.image;
        });
      },
      check(id: string) {
        updateSub(id, (s, st) => {
          const r = recheck(s, st.library);
          log(s, CREATOR, "Ran brand check", `${r.findings.length} issues, ${r.verified.length} claims verified`);
        });
      },
      acceptFix(id: string, f: Finding) {
        updateSub(id, (s, st) => {
          const next = applyFix(s.content, f);
          if (next === null) return;
          s.content = next;
          s.fixesAccepted.push({ ruleId: f.ruleId, category: f.category, at: now() });
          log(s, CREATOR, "Accepted fix", `${f.ruleId}: "${f.quote}" → "${f.replacement}"`);
          recheck(s, st.library);
        });
      },
      acceptAllFixes(id: string) {
        updateSub(id, (s, st) => {
          let n = 0;
          for (let i = 0; i < 60; i++) {
            const r = recheck(s, st.library);
            const f = r.findings.find((x) => x.replacement !== undefined && x.where === "text" && !s.disputes[x.key]);
            if (!f) break;
            const next = applyFix(s.content, f);
            if (next === null || next === s.content) break;
            s.content = next;
            s.fixesAccepted.push({ ruleId: f.ruleId, category: f.category, at: now() });
            n++;
          }
          recheck(s, st.library);
          log(s, CREATOR, "Accepted all suggested fixes", `${n} fixes applied`);
        });
      },
      dispute(id: string, f: Finding, reason: string) {
        updateSub(id, (s) => {
          s.disputes[f.key] = { reason, at: now(), ruleId: f.ruleId, quote: f.quote };
          log(s, CREATOR, "Disputed finding", `${f.ruleId} "${f.quote}": ${reason}`);
        });
      },
      undoDispute(id: string, key: string) {
        updateSub(id, (s) => {
          const d = s.disputes[key];
          delete s.disputes[key];
          if (d) log(s, CREATOR, "Withdrew dispute", `${d.ruleId} "${d.quote}"`);
        });
      },
      submit(id: string, note: string) {
        updateSub(id, (s, st) => {
          const r = recheck(s, st.library);
          const resub = s.status === "changes_requested";
          s.versions.push({ n: s.versions.length + 1, content: s.content, at: now(), issues: r.findings.length, note: resub ? "Resubmitted after changes" : "Submitted for review" });
          s.status = "in_review";
          if (note.trim()) s.comments.push({ by: CREATOR, role: "Creator", text: note.trim(), at: now() });
          log(s, CREATOR, resub ? "Resubmitted for review" : "Submitted for review", `${r.findings.length} open issues, ${Object.keys(s.disputes).length} disputed`);
        });
      },
      decide(id: string, decision: "approved" | "changes_requested", comment: string, override: boolean) {
        updateSub(id, (s) => {
          s.status = decision;
          if (comment.trim()) s.comments.push({ by: REVIEWER, role: "Brand manager", text: comment.trim(), at: now() });
          log(
            s,
            REVIEWER,
            decision === "approved" ? (override ? "Approved with override" : "Approved") : "Requested changes",
            comment.trim() || undefined,
          );
        });
      },
      comment(id: string, by: string, role: string, text: string) {
        updateSub(id, (s) => {
          s.comments.push({ by, role, text, at: now() });
        });
      },
      deleteDraft(id: string) {
        setState((prev) => ({ ...prev, submissions: prev.submissions.filter((s) => s.id !== id) }));
      },
      updateLibrary(fn: (lib: BrandLibrary) => void, action: string, detail?: string) {
        setState((prev) => {
          const next = structuredClone(prev);
          fn(next.library);
          next.libraryAudit.unshift({ at: now(), actor: REVIEWER, action, detail });
          return next;
        });
      },
      reset() {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        setState(makeInitialState());
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
}

type Store = ReturnType<typeof useAppStore>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

/** Open high-severity findings that are neither fixed nor disputed. */
export function blockers(s: Submission) {
  return (s.result?.findings ?? []).filter((f) => f.severity === "high" && !s.disputes[f.key]);
}
