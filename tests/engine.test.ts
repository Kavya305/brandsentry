import { runCheck, applyFix } from "../src/lib/engine";
import { seedLibrary, SAMPLE_DRAFT } from "../src/lib/seed";

let failures = 0;
const expect = (name: string, cond: boolean) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

const today = "2026-11-08";
const r = runCheck(SAMPLE_DRAFT, seedLibrary, undefined, today);
for (const f of r.findings) console.log(`  [${f.severity}] ${f.category} ${f.ruleId} "${f.quote}" -> ${f.replacement ?? "(human rewrite)"}`);
for (const v of r.verified) console.log(`  [ok] ${v.factId} "${v.quote}"`);

const has = (ruleId: string, quote: string) => r.findings.some((f) => f.ruleId === ruleId && f.quote.toLowerCase() === quote.toLowerCase());
expect("all caps flagged", has("S-02", "DIWALI SALE IS HERE"));
expect("exclamations flagged", has("S-01", "!!!"));
expect("product name casing", has("T-03", "Glowlab serum"));
expect("superlative flagged", r.findings.some((f) => f.quote.toLowerCase().includes("best")));
expect("guaranteed flagged", has("C-02", "guaranteed to"));
expect("cure flagged", has("C-01", "cure"));
expect("7 days unsupported", has("F-none", "7 days"));
expect("expired sale caught", has("F-03", "20%"));
expect("wrong price caught", r.findings.some((f) => f.ruleId === "F-01" && f.replacement === "₹899"));
expect("cheap banned", has("T-01", "cheap"));
expect("hype flagged", has("S-03", "can't say no"));
expect("chemical-free banned (longest variant)", has("T-04", "100% chemical-free"));
expect("1 lakh vs 50,000", r.findings.some((f) => f.ruleId === "F-05" && f.replacement === "50,000"));
expect("users -> customers", has("T-06", "users"));
expect("flawless banned", has("T-05", "flawless"));
expect("click here flagged", has("A-02", "Click here"));
expect("e-mail style", has("T-02", "e-mail"));
expect("dermatologically tested verified", r.verified.some((v) => v.factId === "F-04"));
expect("no false 100% claim", !r.findings.some((f) => f.quote === "100%"));

// Accept every auto-fix, then re-check: fixed items must be gone.
let text = SAMPLE_DRAFT;
for (let i = 0; i < 40; i++) {
  const fix = runCheck(text, seedLibrary, undefined, today).findings.find((f) => f.replacement !== undefined);
  if (!fix) break;
  const next = applyFix(text, fix);
  if (next === null || next === text) break;
  text = next;
}
console.log("\nAfter accepting all fixes:\n" + text);
const after = runCheck(text, seedLibrary, undefined, today);
console.log("Remaining:", after.findings.map((f) => `${f.ruleId} "${f.quote}"`).join(", "));
expect("only human-rewrite items remain", after.findings.every((f) => f.replacement === undefined));

// Clean copy should pass.
const clean = runCheck("GlowLab Serum is priced at ₹899 and is dermatologically tested. Join over 50,000 customers. Visit verdaskin.in to shop.", seedLibrary, undefined, today);
expect("clean copy has no issues", clean.findings.length === 0);
expect("clean copy verifies 3 facts", clean.verified.length === 3);

console.log(failures ? `\n${failures} FAILED` : "\nAll engine tests passed");
process.exit(failures ? 1 : 0);
