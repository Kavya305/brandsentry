# BrandSentry

**Check brand content before it goes live.** BrandSentry reviews drafts against an organisation's own approved guidelines, terminology, facts and visual assets. It explains every issue with the exact rule it breaks, suggests a fix, and keeps a human in charge of the final decision.

Built for **CodeNexus India 2026** (We Code Coders × Inkloom AI), Round 2, by Kavya Singal (team SheCodes).

## Try it (no sign-in)

1. Open the app and click **Try the sample draft**. It has 17 planted mistakes.
2. Read the findings. Each one cites a rule or approved fact ID (for example `F-01`, `T-03`).
3. **Accept** fixes, edit the text, or **Dispute** a finding with a reason.
4. **Submit for review.** High-severity issues must be fixed or disputed first.
5. Open **Review queue** as the brand manager and **approve** or **request changes**.
6. See **Insights** for repeated mistakes and guideline clarity alerts.

The demo brand, "Verda Skin", is fictional. Data is stored in your browser only. **Reset demo** restores the starting state.

## Core workflow

```
Brand Library ──► Creator submits text / .docx / image ──► Review engine
     ▲                                                          │
     │                                              cited findings + fixes
 Insights ◄── Reviewer approves / requests changes ◄── Creator accepts, edits or disputes
```

## Features in this build

| Area | What works |
| --- | --- |
| Brand Library | Approved facts with owner, source and **expiry date**; terminology (banned, preferred, product names); medical and absolute claim rules; tone and accessibility rules with editable limits; brand palette and contrast rules; change log |
| Guideline import | Paste brand-guide text → draft rules and facts extracted → brand manager approves or rejects each one |
| Text review | Paste text or upload **.docx / .txt**. Checks terminology, product-name spelling, banned claims, superlatives, prices / percentages / counts / timelines against approved facts (understands "1 lakh"), **expired facts**, tone (shouting, exclamation marks, hype words), readability and vague link text |
| Image review | Upload an image or use the sample banner. Checks **off-palette colours**, **low contrast** and **missing alt text**, all in the browser |
| Explain and fix | Every finding shows the quote, the cited rule or fact, why it matters, severity, sign-off owner and a suggested replacement. Inline highlights in the draft. Accept one or all fixes |
| Human control | Disputes with reasons, submission gate on high-severity issues, reviewer approve / request changes, explicit **override** for open high-severity items, comments, version history, full audit trail |
| Claim routing | Unsupported or wrong claims are routed to the fact owner (Pricing team, Legal & Compliance, Marketing lead) |
| Insights | Issues by type, repeated mistakes, issues by author, expiring facts, human-oversight stats and **guideline clarity alerts** (rules disputed 2+ times) |

## How the engine works

`src/lib/engine.ts` runs four layers. Every finding must cite a rule or fact in the library, and nothing changes without a human accepting it.

1. **Terminology rules:** hyphen-aware word matching, longest variant first, case-preserving replacements.
2. **Claims and facts:** extracts numbers with units (₹, %, counts incl. lakh/crore, days/weeks) and matches each to the approved fact with the most keyword overlap. Then: expired → *Outdated fact*; different value → *Wrong fact* with the approved value as the fix; no match → *Unsupported claim* routed to an owner. Approved phrases (e.g. "dermatologically tested") are verified, and superlatives without a source are flagged.
3. **Tone and accessibility:** exclamation limit, ALL CAPS (acronyms allowed), hype words, sentence length, vague link text.
4. **Image:** colour clustering on a canvas, nearest-palette distance, WCAG contrast ratio between main colours, alt-text checks.

Run the engine tests with `npm test`.

## Tech stack

React 18 + TypeScript, Vite, Tailwind CSS, mammoth.js (.docx), browser Canvas API (image analysis), localStorage persistence. Hosted as a static site. All free and open source.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests
npm run build    # production build in dist/
```

## Disclosure

- Libraries: React, Vite, Tailwind CSS, mammoth.js. No templates or boilerplate beyond the Vite defaults.
- No external AI API is called at runtime; all checks are rule-based and run in the browser.
- AI assistance: Claude (Anthropic) was used as a coding assistant during the build window.
- All code was written during the official Round 2 build window.

## Known limitations

- Data lives in one browser (no shared accounts yet).
- Tone checks are rule-based; nuanced tone and messaging need an AI layer (planned).
- No PDF upload or logo detection yet.
