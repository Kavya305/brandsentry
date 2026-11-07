import { useEffect, useState } from "react";
import { CreatorView } from "./components/CreatorView";
import { InsightsView } from "./components/InsightsView";
import { LibraryView } from "./components/LibraryView";
import { ReviewView } from "./components/ReviewView";
import { Button } from "./components/ui";
import { useStore } from "./lib/store";

type Tab = "create" | "review" | "library" | "insights";

const TABS: { id: Tab; label: string; role: string }[] = [
  { id: "create", label: "Create & check", role: "Creator" },
  { id: "review", label: "Review queue", role: "Brand manager" },
  { id: "library", label: "Brand library", role: "Brand manager" },
  { id: "insights", label: "Insights", role: "Leadership" },
];

const GUIDE_KEY = "brandsentry:guide-hidden";

export default function App() {
  const { state, reset } = useStore();
  const [tab, setTab] = useState<Tab>("create");
  const [createSel, setCreateSel] = useState<string | null>(null);
  const [reviewSel, setReviewSel] = useState<string | null>(null);
  const [guide, setGuide] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const inReview = state.submissions.filter((s) => s.status === "in_review").length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const hideGuide = () => {
    setGuide(false);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
              <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
                <path d="M9 17l5 5 9-11" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="font-semibold leading-tight">BrandSentry</div>
              <div className="text-[11px] leading-tight text-slate-500">Check content before it goes live</div>
            </div>
          </div>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.id ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {t.label}
                {t.id === "review" && inReview > 0 && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{inReview}</span>}
                <span className="ml-1.5 hidden text-[11px] font-normal text-slate-400 lg:inline">{t.role}</span>
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">Demo brand: <b className="text-slate-700">{state.library.brandName}</b></span>
            {!guide && (
              <Button size="sm" variant="ghost" onClick={() => setGuide(true)}>
                How to try it
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (confirm("Reset all demo data? Your drafts and library changes will be cleared.")) {
                  reset();
                  setCreateSel(null);
                  setReviewSel(null);
                }
              }}
            >
              Reset demo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {guide && (
          <div className="mb-5 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Try the full workflow in 2 minutes</div>
                <p className="text-sm text-slate-600">No sign-in. You play every role. Data stays in your browser.</p>
              </div>
              <button className="text-sm text-slate-500 hover:text-slate-800" onClick={hideGuide} aria-label="Hide guide">
                Hide
              </button>
            </div>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Create & check", "Click “Try the sample draft”. It has 17 planted mistakes."],
                ["Read the findings", "Each issue cites the brand rule or approved fact (e.g. F-01) it breaks."],
                ["Fix or dispute", "Accept fixes, edit the text, or dispute a finding with a reason."],
                ["Submit", "High-severity issues must be fixed or disputed first."],
                ["Review queue", "As brand manager, approve or request changes. Then see Insights."],
              ].map(([t, d], i) => (
                <li key={t} className="rounded-lg bg-white/80 p-2.5 ring-1 ring-brand-100">
                  <div className="font-semibold text-brand-700">
                    {i + 1}. {t}
                  </div>
                  <div className="text-slate-600">{d}</div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === "create" && (
          <CreatorView
            selected={createSel}
            onSelect={setCreateSel}
            onGoReview={(id) => {
              setReviewSel(id);
              setTab("review");
            }}
          />
        )}
        {tab === "review" && (
          <ReviewView
            selected={reviewSel}
            onSelect={setReviewSel}
            onGoCreator={(id) => {
              setCreateSel(id);
              setTab("create");
            }}
          />
        )}
        {tab === "library" && <LibraryView />}
        {tab === "insights" && <InsightsView onEditRules={() => setTab("library")} />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-xs text-slate-400">
        BrandSentry · CodeNexus India 2026 · Round 2 build by Kavya Singal (team SheCodes). Rule-based checks run in your browser; no content leaves your device.
      </footer>
    </div>
  );
}
