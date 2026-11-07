/**
 * Turns plain-language brand guidelines into draft rules.
 * Nothing is added to the library until a brand manager approves it.
 */
import type { Fact, TermRule } from "./types";

export type Proposal =
  | { kind: "term"; source: string; rule: Omit<TermRule, "id"> }
  | { kind: "fact"; source: string; fact: Omit<Fact, "id"> };

const clean = (s: string) => s.trim().replace(/^["“'‘]+|["”'’]+$/g, "").trim();
const Q = `["“'‘]?`;
const EQ = `["”'’]?`;

export function parseGuide(text: string): Proposal[] {
  const out: Proposal[] = [];
  const lines = text.split(/\n|(?<=[.;])\s+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    let m: RegExpMatchArray | null;

    m = line.match(new RegExp(`^(?:please\\s+)?(?:always\\s+)?use\\s+${Q}(.+?)${EQ}\\s+(?:instead of|rather than|not)\\s+${Q}(.+?)${EQ}\\s*[.;]?$`, "i"));
    if (m) {
      out.push({
        kind: "term",
        source: line,
        rule: { kind: "preferred", find: [clean(m[2])], replaceWith: clean(m[1]), reason: `Brand guide: "${line}"`, severity: "low", enabled: true },
      });
      continue;
    }

    m = line.match(new RegExp(`^(?:never|don't|do not)\\s+(?:say|use|write)\\s+${Q}(.+?)${EQ}\\s*[.;]?$`, "i")) ??
      line.match(new RegExp(`^avoid\\s+(?:the word\\s+|saying\\s+)?${Q}(.+?)${EQ}\\s*[.;]?$`, "i"));
    if (m) {
      out.push({
        kind: "term",
        source: line,
        rule: { kind: "banned", find: [clean(m[1])], replaceWith: "", reason: `Brand guide: "${line}"`, severity: "medium", enabled: true },
      });
      continue;
    }

    m = line.match(/^(?:our\s+)?(.+?)\s+(?:is priced at|is priced|costs|is available at|sells for)\s+(₹|Rs\.?\s?)(\d[\d,]*)/i);
    if (m) {
      const subject = clean(m[1]);
      const keywords = Array.from(new Set([...subject.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2), "price", "priced", "costs"]));
      out.push({
        kind: "fact",
        source: line,
        fact: {
          statement: `${subject} is priced at ₹${m[3]}.`,
          keywords,
          value: parseFloat(m[3].replace(/,/g, "")),
          unit: "₹",
          owner: "Pricing team",
          source: "Imported brand guide",
          expires: "",
        },
      });
    }
  }
  return out;
}
