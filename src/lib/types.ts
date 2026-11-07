export type Severity = "high" | "medium" | "low";

export type Category =
  | "Terminology"
  | "Claim"
  | "Outdated fact"
  | "Wrong fact"
  | "Tone"
  | "Accessibility"
  | "Visual";

/** A word or phrase rule from the brand's terminology list. */
export interface TermRule {
  id: string;
  kind: "banned" | "preferred" | "product-name";
  /** Variants to look for (case-insensitive). */
  find: string[];
  /** What to write instead. Empty = remove or rephrase. */
  replaceWith: string;
  /** Optional per-variant replacement, e.g. { cures: "helps calm" }. */
  replaceMap?: Record<string, string>;
  reason: string;
  severity: Severity;
  enabled: boolean;
}

/** An approved fact or claim the brand is allowed to make. */
export interface Fact {
  id: string;
  statement: string;
  /** Words that tell us a sentence is talking about this fact. */
  keywords: string[];
  /** Optional exact phrase this fact approves, e.g. "dermatologically tested". */
  phrase?: string;
  /** Optional number the fact pins down, with its unit. */
  value?: number;
  unit?: "₹" | "%" | "count" | "days";
  owner: string;
  source: string;
  /** ISO date (YYYY-MM-DD). Empty = never expires. */
  expires: string;
}

export type StyleCheck =
  | "max_exclamations"
  | "no_all_caps"
  | "max_sentence_words"
  | "vague_link_text"
  | "hype_words";

export interface StyleRule {
  id: string;
  check: StyleCheck;
  text: string;
  category: "Tone" | "Accessibility";
  param?: number;
  words?: string[];
  replaceWith?: string;
  severity: Severity;
  enabled: boolean;
}

export interface PaletteColor {
  name: string;
  hex: string;
}

export interface VisualRules {
  id: string;
  palette: PaletteColor[];
  /** Minimum contrast ratio between the main colours of an image. */
  minContrast: number;
  /** How far (0-441 RGB distance) a colour can be from the palette. */
  tolerance: number;
  requireAltText: boolean;
}

export interface BrandLibrary {
  brandName: string;
  voice: string;
  terms: TermRule[];
  facts: Fact[];
  styles: StyleRule[];
  visual: VisualRules;
}

export interface Finding {
  /** Stable key: rule id + quote, so disputes survive re-checks. */
  key: string;
  category: Category;
  severity: Severity;
  ruleId: string;
  ruleText: string;
  quote: string;
  start: number;
  end: number;
  message: string;
  /** Suggested replacement for `quote`. Undefined = needs a human rewrite. */
  replacement?: string;
  /** Who must sign this off if it is not fixed. */
  owner?: string;
  /** Where the finding was found. */
  where: "text" | "image";
}

export interface VerifiedClaim {
  quote: string;
  factId: string;
  statement: string;
}

export interface CheckResult {
  findings: Finding[];
  verified: VerifiedClaim[];
  checkedAt: string;
  /** The exact text that was checked, so the UI knows when results are stale. */
  text: string;
}

export interface ImageAnalysis {
  colors: { hex: string; share: number; nearest: string; nearestHex: string; distance: number }[];
  contrast: number;
}

export interface ImageAttachment {
  name: string;
  dataUrl: string;
  alt: string;
  analysis?: ImageAnalysis;
}

export type Status = "draft" | "in_review" | "changes_requested" | "approved";

export interface Dispute {
  reason: string;
  at: string;
  ruleId: string;
  quote: string;
}

export interface Version {
  n: number;
  content: string;
  at: string;
  issues: number;
  note: string;
}

export interface Comment {
  by: string;
  role: string;
  text: string;
  at: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface Submission {
  id: string;
  title: string;
  channel: string;
  author: string;
  content: string;
  image?: ImageAttachment;
  result?: CheckResult;
  disputes: Record<string, Dispute>;
  /** Fixes the creator accepted, kept for insights. */
  fixesAccepted: { ruleId: string; category: Category; at: string }[];
  /** Every finding ever raised, kept for insights. */
  issueLog: { key?: string; ruleId: string; category: Category; at: string }[];
  status: Status;
  versions: Version[];
  comments: Comment[];
  audit: AuditEntry[];
  createdAt: string;
  updatedAt: string;
  sample?: boolean;
}

export interface AppState {
  library: BrandLibrary;
  submissions: Submission[];
  libraryAudit: AuditEntry[];
}
