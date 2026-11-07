/**
 * BrandSentry review engine.
 *
 * Every finding must point to a rule or approved fact in the Brand Library
 * (its ruleId). Nothing is flagged without a citation, and nothing is fixed
 * without a human accepting it.
 *
 * Pipeline: 1) terminology rules  2) claim and fact checks  3) tone and
 * accessibility rules  4) image checks (run separately on image uploads).
 */
import type {
  BrandLibrary,
  CheckResult,
  Fact,
  Finding,
  ImageAttachment,
  Severity,
  VerifiedClaim,
} from "./types";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Word boundaries that also respect hyphens, so "e-mail" and "chemical-free" match cleanly.
const L = "(?<![\\w-])";
const R = "(?![\\w-])";

export const findingKey = (ruleId: string, quote: string) => `${ruleId}|${quote.toLowerCase().trim()}`;

function matchCase(original: string, replacement: string, keepCase = false): string {
  if (keepCase || !replacement) return replacement;
  if (/^[A-Z]/.test(original) && /^[a-z]/.test(replacement)) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

interface Sentence {
  text: string;
  start: number;
}

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const lead = m[0].length - m[0].trimStart().length;
    const t = m[0].trim();
    if (t) out.push({ text: t, start: m.index + lead });
  }
  return out;
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

/* ---------------------------------------------------------------- 1. Terms */

function checkTerms(text: string, lib: BrandLibrary): Finding[] {
  const out: Finding[] = [];
  for (const rule of lib.terms) {
    if (!rule.enabled) continue;
    const covered: [number, number][] = [];
    const variants = [...rule.find].filter(Boolean).sort((a, b) => b.length - a.length);
    for (const v of variants) {
      const re = new RegExp(L + esc(v) + R, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const span: [number, number] = [m.index, m.index + m[0].length];
        if (covered.some((c) => overlaps(c, span))) continue;
        // Product names: only flag when the spelling is not exactly right.
        if (rule.kind === "product-name" && m[0] === rule.replaceWith) continue;
        covered.push(span);
        const mapped = rule.replaceMap?.[m[0].toLowerCase()] ?? rule.replaceWith;
        const isClaimRule = rule.id.startsWith("C-");
        out.push({
          key: findingKey(rule.id, m[0]),
          category: isClaimRule ? "Claim" : "Terminology",
          severity: rule.severity,
          ruleId: rule.id,
          ruleText: rule.reason,
          quote: m[0],
          start: span[0],
          end: span[1],
          message:
            rule.kind === "product-name"
              ? `Product name written as "${m[0]}". The registered name is "${rule.replaceWith}".`
              : rule.kind === "preferred"
                ? `"${m[0]}" is not our house style. Use "${mapped}".`
                : isClaimRule
                  ? `"${m[0]}" makes a claim we are not allowed to make.`
                  : `"${m[0]}" is on the banned terms list.`,
          replacement: mapped ? matchCase(m[0], mapped, rule.kind === "product-name") : undefined,
          owner: isClaimRule ? "Legal & Compliance" : undefined,
          where: "text",
        });
      }
    }
  }
  return out;
}

/* --------------------------------------------------------------- 2. Claims */

interface NumberMention {
  text: string;
  start: number;
  end: number;
  value: number;
  unit: "₹" | "%" | "count" | "days";
}

function parseNum(s: string) {
  return parseFloat(s.replace(/,/g, ""));
}

export function findNumbers(text: string): NumberMention[] {
  const out: NumberMention[] = [];
  const taken: [number, number][] = [];
  const push = (m: RegExpExecArray, value: number, unit: NumberMention["unit"], text0 = m[0]) => {
    const span: [number, number] = [m.index, m.index + text0.length];
    if (taken.some((t) => overlaps(t, span))) return;
    taken.push(span);
    out.push({ text: text0, start: span[0], end: span[1], value, unit });
  };
  let m: RegExpExecArray | null;
  const rupee = /(?:₹|Rs\.?|INR)\s?(\d+(?:,\d{2,3})*(?:\.\d+)?)/gi;
  while ((m = rupee.exec(text))) push(m, parseNum(m[1]), "₹");
  const pct = /(\d+(?:\.\d+)?)\s?%/g;
  while ((m = pct.exec(text))) push(m, parseNum(m[1]), "%");
  const big = /(\d+(?:,\d{2,3})*(?:\.\d+)?)\s?(lakh|lakhs|crore|crores|k)(?![\w])/gi;
  while ((m = big.exec(text))) {
    const mult = /crore/i.test(m[2]) ? 1e7 : /lakh/i.test(m[2]) ? 1e5 : 1e3;
    push(m, parseNum(m[1]) * mult, "count");
  }
  const days = /(\d+)\s?(days?|weeks?|hours?|nights?)(?![\w])/gi;
  while ((m = days.exec(text))) {
    const n = parseNum(m[1]);
    const v = /week/i.test(m[2]) ? n * 7 : /hour/i.test(m[2]) ? n / 24 : n;
    push(m, v, "days");
  }
  const count = /(\d{1,3}(?:,\d{2,3})+|\d{4,})\+?/g;
  while ((m = count.exec(text))) push(m, parseNum(m[1]), "count");
  return out.sort((a, b) => a.start - b.start);
}

const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z₹]+/g) ?? []);

function isExpired(f: Fact, today: string) {
  return !!f.expires && f.expires < today;
}

export function formatValue(f: Fact): string {
  if (f.value === undefined) return "";
  if (f.unit === "₹") return `₹${f.value.toLocaleString("en-IN")}`;
  if (f.unit === "%") return `${f.value}%`;
  if (f.unit === "days") return `${f.value} days`;
  return f.value.toLocaleString("en-IN");
}

function prettyDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ownerFor(sentence: string, unit?: string): string {
  if (/acne|pimple|eczema|wrinkle|scar|clinically|dermat|heal|cure|skin condition|rash/i.test(sentence)) return "Legal & Compliance";
  if (unit === "₹") return "Pricing team";
  return "Marketing lead";
}

const SUPERLATIVES =
  /(?<![\w-])(the\s+)?(best|#1|no\.?\s?1|number one|leading|top-rated|most effective|fastest|unbeatable|world-class|clinically proven)(?![\w-])/gi;

function checkClaims(text: string, lib: BrandLibrary, today: string, skip: [number, number][] = []) {
  const findings: Finding[] = [];
  const verified: VerifiedClaim[] = [];
  const sentences = splitSentences(text);
  const sentenceAt = (pos: number) => sentences.find((s) => pos >= s.start && pos < s.start + s.text.length)?.text ?? "";

  // a) Numbers: prices, percentages, counts, timelines.
  for (const n of findNumbers(text)) {
    // Already covered by a terminology rule (e.g. "100% chemical-free").
    if (skip.some((s) => overlaps(s, [n.start, n.end]))) continue;
    const sentence = sentenceAt(n.start);
    const words = tokens(sentence);
    let best: Fact | undefined;
    let bestScore = 0;
    for (const f of lib.facts) {
      if (f.value === undefined || f.unit !== n.unit) continue;
      const score = f.keywords.filter((k) => words.has(k.toLowerCase())).length;
      if (score > bestScore) {
        best = f;
        bestScore = score;
      }
    }
    if (best && bestScore >= 1) {
      if (isExpired(best, today)) {
        findings.push({
          key: findingKey(best.id, n.text),
          category: "Outdated fact",
          severity: "high",
          ruleId: best.id,
          ruleText: `${best.statement} (expired ${prettyDate(best.expires)})`,
          quote: n.text,
          start: n.start,
          end: n.end,
          message: `This matches approved fact ${best.id}, but that fact expired on ${prettyDate(best.expires)}. Check it is still true before publishing.`,
          owner: best.owner,
          where: "text",
        });
      } else if (Math.abs(best.value! - n.value) > 1e-9) {
        findings.push({
          key: findingKey(best.id, n.text),
          category: "Wrong fact",
          severity: "high",
          ruleId: best.id,
          ruleText: best.statement,
          quote: n.text,
          start: n.start,
          end: n.end,
          message: `"${n.text}" does not match the approved figure. ${best.id} says: ${best.statement}`,
          replacement: formatValue(best),
          owner: best.owner,
          where: "text",
        });
      } else {
        verified.push({ quote: n.text, factId: best.id, statement: best.statement });
      }
    } else {
      findings.push({
        key: findingKey("F-none", n.text),
        category: "Claim",
        severity: "medium",
        ruleId: "F-none",
        ruleText: "Every number we publish must come from an approved fact.",
        quote: n.text,
        start: n.start,
        end: n.end,
        message: `"${n.text}" is not backed by any approved fact. Remove it, or ask the owner to add it to the Brand Library.`,
        owner: ownerFor(sentence, n.unit),
        where: "text",
      });
    }
  }

  // b) Approved phrases, e.g. "dermatologically tested".
  for (const f of lib.facts) {
    if (!f.phrase) continue;
    const re = new RegExp(L + esc(f.phrase) + R, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isExpired(f, today)) {
        findings.push({
          key: findingKey(f.id, m[0]),
          category: "Outdated fact",
          severity: "high",
          ruleId: f.id,
          ruleText: `${f.statement} (expired ${prettyDate(f.expires)})`,
          quote: m[0],
          start: m.index,
          end: m.index + m[0].length,
          message: `Approved claim ${f.id} expired on ${prettyDate(f.expires)}. Re-confirm it before publishing.`,
          owner: f.owner,
          where: "text",
        });
      } else {
        verified.push({ quote: m[0], factId: f.id, statement: f.statement });
      }
    }
  }

  // c) Superlatives with no approved source.
  let m: RegExpExecArray | null;
  while ((m = SUPERLATIVES.exec(text))) {
    const word = m[2].toLowerCase();
    const approved = lib.facts.some((f) => f.phrase && f.phrase.toLowerCase().includes(word));
    if (approved) continue;
    const proven = /clinically proven/i.test(m[0]);
    findings.push({
      key: findingKey("F-none", m[0]),
      category: "Claim",
      severity: proven ? "high" : "medium",
      ruleId: "F-none",
      ruleText: "Superlatives and proof claims need an approved source (award, study or survey).",
      quote: m[0],
      start: m.index,
      end: m.index + m[0].length,
      message: `"${m[0].trim()}" is a superlative claim with no approved source in the Brand Library.`,
      replacement: proven ? undefined : m[1] ? "a much-loved" : "much-loved",
      owner: ownerFor(sentenceAt(m.index)),
      where: "text",
    });
  }

  return { findings, verified };
}

/* ---------------------------------------------------- 3. Tone + accessibility */

const ACRONYMS = new Set(["SPF", "UV", "MRP", "FAQ", "DIY", "USA", "UK", "AM", "PM", "OK", "INR", "GST", "PA"]);

function checkStyles(text: string, lib: BrandLibrary): Finding[] {
  const out: Finding[] = [];
  for (const rule of lib.styles) {
    if (!rule.enabled) continue;
    const base = (quote: string, start: number, message: string, replacement?: string): Finding => ({
      key: findingKey(rule.id, quote),
      category: rule.category,
      severity: rule.severity,
      ruleId: rule.id,
      ruleText: rule.text,
      quote,
      start,
      end: start + quote.length,
      message,
      replacement,
      where: "text",
    });

    if (rule.check === "max_exclamations") {
      const max = rule.param ?? 1;
      const runs = [...text.matchAll(/!+/g)];
      const total = runs.reduce((a, r) => a + r[0].length, 0);
      if (total > max) {
        let allowed = max;
        for (const r of runs) {
          if (allowed > 0) {
            allowed -= 1;
            if (r[0].length > 1) out.push(base(r[0], r.index!, `"${r[0]}" is more than our calm voice allows (max ${max} in a piece).`, "!"));
          } else {
            out.push(base(r[0], r.index!, `Too many exclamation marks: this piece has ${total}, the limit is ${max}.`, "."));
          }
        }
      }
    }

    if (rule.check === "no_all_caps") {
      for (const r of text.matchAll(/\b[A-Z][A-Z0-9]+(?:\s+[A-Z][A-Z0-9]*)*\b/g)) {
        const words = r[0].split(/\s+/);
        if (!words.some((w) => w.length >= 4 && !ACRONYMS.has(w))) continue;
        const fixed = r[0].toLowerCase().replace(/^./, (c) => c.toUpperCase());
        out.push(base(r[0], r.index!, `"${r[0]}" is written in capitals, which reads as shouting.`, fixed));
      }
    }

    if (rule.check === "hype_words" || rule.check === "vague_link_text") {
      for (const w of rule.words ?? []) {
        for (const r of text.matchAll(new RegExp(L + esc(w) + R, "gi"))) {
          out.push(
            base(
              r[0],
              r.index!,
              rule.check === "hype_words"
                ? `"${r[0]}" is pressure or hype language. Rephrase with a fact instead.`
                : `"${r[0]}" doesn't tell people (or screen readers) where the link goes.`,
              rule.replaceWith ? matchCase(r[0], rule.replaceWith) : undefined,
            ),
          );
        }
      }
    }

    if (rule.check === "max_sentence_words") {
      const max = rule.param ?? 30;
      for (const s of splitSentences(text)) {
        const n = s.text.split(/\s+/).filter(Boolean).length;
        if (n > max) out.push(base(s.text, s.start, `This sentence has ${n} words (limit ${max}). Split it so it is easier to read.`));
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------ 4. Image */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a: string, b: string) {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function nearestPalette(hex: string, lib: BrandLibrary) {
  const [r, g, b] = hexToRgb(hex);
  let best = lib.visual.palette[0];
  let bestD = Infinity;
  for (const p of lib.visual.palette) {
    const [pr, pg, pb] = hexToRgb(p.hex);
    const d = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { name: best.name, hex: best.hex, distance: bestD };
}

export function checkImage(img: ImageAttachment | undefined, lib: BrandLibrary): Finding[] {
  if (!img) return [];
  const v = lib.visual;
  const out: Finding[] = [];
  const mk = (ruleId: string, category: Finding["category"], severity: Severity, quote: string, message: string, ruleText: string): Finding => ({
    key: findingKey(ruleId, quote),
    category,
    severity,
    ruleId,
    ruleText,
    quote,
    start: -1,
    end: -1,
    message,
    where: "image",
  });
  if (v.requireAltText) {
    const words = img.alt.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) {
      out.push(mk("A-03", "Accessibility", "high", "missing alt text", "This image has no alt text, so screen-reader users won't know what it shows.", "Every image must have alt text that describes it."));
    } else if (words < 4) {
      out.push(mk("A-03", "Accessibility", "low", "short alt text", `Alt text "${img.alt.trim()}" is very short. Describe what the image shows.`, "Every image must have alt text that describes it."));
    }
  }
  const a = img.analysis;
  if (a) {
    const off = a.colors.filter((c) => c.share >= 0.12 && c.distance > v.tolerance);
    for (const c of off) {
      out.push(
        mk(
          v.id,
          "Visual",
          c.share >= 0.3 ? "high" : "medium",
          `colour ${c.hex}`,
          `${Math.round(c.share * 100)}% of the image is ${c.hex}, which is not in the brand palette. Closest brand colour: ${c.nearest} (${c.nearestHex}).`,
          `Use brand palette colours only: ${v.palette.map((p) => `${p.name} ${p.hex}`).join(", ")}.`,
        ),
      );
    }
    if (a.contrast < v.minContrast) {
      out.push(
        mk(
          "A-04",
          "Accessibility",
          "medium",
          `contrast ${a.contrast.toFixed(1)}:1`,
          `The image's main colours have a contrast of only ${a.contrast.toFixed(1)}:1, so text on it may be hard to read (minimum ${v.minContrast}:1).`,
          `Main colours in an image need at least ${v.minContrast}:1 contrast so overlaid text stays readable.`,
        ),
      );
    }
  }
  return out;
}

/* ---------------------------------------------------------------- Runner */

export function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function runCheck(text: string, lib: BrandLibrary, image?: ImageAttachment, today = todayISO()): CheckResult {
  const terms = checkTerms(text, lib);
  const claims = checkClaims(text, lib, today, terms.map((f) => [f.start, f.end] as [number, number]));
  const all = [...terms, ...claims.findings, ...checkStyles(text, lib)];
  // Drop exact duplicates (same rule, same span).
  const seen = new Set<string>();
  const findings = all
    .filter((f) => {
      const k = `${f.ruleId}:${f.start}:${f.end}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.start - b.start);
  return {
    findings: [...findings, ...checkImage(image, lib)],
    verified: claims.verified,
    checkedAt: new Date().toISOString(),
    text,
  };
}

/** Apply one accepted fix to the text. Returns the new text, or null if the quote moved. */
export function applyFix(text: string, f: Finding): string | null {
  if (f.where !== "text" || f.replacement === undefined) return null;
  if (text.slice(f.start, f.end) === f.quote) {
    return text.slice(0, f.start) + f.replacement + text.slice(f.end);
  }
  const i = text.indexOf(f.quote);
  if (i < 0) return null;
  return text.slice(0, i) + f.replacement + text.slice(i + f.quote.length);
}
